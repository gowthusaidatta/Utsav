import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyEvents } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-events")({
  head: () => ({ meta: [{ title: "My Events — Utsav" }] }),
  component: MyEvents,
});

function statusColor(s: string) {
  switch (s) {
    case "published":
      return "default" as const;
    case "draft":
      return "outline" as const;
    case "pending_approval":
      return "secondary" as const;
    case "cancelled":
    case "archived":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function MyEvents() {
  const fn = useServerFn(listMyEvents);
  const q = useQuery({ queryKey: ["my-events"], queryFn: () => fn() });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My events</h1>
          <p className="text-sm text-muted-foreground">
            Events you own, organize, coordinate, judge, or volunteer for.
          </p>
        </div>
        <Button asChild>
          <Link to="/events/new">
            <Plus className="mr-2 h-4 w-4" /> New event
          </Link>
        </Button>
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You don't have any events yet.{" "}
            <Link to="/events/new" className="text-primary hover:underline">
              Create your first event
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data!.map((e) => (
            <Card key={e.id} className="transition hover:border-primary/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={statusColor(e.status)}>{e.status}</Badge>
                  <Badge variant="outline">{e.visibility}</Badge>
                </div>
                <CardTitle className="text-base leading-snug">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {e.start_at
                    ? new Date(e.start_at).toLocaleDateString()
                    : "No date set"}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events/$id/manage" params={{ id: e.id }}>
                      Manage
                    </Link>
                  </Button>
                  {e.status === "published" && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/events/$slug" params={{ slug: e.slug }}>
                        View public page
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
