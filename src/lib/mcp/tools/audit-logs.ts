import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "audit_logs",
  title: "Audit logs",
  description: "Read audit log entries. Callers see their own actions; admins see all.",
  inputSchema: {
    actor_user_id: z.string().uuid().optional(),
    resource_type: z.string().trim().max(64).optional(),
    resource_id: z.string().trim().max(64).optional(),
    action: z.string().trim().max(64).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    let q = s.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 100);
    if (input.actor_user_id) q = q.eq("actor_user_id", input.actor_user_id);
    if (input.resource_type) q = q.eq("resource_type", input.resource_type);
    if (input.resource_id) q = q.eq("resource_id", input.resource_id);
    if (input.action) q = q.eq("action", input.action);
    const { data, error } = await q;
    if (error) return mapDbError(error);
    return ok({ logs: data ?? [] });
  },
});
