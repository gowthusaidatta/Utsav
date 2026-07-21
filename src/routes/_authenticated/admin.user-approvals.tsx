import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listPendingApprovals,
  approveUser,
  rejectUser,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, EmptyState } from "@/components/EmptyState";
import { UserCheck } from "lucide-react";



export const Route = createFileRoute("/_authenticated/admin/user-approvals")({
  head: () => ({ meta: [{ title: "Admin · Account Approvals — Utsav" }] }),
  component: UserApprovalsPage,
});

function UserApprovalsPage() {
  const listFn = useServerFn(listPendingApprovals);
  const approveFn = useServerFn(approveUser);
  const rejectFn = useServerFn(rejectUser);
  const meFn = useServerFn(getActorContext);
  const qc = useQueryClient();

  const me = useQuery({ queryKey: ["actor-ctx"], queryFn: () => meFn() });
  const pending = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => listFn(),
  });

  const [pendingRole, setPendingRole] = useState<Record<string, AppRole>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const approve = useMutation({
    mutationFn: (v: { userId: string; role: AppRole }) =>
      approveFn({ data: v }),
    onSuccess: () => {
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (v: { userId: string; reason: string }) =>
      rejectFn({ data: v }),
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actorRank = me.data?.rank ?? 0;
  const assignable = (Object.keys(ROLE_RANK) as AppRole[])
    .filter((r) => ROLE_RANK[r] < actorRank && r !== "admin")
    .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);

  if (pending.isError) {
    return (
      <main className="container mx-auto px-4 py-8">
        <ErrorState title="Failed to load approvals" description={(pending.error as Error).message} />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Admin", to: "/admin/users" }, { label: "Account approvals" }]}
        title="Account approvals"
        subtitle={
          <>
            Verify identity documents and assign a role strictly below your own rank. Your rank:{" "}
            <Badge variant="secondary">{actorRank}</Badge>
          </>
        }
      />



      <Card>
        <CardHeader>
          <CardTitle>Pending accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Approve as</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pending.data ?? []).map((u) => {
                const defaultRole =
                  (u.desired_role as AppRole | null) ?? "student";
                const chosen = pendingRole[u.id] ?? defaultRole;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {[u.college, u.department].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {u.desired_role ? ROLE_LABEL[u.desired_role as AppRole] : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.roll_number && <div>Roll: {u.roll_number}</div>}
                      {u.faculty_id && <div>Faculty ID: {u.faculty_id}</div>}
                      {u.designation && <div>{u.designation}</div>}
                      {u.academic_year && <div>Year: {u.academic_year}</div>}
                      {u.phone && <div>{u.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={chosen}
                        onValueChange={(v) =>
                          setPendingRole((s) => ({ ...s, [u.id]: v as AppRole }))
                        }
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignable.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={approve.isPending || !assignable.includes(chosen)}
                          onClick={() =>
                            approve.mutate({ userId: u.id, role: chosen })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reject.isPending || !(reason[u.id] ?? "").trim()}
                          onClick={() =>
                            reject.mutate({
                              userId: u.id,
                              reason: (reason[u.id] ?? "").trim(),
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                      <Input
                        placeholder="Rejection reason"
                        value={reason[u.id] ?? ""}
                        onChange={(e) =>
                          setReason((s) => ({ ...s, [u.id]: e.target.value }))
                        }
                        maxLength={500}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(pending.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No pending accounts.
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
