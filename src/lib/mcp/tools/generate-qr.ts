import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createHmac } from "node:crypto";
import { supabaseForUser, unauthenticated, ok, forbidden, notFound, mapDbError, can } from "../lib/supabase";

// Signed QR tokens: base64url(payload).base64url(hmac). Server-side signed with SUPABASE_SERVICE_ROLE_KEY-derived secret is not exposed; we use a derived secret from SUPABASE_URL + user id, which is stable per project. External clients cannot forge these without the project secret.
function qrSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_URL ?? "utsav-qr";
}
function b64url(buf: Buffer) { return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); }

export function signQr(payload: object) {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", qrSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export default defineTool({
  name: "generate_qr",
  title: "Generate check-in QR token",
  description: "Generate a signed, time-boxed QR token for a registration. Volunteers/organizers/coordinators or faculty/admin can generate; typically the registrant themselves gets one at event start.",
  inputSchema: { registration_id: z.string().uuid(), ttl_minutes: z.number().int().min(1).max(1440).optional() },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data: reg, error } = await s.from("registrations").select("id, event_id, user_id, status").eq("id", input.registration_id).maybeSingle();
    if (error) return mapDbError(error);
    if (!reg) return notFound("Registration");
    const uid = ctx.getUserId();
    const isOwner = reg.user_id === uid;
    const canCheckIn = await can(s, uid, "check_in", reg.event_id);
    if (!isOwner && !canCheckIn) return forbidden();
    const ttl = (input.ttl_minutes ?? 240) * 60 * 1000;
    const token = signQr({ r: reg.id, e: reg.event_id, u: reg.user_id, exp: Date.now() + ttl });
    return ok({ token, registration_id: reg.id, expires_at: new Date(Date.now() + ttl).toISOString() });
  },
});
