import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listMyDelegations, revokeDelegation } from "@/lib/authz.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";


export const Route = createFileRoute("/_authenticated/delegations")({
  head: () => ({ meta: [{ title: "My delegations — Utsav" }] }),
  component: MyDelegations,
});

function statusOf(d: { expires_at: string; revoked_at: string | null }) {
  if (d.revoked_at) return "revoked" as const;
  if (new Date(d.expires_at).getTime() < Date.now()) return "expired" as const;
  return "active" as const;
}

function MyDelegations() {
  const listFn = useServerFn(listMyDelegations);
  const revokeFn = useServerFn(revokeDelegation);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-delegations"], queryFn: () => listFn() });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Revoked");
      qc.invalidateQueries({ queryKey: ["my-delegations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My delegations</h1>
        <p className="text-sm text-muted-foreground">
          Roles delegated to you, and roles you've delegated to others.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Granted to me</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(q.data?.incoming ?? []).map((d) => {
              const s = statusOf(d);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {d.role} · {d.scope}
                      {d.scope_id ? ` (${d.scope_id.slice(0, 8)}…)` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expires {new Date(d.expires_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={s === "active" ? "default" : s === "revoked" ? "destructive" : "outline"}>
                    {s}
                  </Badge>
                </li>
              );
            })}
            {(q.data?.incoming ?? []).length === 0 && !q.isLoading && (
              <li className="text-sm text-muted-foreground">Nothing delegated to you.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegated by me</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(q.data?.outgoing ?? []).map((d) => {
              const s = statusOf(d);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {d.role} · {d.scope}
                      {d.scope_id ? ` (${d.scope_id.slice(0, 8)}…)` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      To {d.delegate_user_id.slice(0, 8)}… · expires{" "}
                      {new Date(d.expires_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s === "active" ? "default" : s === "revoked" ? "destructive" : "outline"}>
                      {s}
                    </Badge>
                    {s === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revoke.mutate(d.id)}
                        disabled={revoke.isPending}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
            {(q.data?.outgoing ?? []).length === 0 && !q.isLoading && (
              <li className="text-sm text-muted-foreground">You haven't delegated anything.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
