import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  scopes?: string[];
};

type OAuthClient = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function oauth(): OAuthClient {
  // The auth.oauth namespace is beta and not always in the SDK's public types.
  return (supabase.auth as unknown as { oauth: OAuthClient }).oauth;
}

function sameOriginPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Session lives in localStorage; the SSR pass has none.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id:
      typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="container mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Authorization error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Unknown error"}
        </CardContent>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target =
      sameOriginPath(data?.redirect_url) ??
      sameOriginPath(data?.redirect_to) ??
      data?.redirect_url ??
      data?.redirect_to ??
      null;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an external app";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/) : []);

  return (
    <main className="container mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Connect {clientName} to your Utsav account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            {clientName} will be able to call Utsav's enabled tools while you are
            signed in. It acts as you — event, registration, and role access
            still follows Utsav's permissions.
          </p>
          {scopes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {scopes.map((s: string) => (
                <li key={s}>
                  {s === "openid" || s === "profile"
                    ? "Share your basic profile"
                    : s === "email"
                      ? "Share your email address"
                      : `Additional permission requested: ${s}`}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button disabled={busy} onClick={() => decide(true)}>
              Approve
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => decide(false)}
            >
              Cancel connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
