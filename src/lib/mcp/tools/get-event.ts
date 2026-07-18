import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../lib/supabase";

export default defineTool({
  name: "get_event",
  title: "Get event",
  description: "Fetch a single Utsav event by id or slug. Access follows RLS.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Event id (UUID)."),
    slug: z.string().trim().min(1).max(160).optional().describe("Event slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    if (!input.id && !input.slug)
      return {
        content: [{ type: "text", text: "Provide id or slug." }],
        isError: true,
      };
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("events").select("*");
    if (input.id) q = q.eq("id", input.id);
    else q = q.eq("slug", input.slug!);
    const { data, error } = await q.maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: "Event not found or not accessible." }],
        isError: true,
      };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { event: data },
    };
  },
});
