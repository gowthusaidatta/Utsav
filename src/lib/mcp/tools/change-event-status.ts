import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../lib/supabase";

const STATUSES = [
  "draft",
  "pending_approval",
  "published",
  "cancelled",
  "completed",
  "archived",
] as const;

export default defineTool({
  name: "change_event_status",
  title: "Change event status",
  description:
    "Move an Utsav event through its lifecycle (draft → pending_approval → published, cancel, complete, archive). Server enforces role and transition rules.",
  inputSchema: {
    id: z.string().uuid(),
    to: z.enum(STATUSES),
    reason: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const { data: current, error: fErr } = await supabase
      .from("events")
      .select(
        "id, status, title, description, start_at, end_at, venue, is_online, meeting_url",
      )
      .eq("id", input.id)
      .maybeSingle();
    if (fErr) return { content: [{ type: "text", text: fErr.message }], isError: true };
    if (!current)
      return {
        content: [{ type: "text", text: "Event not found or not accessible." }],
        isError: true,
      };
    if (current.status === input.to)
      return {
        content: [{ type: "text", text: `Already ${input.to}.` }],
        structuredContent: { ok: true, unchanged: true },
      };

    if (input.to === "published") {
      const errs: string[] = [];
      if (!current.description || current.description.trim().length < 20)
        errs.push("description ≥ 20 chars");
      if (!current.start_at) errs.push("start_at");
      if (!current.end_at) errs.push("end_at");
      if (current.is_online) {
        if (!current.meeting_url) errs.push("meeting_url");
      } else if (!current.venue) errs.push("venue");
      if (errs.length)
        return {
          content: [
            { type: "text", text: `Cannot publish. Missing: ${errs.join(", ")}` },
          ],
          isError: true,
        };
    }

    const patch: Record<string, unknown> = { status: input.to };
    if (input.to === "published") patch.published_at = new Date().toISOString();

    const { error } = await supabase.from("events").update(patch).eq("id", input.id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    await supabase.from("audit_logs").insert({
      actor_user_id: ctx.getUserId(),
      action: `event.status.${input.to}`,
      resource_type: "events",
      resource_id: input.id,
      metadata: { from: current.status, to: input.to, reason: input.reason ?? null, via: "mcp" },
    });

    return {
      content: [{ type: "text", text: `Status changed to ${input.to}.` }],
      structuredContent: { ok: true, from: current.status, to: input.to },
    };
  },
});
