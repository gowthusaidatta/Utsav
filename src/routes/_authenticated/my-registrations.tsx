import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myRegistrations, cancelRegistration } from "@/lib/registrations.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Ticket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ListSkeleton } from "@/components/EmptyState";


export const Route = createFileRoute("/_authenticated/my-registrations")({
  head: () => ({ meta: [{ title: "My Registrations — Utsav" }] }),
  component: MyRegs,
});

function statusBadge(s: string) {
  const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    registered: "default",
    waitlist: "secondary",
    checked_in: "default",
    cancelled: "outline",
    no_show: "destructive",
  };
  return map[s] ?? "outline";
}

function MyRegs() {
  const list = useServerFn(myRegistrations);
  const cancel = useServerFn(cancelRegistration);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["my-registrations"], queryFn: () => list() });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancel({ data: { registration_id: id } }),
    onSuccess: () => {
      toast.success("Registration cancelled");
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        icon={<Ticket className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "My registrations" },
        ]}
        title="My registrations"
        subtitle="Track events you've signed up for."
      />

      <div className="mt-2 space-y-3">
        {q.isLoading && <ListSkeleton rows={3} />}
        {q.data && q.data.length === 0 && (
          <EmptyState
            icon={<Calendar className="h-5 w-5" />}
            title="No registrations yet"
            description="Browse events and sign up to see them here."
            action={
              <Button asChild size="sm">
                <Link to="/events">Browse events</Link>
              </Button>
            }
          />
        )}
        {q.data?.map((r) => {
          const ev = (r.event as unknown as { slug: string; title: string; start_at: string | null } | null);

          return (
            <Card key={r.id}>
              <CardContent className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadge(r.status)}>{r.status.replace("_", " ")}</Badge>
                    {r.payment_status !== "not_required" && (
                      <Badge variant="outline">Payment: {r.payment_status}</Badge>
                    )}
                  </div>
                  <div className="mt-2 font-medium">{ev?.title ?? "Event"}</div>
                  <div className="text-xs text-muted-foreground">
                    {ev?.start_at ? new Date(ev.start_at).toLocaleString() : "Date TBA"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {ev?.slug && (
                    <Link
                      to="/events/$slug"
                      params={{ slug: ev.slug }}
                      className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
                    >
                      View
                    </Link>
                  )}
                  {r.status !== "cancelled" && r.status !== "checked_in" && (
                    <Button variant="outline" size="sm" onClick={() => cancelM.mutate(r.id)} disabled={cancelM.isPending}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
