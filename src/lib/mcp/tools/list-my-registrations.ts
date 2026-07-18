import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../lib/supabase";

export default defineTool({
  name: "list_my_registrations",
  title: "List my registrations",
  description:
    "List the signed-in user's event registrations, including team and status.",
  inputSchema: {
    status: z
      .enum(["pending", "confirmed", "waitlisted", "cancelled", "checked_in"])
      .optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("registrations")
      .select(
        "id, event_id, team_id, status, checked_in_at, created_at, events(id, title, slug, start_at, venue, is_online)",
      )
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 25);
    if (input.status) q = q.eq("status", input.status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { registrations: data ?? [] },
    };
  },
});
