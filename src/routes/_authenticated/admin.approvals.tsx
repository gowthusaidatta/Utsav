import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPendingApproval, changeEventStatus } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Calendar, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/EmptyState";


export const Route = createFileRoute("/_authenticated/admin/approvals")({
  head: () => ({ meta: [{ title: "Event Approvals — Utsav" }] }),
  component: Approvals,
});

function Approvals() {
  const listFn = useServerFn(listPendingApproval);
  const statusFn = useServerFn(changeEventStatus);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pending-events"], queryFn: () => listFn() });

  async function act(id: string, to: "published" | "draft", label: string) {
    if (!window.confirm(`${label} this event?`)) return;
    try {
      await statusFn({ data: { id, to } });
      toast.success(`${label} complete`);
      await qc.invalidateQueries({ queryKey: ["pending-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Event approvals</h1>
        <p className="text-sm text-muted-foreground">
          Events submitted by organizers awaiting faculty or admin approval.
        </p>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : q.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            {q.error instanceof Error ? q.error.message : "Unable to load queue."}
          </CardContent>
        </Card>
      ) : (q.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nothing pending. All caught up.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {q.data!.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                  {e.category && <span>{e.category}</span>}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {e.start_at ? new Date(e.start_at).toLocaleString() : "No date"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events/$id/manage" params={{ id: e.id }}>
                      Review
                    </Link>
                  </Button>
                  <Button size="sm" onClick={() => act(e.id, "published", "Approve")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act(e.id, "draft", "Send back to draft")}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
