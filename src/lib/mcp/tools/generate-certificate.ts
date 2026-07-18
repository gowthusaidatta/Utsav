import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser, unauthenticated, forbidden, notFound, invalidInput,
  internalError, mapDbError, recordAudit, hasGlobalRole, ok, adminClient,
} from "../lib/supabase";
import {
  newCertificateCode, signCertificate, generateCertificatePdf,
} from "../lib/certificates";
import { signedDownloadUrl } from "../lib/media";

function publicVerifyUrl(code: string): string {
  const base = process.env.SITE_URL ?? process.env.PUBLIC_APP_URL ?? "https://utsav.app";
  return `${base.replace(/\/$/, "")}/verify/${encodeURIComponent(code)}`;
}

export default defineTool({
  name: "generate_certificate",
  title: "Generate certificate",
  description: "Issue a certificate to one user or a batch. Rendered as a signed PDF with a QR verification code; row stored under RLS. Requires event organizer, coordinator, faculty, or admin.",
  inputSchema: {
    event_id: z.string().uuid(),
    user_ids: z.array(z.string().uuid()).min(1).max(500),
    template_key: z.enum(["default", "participation", "winner"]).default("participation"),
    variables: z.record(z.string(), z.any()).optional().describe("Additional template variables (role, position, remarks)."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    // Authorization: admin/faculty/organizer/coordinator on the event
    const isAdmin = await hasGlobalRole(supabase, actor, "admin");
    const isFaculty = await hasGlobalRole(supabase, actor, "faculty");
    let canIssue = isAdmin || isFaculty;
    if (!canIssue) {
      const { data: org } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "organizer", _event: input.event_id });
      const { data: co } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "coordinator", _event: input.event_id });
      canIssue = Boolean(org || co);
    }
    if (!canIssue) return forbidden("You cannot issue certificates for this event.");

    const { data: event, error: evErr } = await supabase
      .from("events").select("id, title, start_at, end_at").eq("id", input.event_id).maybeSingle();
    if (evErr) return mapDbError(evErr);
    if (!event) return notFound("Event");

    // Load recipient names
    const { data: profiles, error: pErr } = await supabase
      .from("profiles").select("id, full_name, email").in("id", input.user_ids);
    if (pErr) return mapDbError(pErr);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    if (byId.size === 0) return invalidInput("No matching profiles for supplied user_ids.");

    const admin = await adminClient();
    const issued: unknown[] = [];
    const failed: { user_id: string; reason: string }[] = [];
    const eventDate = event.start_at
      ? new Date(event.start_at as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : undefined;

    for (const userId of input.user_ids) {
      const profile = byId.get(userId);
      if (!profile) { failed.push({ user_id: userId, reason: "profile not found" }); continue; }

      const code = newCertificateCode();
      const hash = signCertificate(code);
      const verifyUrl = publicVerifyUrl(code);

      let pdfBuf: Buffer;
      try {
        pdfBuf = await generateCertificatePdf({
          recipientName: profile.full_name || profile.email || "Utsav Participant",
          eventTitle: event.title as string,
          eventDate,
          role: (input.variables?.role as string | undefined) ?? undefined,
          code, verifyUrl,
          template: input.template_key,
        });
      } catch (e) {
        failed.push({ user_id: userId, reason: (e as Error).message }); continue;
      }

      const key = `${input.event_id}/${code}.pdf`;
      const up = await admin.storage.from("certificates").upload(key, pdfBuf, {
        contentType: "application/pdf", upsert: false,
      });
      if (up.error) { failed.push({ user_id: userId, reason: `upload: ${up.error.message}` }); continue; }

      const { data: row, error: insErr } = await supabase.from("certificates").insert({
        event_id: input.event_id,
        user_id: userId,
        code,
        verification_hash: hash,
        template_key: input.template_key,
        variables: input.variables ?? {},
        storage_path: key,
        issued_by: actor,
      }).select("*").single();

      if (insErr) {
        await admin.storage.from("certificates").remove([key]);
        failed.push({ user_id: userId, reason: insErr.message });
        continue;
      }

      const { url } = await signedDownloadUrl(admin, "certificates", key, 3600);
      issued.push({ ...row, download_url: url, verify_url: verifyUrl });
    }

    if (issued.length === 0 && failed.length > 0) {
      return internalError(`No certificates issued. First error: ${failed[0].reason}`);
    }

    await recordAudit(supabase, actor, "certificate.generate", "event", input.event_id, {
      issued: issued.length, failed: failed.length, template: input.template_key,
    });
    return ok({ issued_count: issued.length, failed_count: failed.length, certificates: issued, failed });
  },
});
