import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "global_search",
  title: "Global search",
  description: "Search across events and organizations by keyword. Results are filtered by RLS to what the caller can see.",
  inputSchema: {
    query: z.string().trim().min(2).max(120),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const t = input.query.replace(/[%_]/g, (m) => `\\${m}`);
    const lim = input.limit ?? 15;
    const [ev, org] = await Promise.all([
      s.from("events").select("id, title, slug, status, category, start_at").or(`title.ilike.%${t}%,description.ilike.%${t}%`).limit(lim),
      s.from("organizations").select("id, name, slug, type").or(`name.ilike.%${t}%,slug.ilike.%${t}%`).limit(lim),
    ]);
    if (ev.error) return mapDbError(ev.error);
    if (org.error) return mapDbError(org.error);
    return ok({ query: input.query, events: ev.data ?? [], organizations: org.data ?? [] });
  },
});
