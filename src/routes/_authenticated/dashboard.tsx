import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/authz.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, User, Plus, CalendarDays } from "lucide-react";

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
  const isAdmin = (roles.data ?? []).some((r) => r.role === "admin" && r.scope === "global");
  const isFaculty = (roles.data ?? []).some((r) => r.role === "faculty" && r.scope === "global");

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{profile.data?.full_name ? `, ${profile.data.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Your Utsav dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
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

      {(isAdmin || isFaculty) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAdmin ? "Admin" : "Faculty"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <Button asChild size="sm">
                  <Link to="/admin/users">Users & roles</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/organizations">Organizations</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/delegations">Delegations</Link>
                </Button>
              </>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/approvals">Event approvals</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Events, registrations, teams, submissions, judging, QR check-in, certificates, and
          analytics ship in the next phase — built on top of this foundation.
        </CardContent>
      </Card>
    </main>
  );
}
