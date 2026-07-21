import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listAllDelegations,
  delegatePermission,
  revokeDelegation,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { KeyRound } from "lucide-react";



const ROLES = ["organizer", "coordinator", "judge", "volunteer", "faculty", "admin"] as const;
const SCOPES = ["global", "organization", "event"] as const;

export const Route = createFileRoute("/_authenticated/admin/delegations")({
  head: () => ({ meta: [{ title: "Admin · Delegations — Utsav" }] }),
  component: DelegationsPage,
});

function DelegationsPage() {
  const listFn = useServerFn(listAllDelegations);
  const grantFn = useServerFn(delegatePermission);
  const revokeFn = useServerFn(revokeDelegation);
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["admin-delegations"], queryFn: () => listFn() });

  const [form, setForm] = useState({
    delegateUserId: "",
    role: "organizer" as (typeof ROLES)[number],
    scope: "event" as (typeof SCOPES)[number],
    scopeId: "",
    expiresAt: "",
  });

  const grant = useMutation({
    mutationFn: () =>
      grantFn({
        data: {
          delegateUserId: form.delegateUserId.trim(),
          role: form.role,
          scope: form.scope,
          scopeId: form.scope === "global" ? null : form.scopeId.trim() || null,
          expiresAt: new Date(form.expiresAt).toISOString(),
        },
      }),
    onSuccess: () => {
      toast.success("Delegation granted");
      setForm({
        delegateUserId: "",
        role: "organizer",
        scope: "event",
        scopeId: "",
        expiresAt: "",
      });
      qc.invalidateQueries({ queryKey: ["admin-delegations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Revoked");
      qc.invalidateQueries({ queryKey: ["admin-delegations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rows.isError)
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-sm text-destructive">
          {(rows.error as Error).message === "Forbidden"
            ? "Admins only."
            : "Failed to load."}
        </p>
      </main>
    );

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permission delegations</h1>
        <p className="text-sm text-muted-foreground">
          Grant time-boxed scoped roles. Revocation is immediate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New delegation</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.delegateUserId.trim()) return toast.error("User ID required");
              if (!form.expiresAt) return toast.error("Expiry required");
              grant.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="uid">Delegate user ID</Label>
              <Input
                id="uid"
                value={form.delegateUserId}
                onChange={(e) => setForm({ ...form, delegateUserId: e.target.value })}
                className="font-mono text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as (typeof ROLES)[number] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => setForm({ ...form, scope: v as (typeof SCOPES)[number] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sid">Scope ID</Label>
              <Input
                id="sid"
                value={form.scopeId}
                onChange={(e) => setForm({ ...form, scopeId: e.target.value })}
                disabled={form.scope === "global"}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp">Expires at</Label>
              <Input
                id="exp"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-5">
              <Button type="submit" disabled={grant.isPending}>
                {grant.isPending ? "Granting…" : "Grant delegation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All delegations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Delegator → Delegate</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows.data ?? []).map((d) => {
                const now = Date.now();
                const expired = new Date(d.expires_at).getTime() < now;
                const revoked = !!d.revoked_at;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="secondary">{d.role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.scope}
                      {d.scope_id ? ` · ${d.scope_id.slice(0, 8)}…` : ""}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.delegator_user_id.slice(0, 8)}… → {d.delegate_user_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(d.expires_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {revoked ? (
                        <Badge variant="destructive">revoked</Badge>
                      ) : expired ? (
                        <Badge variant="outline">expired</Badge>
                      ) : (
                        <Badge>active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!revoked && !expired && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revoke.mutate(d.id)}
                          disabled={revoke.isPending}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(rows.data ?? []).length === 0 && !rows.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No delegations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
