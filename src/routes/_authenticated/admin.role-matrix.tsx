import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { verifyMyPermissions, listPermissionCatalog } from "@/lib/authz.functions";
import {
  APP_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  cellFor,
  type AppRole,
} from "@/lib/rbac-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

type CatalogRow = Awaited<ReturnType<typeof listPermissionCatalog>>[number];

function RoleMatrixPage() {
  const verify = useServerFn(verifyMyPermissions);
  const catalogFn = useServerFn(listPermissionCatalog);
  const [q, setQ] = useState("");

  const catalog = useQuery({
    queryKey: ["role-permission-catalog"],
    queryFn: () => catalogFn(),
  });

  const live = useQuery({
    queryKey: ["role-matrix-verify"],
    queryFn: () => verify({ data: {} }),
  });

  const rolesAll = useMemo(() => [...APP_ROLES, "guest" as const], []);
  const filter = q.trim().toLowerCase();

  const grouped = useMemo(() => {
    const rows = (catalog.data ?? []) as CatalogRow[];
    const buckets = new Map<string, CatalogRow[]>();
    for (const r of rows) {
      if (
        filter &&
        !r.label.toLowerCase().includes(filter) &&
        !r.action.toLowerCase().includes(filter) &&
        !r.category.toLowerCase().includes(filter)
      )
        continue;
      const arr = buckets.get(r.category) ?? [];
      arr.push(r);
      buckets.set(r.category, arr);
    }
    const ordered: Array<{ category: string; rows: CatalogRow[] }> = [];
    for (const cat of CATEGORY_ORDER) {
      const rs = buckets.get(cat);
      if (rs && rs.length) ordered.push({ category: cat, rows: rs });
    }
    // any categories not in the canonical order
    for (const [cat, rs] of buckets) {
      if (!CATEGORY_ORDER.includes(cat as (typeof CATEGORY_ORDER)[number])) {
        ordered.push({ category: cat, rows: rs });
      }
    }
    return ordered;
  }, [catalog.data, filter]);

  const totalActions = (catalog.data ?? []).length;

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Admin", to: "/admin/users" }, { label: "Role matrix" }]}
        title="Role & permissions matrix"
        subtitle={`The source-of-truth mapping of Utsav's ${APP_ROLES.length} roles to ${totalActions || "…"} authorized actions. Enforced server-side by public.can() and RLS.`}
      />

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
              <p className="text-xs text-muted-foreground">
                {Object.values(live.data.actions).filter(Boolean).length} of{" "}
                {Object.keys(live.data.actions).length} actions currently allowed for
                you (event-scoped actions show as denied here because no event id is
                supplied).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Full matrix ({APP_ROLES.length + 1} roles × {totalActions || "…"} actions)</CardTitle>
          <Input
            placeholder="Filter actions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:w-64"
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {catalog.isLoading && <p className="text-sm">Loading catalog…</p>}
          {catalog.error && (
            <p className="text-sm text-destructive">
              {(catalog.error as Error).message}
            </p>
          )}
          {catalog.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background min-w-[240px]">
                    Action
                  </TableHead>
                  {rolesAll.map((r) => (
                    <TableHead key={r} className="whitespace-nowrap text-center">
                      {ROLE_LABELS[r]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map(({ category, rows }) => (
                  <>
                    <TableRow key={`h-${category}`} className="bg-muted/40">
                      <TableCell
                        colSpan={rolesAll.length + 1}
                        className="sticky left-0 bg-muted/40 text-xs font-semibold uppercase tracking-wide"
                      >
                        {CATEGORY_LABELS[category] ?? category}
                      </TableCell>
                    </TableRow>
                    {rows.map((row) => (
                      <TableRow key={row.action}>
                        <TableCell className="sticky left-0 bg-background">
                          <div className="font-medium">{row.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.action}
                            {row.is_public && " · public"}
                            {row.is_self_service && " · self-service"}
                          </div>
                        </TableCell>
                        {rolesAll.map((r) => {
                          const cell = cellFor(r as AppRole | "guest", row);
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
                  </>
                ))}
              </TableBody>
            </Table>
          )}
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
            {rolesAll.map((r) => (
              <div key={r} className="rounded-md border p-3">
                <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                <dd className="text-sm text-muted-foreground">
                  {ROLE_DESCRIPTIONS[r]}
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
