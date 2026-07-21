import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listMyEvents } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ListSkeleton } from "@/components/EmptyState";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/my-events")({
  head: () => ({ meta: [{ title: "My Events — Utsav" }] }),
  component: MyEvents,
});

const STATUSES = [
  "all",
  "draft",
  "pending_approval",
  "published",
  "cancelled",
  "completed",
  "archived",
] as const;

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
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const q = useQuery({
    queryKey: ["my-events", status],
    queryFn: () =>
      fn({
        data:
          status === "all"
            ? {}
            : {
                status: status as Exclude<(typeof STATUSES)[number], "all">,
              },
      }),
  });

  return (
    <main className="container mx-auto px-4 py-6">
      <PageHeader
        icon={<CalendarDays className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "My events" },
        ]}
        title="My events"
        subtitle="Events you own, organize, coordinate, judge, or volunteer for."
        actions={
          <>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild size="sm">
              <Link to="/events/new">
                <Plus className="mr-2 h-4 w-4" /> New event
              </Link>
            </Button>
          </>
        }
      />

      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-5 w-5" />}
          title={status === "all" ? "No events yet" : `No events with status "${status}"`}
          description={
            status === "all"
              ? "Create your first event to get started."
              : "Try a different status filter."
          }
          action={
            status === "all" && (
              <Button asChild size="sm">
                <Link to="/events/new">
                  <Plus className="mr-2 h-4 w-4" /> Create event
                </Link>
              </Button>
            )
          }
        />
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
