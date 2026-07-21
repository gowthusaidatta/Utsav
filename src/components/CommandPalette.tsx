import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  LayoutDashboard,
  Plus,
  Ticket,
  User as UserIcon,
  Bell,
  Users,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { listPublicEvents } from "@/lib/events.functions";

/**
 * Global command palette (Cmd/Ctrl+K).
 *
 * Provides quick navigation and event search across the app. Event results
 * come from the public `listPublicEvents` server function which supports a
 * full ILIKE search across title/description/category.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const searchFn = useServerFn(listPublicEvents);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const debounced = useDebounced(query, 200);

  const searchQ = useQuery({
    queryKey: ["cmdk", "events", debounced],
    queryFn: () =>
      searchFn({
        data: debounced ? { q: debounced, limit: 8 } : { limit: 8 },
      }),
    enabled: open,
  });

  function go(to: string) {
    setOpen(false);
    // navigate expects a typed literal; cast is safe for known static routes.
    navigate({ to: to as never });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden gap-2 text-muted-foreground md:inline-flex"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Search…</span>
        <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="md:hidden"
        aria-label="Open search"
      >
        <Search className="h-5 w-5" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search events, jump to pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searchQ.isFetching ? "Searching…" : "No results found."}
          </CommandEmpty>

          {(searchQ.data?.events ?? []).length > 0 && (
            <>
              <CommandGroup heading="Events">
                {searchQ.data!.events!.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`event-${e.slug}-${e.title}`}
                    onSelect={() => go(`/events/${e.slug}`)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">{e.title}</span>
                    {e.category && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {e.category}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Jump to">
            <CommandItem onSelect={() => go("/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go("/events")}>
              <Calendar className="mr-2 h-4 w-4" /> Browse events
            </CommandItem>
            <CommandItem onSelect={() => go("/events/new")}>
              <Plus className="mr-2 h-4 w-4" /> New event
            </CommandItem>
            <CommandItem onSelect={() => go("/my-events")}>
              <Calendar className="mr-2 h-4 w-4" /> My events
            </CommandItem>
            <CommandItem onSelect={() => go("/my-registrations")}>
              <Ticket className="mr-2 h-4 w-4" /> My registrations
            </CommandItem>
            <CommandItem onSelect={() => go("/notifications")}>
              <Bell className="mr-2 h-4 w-4" /> Notifications
            </CommandItem>
            <CommandItem onSelect={() => go("/profile")}>
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Admin">
            <CommandItem onSelect={() => go("/admin/users")}>
              <Users className="mr-2 h-4 w-4" /> Users & roles
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/user-approvals")}>
              <ShieldCheck className="mr-2 h-4 w-4" /> User approvals
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/approvals")}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Event approvals
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/organizations")}>
              <Building2 className="mr-2 h-4 w-4" /> Organizations
            </CommandItem>
            <CommandItem onSelect={() => go("/admin/delegations")}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Delegations
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
