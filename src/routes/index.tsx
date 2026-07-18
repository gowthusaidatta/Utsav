import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, ShieldCheck, Award, QrCode, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof CalendarDays;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Icon className="h-6 w-6 text-primary" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            Run events the enterprise way.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            EventGo powers hackathons, conferences, and campus fests end-to-end — with role-based
            access, teams, judging, certificates, and analytics built for 30,000+ users.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto grid gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={ShieldCheck}
            title="Enterprise RBAC"
            desc="Seven roles, event-scoped permissions, time-bounded delegation, and audit logs on every action."
          />
          <Feature
            icon={Users}
            title="Teams & registrations"
            desc="Invite codes, capacity control, approval workflows, and secure team management."
          />
          <Feature
            icon={QrCode}
            title="QR check-in"
            desc="Attendance tracking with QR badges and volunteer-driven check-in stations."
          />
          <Feature
            icon={Award}
            title="Judging & certificates"
            desc="Blind scoring by judges, deadline enforcement, and automatic certificate issuance."
          />
          <Feature
            icon={BarChart3}
            title="Analytics & reports"
            desc="Real-time dashboards for organizers, faculty, and admins with exportable reports."
          />
          <Feature
            icon={CalendarDays}
            title="Multi-organization"
            desc="Colleges, departments, clubs, and external partners — all under one roof."
          />
        </section>
      </main>
    </div>
  );
}
