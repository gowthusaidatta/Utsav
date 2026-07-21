import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/EmptyState";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Utsav" },
      { name: "description", content: "Your Utsav notification inbox." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);

  const q = useQuery({
    queryKey: ["notifications", "list", "all"],
    queryFn: () => listFn({ data: { limit: 100 } }),
  });

  const markOne = useMutation({
    mutationFn: (v: { id: string; read: boolean }) => markFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllFn({ data: undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        icon={<Bell className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Notifications" },
        ]}
        title="Notifications"
        subtitle={
          unread > 0 ? `${unread} unread` : "You're all caught up."
        }
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="gap-1"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : null
        }
      />

      {q.isLoading ? (
        <ListSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorState
          description={(q.error as Error)?.message ?? "Failed to load notifications."}
          action={
            <Button variant="outline" size="sm" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="No notifications yet"
          description="When events are updated, approvals happen, or certificates are issued, they'll show up here."
          action={
            <Button asChild size="sm">
              <Link to="/events">Browse events</Link>
            </Button>
          }
        />
      ) : (
        <Card className="divide-y">
          {items.map((n) => {
            const isUnread = !n.read_at;
            return (
              <div
                key={n.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={
                        "text-sm " +
                        (isUnread ? "font-semibold" : "text-muted-foreground")
                      }
                    >
                      {n.subject ?? n.template_key ?? "Notification"}
                    </p>
                    {isUnread && (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  {n.body && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      markOne.mutate({ id: n.id, read: isUnread })
                    }
                  >
                    {isUnread ? "Mark read" : "Mark unread"}
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
