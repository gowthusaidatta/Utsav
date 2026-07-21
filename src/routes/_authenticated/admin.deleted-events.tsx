import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listDeletedEvents,
  restoreEvent,
  purgeEvent,
} from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/deleted-events")({
  head: () => ({ meta: [{ title: "Deleted events — Utsav" }] }),
  component: DeletedEvents,
});

function DeletedEvents() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDeletedEvents);
  const restoreFn = useServerFn(restoreEvent);
  const purgeFn = useServerFn(purgeEvent);

  const q = useQuery({
    queryKey: ["admin", "deleted-events"],
    queryFn: () => listFn(),
  });

  const restore = useMutation({
    mutationFn: (id: string) => restoreFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "deleted-events"] });
      toast.success("Event restored");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const purge = useMutation({
    mutationFn: (id: string) => purgeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "deleted-events"] });
      toast.success("Event permanently deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deleted events</h1>
        <p className="text-sm text-muted-foreground">
          Soft-deleted events. Restore or permanently purge (super admin only).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {q.data?.length ?? 0} deleted event{(q.data?.length ?? 0) === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No deleted events.</p>
          ) : (
            <ul className="divide-y">
              {(q.data ?? []).map((e) => (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.title}</span>
                      <Badge variant="outline">{e.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Deleted{" "}
                      {e.deleted_at
                        ? new Date(e.deleted_at).toLocaleString()
                        : "—"}
                      {e.delete_reason ? ` · ${e.delete_reason}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restore.mutate(e.id)}
                      disabled={restore.isPending}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Permanently delete "${e.title}"? This cannot be undone.`,
                          )
                        )
                          purge.mutate(e.id);
                      }}
                      disabled={purge.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Purge
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
