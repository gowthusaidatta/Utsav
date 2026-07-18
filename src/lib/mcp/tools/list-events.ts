import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../lib/supabase";

export default defineTool({
  name: "list_events",
  title: "List events",
  description:
    "List Utsav events visible to the signed-in user. Filter by status, category, or a text query on title/description.",
  inputSchema: {
    status: z
      .enum([
        "draft",
        "pending_approval",
        "published",
        "cancelled",
        "completed",
        "archived",
      ])
      .optional()
      .describe("Filter by event status."),
    category: z.string().trim().max(64).optional().describe("Filter by category."),
    query: z.string().trim().max(120).optional().describe("Text search on title/description."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 25)."),
    mine_only: z
      .boolean()
      .optional()
      .describe("Only events the caller created."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("events")
      .select(
        "id, title, slug, status, visibility, category, start_at, end_at, venue, is_online, is_paid, capacity, created_by, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 25);
    if (input.status) q = q.eq("status", input.status);
    if (input.category) q = q.eq("category", input.category);
    if (input.mine_only) q = q.eq("created_by", ctx.getUserId());
    if (input.query) {
      const term = input.query.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    const { data, error } = await q;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
