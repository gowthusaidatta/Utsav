import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "event_history",
  title: "Event history",
  description: "Full audit trail of a single event: creation, updates, status changes, registrations, check-ins.",
  inputSchema: { event_id: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("audit_logs").select("*")
      .or(`resource_id.eq.${input.event_id},metadata->>event_id.eq.${input.event_id}`)
      .order("created_at", { ascending: false }).limit(input.limit ?? 200);
    if (error) return mapDbError(error);
    return ok({ event_id: input.event_id, entries: data ?? [] });
  },
});
