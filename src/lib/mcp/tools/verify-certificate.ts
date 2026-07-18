import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, notFound, mapDbError, ok } from "../lib/supabase";
import { verifySignature } from "../lib/certificates";

export default defineTool({
  name: "verify_certificate",
  title: "Verify certificate",
  description: "Verify a certificate by its public code. Returns validity, recipient, event, and issue/revocation status. Any authenticated caller may verify.",
  inputSchema: {
    code: z.string().min(6).max(64).describe("The public certificate code, e.g. UTV-ABCD-EFGHIJ."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ code }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("certificates")
      .select("id, code, verification_hash, template_key, event_id, user_id, issued_at, revoked_at, revoked_reason")
      .eq("code", code)
      .maybeSingle();
    if (error) return mapDbError(error);
    if (!data) return notFound("Certificate");

    const signatureValid = verifySignature(data.code, data.verification_hash);
    const revoked = Boolean(data.revoked_at);

    // Best-effort enrichment
    const [{ data: event }, { data: profile }] = await Promise.all([
      supabase.from("events").select("id, title, slug, start_at").eq("id", data.event_id).maybeSingle(),
      supabase.from("profiles").select("id, full_name, email").eq("id", data.user_id).maybeSingle(),
    ]);

    return ok({
      valid: signatureValid && !revoked,
      signature_valid: signatureValid,
      revoked,
      revoked_reason: data.revoked_reason,
      code: data.code,
      template: data.template_key,
      issued_at: data.issued_at,
      event: event ?? null,
      recipient: profile ?? null,
    });
  },
});
