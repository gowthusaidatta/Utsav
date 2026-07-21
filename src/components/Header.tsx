import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, LogOut, User as UserIcon, LayoutDashboard, Ticket, Plus, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandPalette } from "@/components/CommandPalette";


export function Header() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "U";

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span>Utsav</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user && <CommandPalette />}
          <ThemeToggle />
          {user && <NotificationBell />}
          {loading ? null : user ? (

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm max-w-[160px] truncate">
                    {displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/my-events" })}>
                  <CalendarDays className="mr-2 h-4 w-4" /> My events
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/events/new" })}>
                  <Plus className="mr-2 h-4 w-4" /> New event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/my-registrations" })}>
                  <Ticket className="mr-2 h-4 w-4" /> My registrations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/notifications" })}>
                  <Bell className="mr-2 h-4 w-4" /> Notifications
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate({ to: "/delegations" })}>
                  <UserIcon className="mr-2 h-4 w-4" /> Delegations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
