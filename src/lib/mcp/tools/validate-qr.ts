import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseForUser, unauthenticated, ok, invalidInput } from "../lib/supabase";

function qrSecret() { return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_URL ?? "utsav-qr"; }

export function verifyQr(token: string): { r: string; e: string; u: string; exp: number } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", qrSecret()).update(body).digest();
  const got = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (sig.length % 4)) % 4), "base64");
  if (got.length !== expected.length) return null;
  if (!timingSafeEqual(got, expected)) return null;
  try {
    const json = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (body.length % 4)) % 4), "base64").toString());
    if (typeof json.r !== "string" || typeof json.e !== "string" || typeof json.exp !== "number") return null;
    return json;
  } catch { return null; }
}

export default defineTool({
  name: "validate_qr",
  title: "Validate QR token",
  description: "Verify a QR token's signature and expiry WITHOUT recording a check-in.",
  inputSchema: { token: z.string().min(10).max(2000) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    void supabaseForUser;
    const decoded = verifyQr(input.token);
    if (!decoded) return invalidInput("Invalid QR token.");
    const expired = decoded.exp < Date.now();
    return ok({ valid: !expired, expired, registration_id: decoded.r, event_id: decoded.e, user_id: decoded.u, expires_at: new Date(decoded.exp).toISOString() });
  },
});
