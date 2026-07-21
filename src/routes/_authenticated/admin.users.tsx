import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listUsersWithRoles,
  assignRole,
  revokeRole,
  getMyAuditLog,
  getActorContext,
  ROLE_RANK,
  ROLE_LABEL,
  type AppRole,
} from "@/lib/authz.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/EmptyState";


import { APP_ROLES, ROLE_LABELS } from "@/lib/rbac-matrix";
const ROLES = APP_ROLES;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users — Utsav" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const listFn = useServerFn(listUsersWithRoles);
  const assignFn = useServerFn(assignRole);
  const revokeFn = useServerFn(revokeRole);
  const auditFn = useServerFn(getMyAuditLog);
  const meFn = useServerFn(getActorContext);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState("");
  const me = useQuery({ queryKey: ["actor-ctx"], queryFn: () => meFn() });
  const actorRank = me.data?.rank ?? 0;
  const assignable = (Object.keys(ROLE_RANK) as AppRole[])
    .filter((r) => ROLE_RANK[r] < actorRank && r !== "admin")
    .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);
  const users = useQuery({
    queryKey: ["admin-users", committed],
    queryFn: () => listFn({ data: committed ? { search: committed } : {} }),
  });
  const audit = useQuery({ queryKey: ["my-audit"], queryFn: () => auditFn() });

  const [pending, setPending] = useState<Record<string, AppRole>>({});

  const assign = useMutation({
    mutationFn: (v: { userId: string; role: AppRole }) =>
      assignFn({ data: { userId: v.userId, role: v.role, scope: "global" } }),
    onSuccess: () => {
      toast.success("Role assigned");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["my-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (roleId: string) => revokeFn({ data: { roleId } }),
    onSuccess: () => {
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["my-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (users.isError) {
    return (
      <main className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Admin" },
            { label: "Users" },
          ]}
          title="Users & roles"
        />
        <ErrorState
          description={
            (users.error as Error).message === "Forbidden"
              ? "You don't have permission to view this page."
              : "Failed to load users."
          }
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Admin" },
          { label: "Users" },
        ]}
        title="Users & roles"
        subtitle="Admin-only view. Grant or revoke global roles."
      />



      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(search.trim());
            }}
          >
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
            {committed && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setCommitted("");
                }}
              >
                Clear
              </Button>
            )}
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="w-[280px]">Grant global role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">none</span>
                      )}
                      {u.roles.map((r) => (
                        <Badge
                          key={r.role + r.scope + (r.scope_id ?? "")}
                          variant="secondary"
                          className="gap-1"
                        >
                          {r.role} · {r.scope}
                          <button
                            className="ml-1 hover:text-destructive"
                            onClick={() => {
                              const roleRow = u.roles.find(
                                (x) =>
                                  x.role === r.role &&
                                  x.scope === r.scope &&
                                  x.scope_id === r.scope_id,
                              ) as { id?: string } | undefined;
                              const id = (r as { id?: string }).id ?? roleRow?.id;
                              if (id) revoke.mutate(id);
                            }}
                            aria-label="Revoke role"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={pending[u.id] ?? ""}
                        onValueChange={(v) =>
                          setPending({ ...pending, [u.id]: v as AppRole })
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignable.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!pending[u.id] || assign.isPending}
                        onClick={() =>
                          pending[u.id] && assign.mutate({ userId: u.id, role: pending[u.id] })
                        }
                      >
                        Grant
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity (your audit trail)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {(audit.data ?? []).slice(0, 20).map((e) => (
              <li key={e.id} className="text-muted-foreground">
                <span className="font-mono text-foreground">{e.action}</span>{" "}
                {e.resource_type ? `· ${e.resource_type}` : ""}{" "}
                <span className="text-xs">{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
            {(audit.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No activity yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
