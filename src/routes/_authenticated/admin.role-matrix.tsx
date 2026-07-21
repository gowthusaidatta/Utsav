import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyMyPermissions } from "@/lib/authz.functions";
import {
  APP_ROLES,
  ACTIONS,
  ACTION_LABELS,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  MATRIX,
  type Action,
} from "@/lib/rbac-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";


export const Route = createFileRoute("/_authenticated/admin/role-matrix")({
  head: () => ({ meta: [{ title: "Admin · Role Matrix — Utsav" }] }),
  component: RoleMatrixPage,
});

function RoleMatrixPage() {
  const verify = useServerFn(verifyMyPermissions);
  const live = useQuery({
    queryKey: ["role-matrix-verify"],
    queryFn: () => verify({ data: {} }),
  });

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role & permissions matrix</h1>
        <p className="text-sm text-muted-foreground">
          The source-of-truth mapping of Utsav's 16 roles to the actions the shared
          <code className="mx-1 rounded bg-muted px-1">public.can()</code>
          function authorizes. Every check below is enforced server-side by RLS and
          the RBAC helpers — this page renders the matrix and lets you verify your
          own permissions against the live database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live verification for your session</CardTitle>
        </CardHeader>
        <CardContent>
          {live.isLoading && <p className="text-sm">Checking…</p>}
          {live.error && (
            <p className="text-sm text-destructive">
              Failed: {(live.error as Error).message}
            </p>
          )}
          {live.data && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {live.data.roles.length === 0 && (
                  <Badge variant="outline">No roles assigned</Badge>
                )}
                {live.data.roles.map((r, i) => (
                  <Badge key={i} variant="secondary">
                    {r.role} · {r.scope}
                    {r.scope_id ? ` (${r.scope_id.slice(0, 8)}…)` : ""}
                  </Badge>
                ))}
                {live.data.delegations.length > 0 && (
                  <Badge variant="outline">
                    +{live.data.delegations.length} active delegation(s)
                  </Badge>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {ACTIONS.map((a) => {
                  const allowed = live.data.actions[a];
                  return (
                    <div
                      key={a}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{ACTION_LABELS[a]}</span>
                      {allowed ? (
                        <Check className="h-4 w-4 text-emerald-600" aria-label="allowed" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" aria-label="denied" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Event-scoped actions (score submissions, mentor teams, per-event
                check-in) are shown as denied here because no event id is supplied;
                open a specific event to see scoped permissions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full matrix (16 roles × {ACTIONS.length} actions)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Action</TableHead>
                {[...APP_ROLES, "guest"].map((r) => (
                  <TableHead key={r} className="whitespace-nowrap">
                    {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTIONS.map((a) => (
                <TableRow key={a}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {ACTION_LABELS[a as Action]}
                  </TableCell>
                  {[...APP_ROLES, "guest"].map((r) => {
                    const cell = MATRIX[r as keyof typeof MATRIX][a as Action];
                    return (
                      <TableCell key={r} className="text-center">
                        {cell === "G" ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="allowed globally" />
                        ) : cell === "E" ? (
                          <MapPin className="mx-auto h-4 w-4 text-amber-600" aria-label="event-scoped only" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-muted-foreground/60" aria-label="denied" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-600" /> Allowed globally
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-600" /> Event-scoped only
            </span>
            <span className="flex items-center gap-1">
              <X className="h-3 w-3" /> Denied
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role reference</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2">
            {[...APP_ROLES, "guest"].map((r) => (
              <div key={r} className="rounded-md border p-3">
                <dt className="font-medium">
                  {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                </dt>
                <dd className="text-sm text-muted-foreground">
                  {ROLE_DESCRIPTIONS[r as keyof typeof ROLE_DESCRIPTIONS]}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm">
            Assign roles in{" "}
            <Link to="/admin/users" className="underline">
              Admin · Users
            </Link>
            . Grant temporary access via{" "}
            <Link to="/admin/delegations" className="underline">
              Admin · Delegations
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
