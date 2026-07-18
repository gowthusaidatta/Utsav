import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "registration_statistics",
  title: "Registration statistics",
  description: "Aggregate registration counts, either global (admin/faculty only, RLS-enforced) or for a specific event.",
  inputSchema: { event_id: z.string().uuid().optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    let q = s.from("registrations").select("status, payment_status, created_at");
    if (input.event_id) q = q.eq("event_id", input.event_id);
    const { data, error } = await q.limit(10000);
    if (error) return mapDbError(error);
    const byStatus: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    for (const r of data ?? []) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byPayment[r.payment_status] = (byPayment[r.payment_status] ?? 0) + 1;
    }
    return ok({ total: (data ?? []).length, by_status: byStatus, by_payment: byPayment });
  },
});
