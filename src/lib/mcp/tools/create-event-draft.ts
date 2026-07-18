import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../lib/supabase";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export default defineTool({
  name: "create_event_draft",
  title: "Create event draft",
  description:
    "Create a new Utsav event as a draft owned by the signed-in user. Use `change_event_status` to submit for approval or publish.",
  inputSchema: {
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(10000).optional(),
    category: z.string().trim().max(64).optional(),
    start_at: z.string().datetime().optional().describe("ISO 8601 start time."),
    end_at: z.string().datetime().optional().describe("ISO 8601 end time."),
    venue: z.string().trim().max(240).optional(),
    is_online: z.boolean().optional(),
    meeting_url: z.string().url().max(500).optional(),
    capacity: z.number().int().positive().max(1_000_000).optional(),
    is_paid: z.boolean().optional(),
    price: z.number().min(0).optional(),
    currency: z.string().trim().length(3).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    if (input.end_at && input.start_at && new Date(input.end_at) < new Date(input.start_at))
      return {
        content: [{ type: "text", text: "end_at must be after start_at" }],
        isError: true,
      };
    const supabase = supabaseForUser(ctx);
    const base = slugify(input.title) || "event";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!exists) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: input.title,
        slug,
        description: input.description ?? null,
        category: input.category ?? null,
        status: "draft",
        visibility: "public",
        start_at: input.start_at ?? null,
        end_at: input.end_at ?? null,
        venue: input.is_online ? null : (input.venue ?? null),
        is_online: input.is_online ?? false,
        meeting_url: input.is_online ? (input.meeting_url ?? null) : null,
        capacity: input.capacity ?? null,
        is_paid: input.is_paid ?? false,
        price: input.is_paid ? (input.price ?? 0) : 0,
        currency: input.currency ?? "INR",
        created_by: ctx.getUserId(),
      })
      .select("id, slug, status")
      .single();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: `Draft created: ${data.slug} (${data.id})`,
        },
      ],
      structuredContent: { event: data },
    };
  },
});
