import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/authz.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  User,
  Plus,
  CalendarDays,
  LayoutDashboard,
  Ticket,
  Bell,
  Users,
  Award,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Utsav" }] }),
  component: Dashboard,
});

function Dashboard() {
  const rolesFn = useServerFn(getMyRoles);
  const profileFn = useServerFn(getMyProfile);
  const roles = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: () => profileFn() });
  const router = useRouter();
  const activeRoles = (roles.data ?? []).filter(
    (r) => !r.expires_at || new Date(r.expires_at) > new Date(),
  );
  const canCreateEvent = activeRoles.some((r) =>
    ["admin", "super_admin", "platform_admin", "org_admin", "college_admin", "dept_admin", "faculty", "organizer", "coordinator"].includes(r.role),
  );

  const quickLinks: Array<{ to: string; label: string; icon: React.ReactNode; desc: string }> = [
    { to: "/my-events", label: "My events", icon: <CalendarDays className="h-4 w-4" />, desc: "Events you manage or organize" },
    { to: "/my-registrations", label: "My registrations", icon: <Ticket className="h-4 w-4" />, desc: "Events you're registered for" },
    { to: "/events", label: "Browse events", icon: <CalendarDays className="h-4 w-4" />, desc: "Discover upcoming events" },
    { to: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, desc: "Announcements & updates" },
    { to: "/delegations", label: "Delegations", icon: <Users className="h-4 w-4" />, desc: "Roles delegated to you" },
    { to: "/profile", label: "Profile & certificates", icon: <Award className="h-4 w-4" />, desc: "Your identity and awards" },
  ];

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard" }]}
        title={`Welcome${profile.data?.full_name ? `, ${profile.data.full_name}` : ""}`}
        subtitle="Your Utsav dashboard."
        actions={
          <>
            {canCreateEvent && (
              <Button asChild size="sm">
                <Link to="/events/new">
                  <Plus className="mr-2 h-4 w-4" /> New event
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/my-events">
                <CalendarDays className="mr-2 h-4 w-4" /> My events
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Your roles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.isLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : (roles.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roles.data!.map((r) => (
                  <Badge key={r.id} variant="secondary">
                    {r.role} · {r.scope}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              {profile.data?.email ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">College:</span>{" "}
              {profile.data?.college ?? "—"}
            </div>
            <Button variant="outline" size="sm" onClick={() => router.navigate({ to: "/profile" })}>
              Edit profile
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            <div className="flex items-center gap-2 font-medium">
              <span className="text-primary">{q.icon}</span>
              {q.label}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
