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
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        icon={<ShieldCheck className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Admin" },
          { label: "Event approvals" },
        ]}
        title="Event approvals"
        subtitle="Events submitted by organizers awaiting faculty or admin approval."
      />

      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.error ? (
        <ErrorState
          description={q.error instanceof Error ? q.error.message : "Unable to load queue."}
          action={
            <Button variant="outline" size="sm" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Nothing pending"
          description="All events have been reviewed."
        />
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
