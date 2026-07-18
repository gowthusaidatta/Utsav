import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "node:crypto";

const verifyCertificateServer = createServerFn({ method: "GET" })
  .inputValidator((code: string) => code)
  .handler(async ({ data: code }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { found: false as const };

    // Server publishable client (anon) — certificates SELECT policy scopes to authenticated,
    // so we use the admin client for the read but ONLY expose non-sensitive fields.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("certificates")
      .select("id, code, verification_hash, template_key, event_id, user_id, issued_at, revoked_at, revoked_reason")
      .eq("code", code)
      .maybeSingle();
    if (!data) return { found: false as const };

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_URL ?? "utsav-cert";
    const expected = createHmac("sha256", secret).update(data.code).digest("hex");
    const signatureValid = expected === data.verification_hash;
    const revoked = Boolean(data.revoked_at);

    const [{ data: event }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("events").select("id, title, slug, start_at").eq("id", data.event_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle(),
    ]);

    return {
      found: true as const,
      valid: signatureValid && !revoked,
      revoked,
      revoked_reason: data.revoked_reason,
      code: data.code,
      template: data.template_key,
      issued_at: data.issued_at,
      event_title: event?.title ?? null,
      event_date: event?.start_at ?? null,
      recipient_name: profile?.full_name ?? null,
    };
  });

export const Route = createFileRoute("/verify/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify certificate ${params.code} — Utsav` },
      { name: "description", content: "Verify the authenticity of a Utsav certificate." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => verifyCertificateServer({ data: params.code }),
  component: VerifyPage,
});

function VerifyPage() {
  const result = Route.useLoaderData();
  const params = Route.useParams();

  if (!result.found) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-heading text-3xl font-bold text-foreground">Certificate not found</h1>
        <p className="mt-3 text-muted-foreground">
          No Utsav certificate matches the code <code className="font-mono">{params.code}</code>.
        </p>
      </main>
    );
  }

  const badge = result.valid
    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
    : "bg-destructive/10 text-destructive ring-1 ring-destructive/30";
  const label = result.valid ? "Valid certificate" : result.revoked ? "Revoked" : "Signature invalid";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${badge}`}>
        <span className="h-2 w-2 rounded-full bg-current" /> {label}
      </div>
      <h1 className="mt-4 font-heading text-3xl font-bold text-foreground">
        {result.recipient_name ?? "Certificate holder"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Issued for <span className="font-medium text-foreground">{result.event_title ?? "an Utsav event"}</span>
        {result.event_date && (
          <> on {new Date(result.event_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</>
        )}
      </p>
      <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card-elevated p-4">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Certificate code</dt>
          <dd className="mt-1 font-mono text-sm">{result.code}</dd>
        </div>
        <div className="card-elevated p-4">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Template</dt>
          <dd className="mt-1 capitalize">{result.template}</dd>
        </div>
        <div className="card-elevated p-4 sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Issued</dt>
          <dd className="mt-1">{new Date(result.issued_at).toLocaleString()}</dd>
        </div>
        {result.revoked && (
          <div className="card-elevated p-4 sm:col-span-2 border-destructive/50">
            <dt className="text-xs uppercase tracking-wide text-destructive">Revoked</dt>
            <dd className="mt-1 text-sm">{result.revoked_reason ?? "No reason provided."}</dd>
          </div>
        )}
      </dl>
      <p className="mt-8 text-xs text-muted-foreground">
        Verification uses HMAC-signed codes issued by Utsav. Do not trust certificates that fail verification here.
      </p>
    </main>
  );
}
