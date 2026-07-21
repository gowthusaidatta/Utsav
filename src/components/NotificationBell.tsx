import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  listMyNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications.functions";

export function NotificationBell() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const countFn = useServerFn(unreadNotificationCount);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);

  const countQ = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () => countFn({ data: undefined }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const listQ = useQuery({
    queryKey: ["notifications", "list", "recent"],
    queryFn: () => listFn({ data: { limit: 10 } }),
  });

  const markOne = useMutation({
    mutationFn: (v: { id: string; read: boolean }) => markFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllFn({ data: undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = countQ.data?.count ?? 0;
  const items = listQ.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px] leading-none"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {listQ.isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <Inbox className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() =>
                        markOne.mutate({ id: n.id, read: !isUnread })
                      }
                      className="flex w-full flex-col items-start gap-1 p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <p
                          className={
                            "text-sm " +
                            (isUnread ? "font-medium" : "text-muted-foreground")
                          }
                        >
                          {n.subject ?? n.template_key ?? "Notification"}
                        </p>
                        {isUnread && (
                          <span
                            aria-hidden
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      {n.body && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
          >
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
