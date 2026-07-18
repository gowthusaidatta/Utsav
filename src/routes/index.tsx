import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Sparkles,
  ShieldCheck,
  Users,
  QrCode,
  Award,
  BarChart3,
  CalendarDays,
  ArrowRight,
  Check,
  Zap,
  Ticket,
  MapPin,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Utsav — Modern Event Management Platform" },
      {
        name: "description",
        content:
          "Utsav helps teams run hackathons, conferences, and campus fests end-to-end — registrations, teams, judging, QR check-in, certificates, and analytics.",
      },
      { property: "og:title", content: "Utsav — Modern Event Management Platform" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

/* ------------------------------------------------------------------ */
/* Data — static demo content for the marketing surface               */
/* ------------------------------------------------------------------ */

const stats = [
  { label: "Events run", value: "12,400+" },
  { label: "Attendees", value: "1.8M" },
  { label: "Organizations", value: "640" },
  { label: "Uptime", value: "99.99%" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Enterprise RBAC",
    desc: "Seven roles, event-scoped permissions, time-bounded delegation, and a full audit trail on every action.",
  },
  {
    icon: Users,
    title: "Teams & registrations",
    desc: "Invite codes, capacity control, approval workflows, and secure team management out of the box.",
  },
  {
    icon: QrCode,
    title: "QR check-in",
    desc: "Volunteer stations with instant QR scanning, badge printing, and attendance analytics in real time.",
  },
  {
    icon: Award,
    title: "Judging & certificates",
    desc: "Blind scoring, deadline enforcement, auto-generated certificates, and shareable winner pages.",
  },
  {
    icon: BarChart3,
    title: "Analytics that ship",
    desc: "Real-time dashboards for organizers, faculty, and admins — exportable, filterable, and fast.",
  },
  {
    icon: Zap,
    title: "Built to scale",
    desc: "Serverless-first architecture handles 30,000+ concurrent users with sub-100ms API latency.",
  },
];

const featuredEvents = [
  {
    tag: "Hackathon",
    title: "Utsav Global Hack 2026",
    date: "Mar 14 – 16, 2026",
    location: "Bengaluru, IN",
    attendees: "3,200 registered",
    accent: "from-primary/20 to-accent/20",
  },
  {
    tag: "Conference",
    title: "DevSummit — Frontier Systems",
    date: "Apr 22, 2026",
    location: "San Francisco, US",
    attendees: "1,800 registered",
    accent: "from-accent/20 to-primary/20",
  },
  {
    tag: "Fest",
    title: "Rangotsav — Cultural Fest",
    date: "May 03 – 05, 2026",
    location: "Pune, IN",
    attendees: "6,400 registered",
    accent: "from-primary/25 to-info/20",
  },
];

const upcomingEvents = [
  { title: "AI Founders Meetup", date: "Feb 08, 2026", city: "Remote" },
  { title: "OpenSource Sprint", date: "Feb 14, 2026", city: "Berlin" },
  { title: "Product School Live", date: "Feb 21, 2026", city: "New York" },
  { title: "Design Systems Day", date: "Feb 27, 2026", city: "London" },
];

const testimonials = [
  {
    quote:
      "We moved 40 events onto Utsav in one semester. Registrations, judging, and certificates now run themselves.",
    name: "Ananya Rao",
    role: "Head of Events, IIT Bombay",
  },
  {
    quote:
      "The RBAC model is exactly what enterprise needs. Auditors love it — our team ships faster because of it.",
    name: "Marcus Ellis",
    role: "VP Engineering, Northwind",
  },
  {
    quote:
      "Onboarding 3,000 attendees used to take a weekend. With Utsav QR check-in it's twelve minutes.",
    name: "Priya Sharma",
    role: "Program Director, DevSummit",
  },
];

const orgs = [
  "Northwind",
  "Contoso",
  "Acme Labs",
  "Vertex",
  "Lumen",
  "Fabrikam",
  "Globex",
  "Initech",
];

const faqs = [
  {
    q: "Is Utsav suitable for small campus events too?",
    a: "Yes. Utsav scales from a 50-person workshop to a 30,000-attendee fest with the same tooling — the same registration, RBAC, and analytics stack.",
  },
  {
    q: "Can we self-host or bring our own cloud?",
    a: "Utsav is cloud-agnostic. We ship provider-interface adapters so you can run on our managed cloud or bring your own Postgres, storage, and auth.",
  },
  {
    q: "How is judging handled?",
    a: "Blind scoring with configurable rubrics, deadline enforcement, tie-break rules, and export-ready result sheets. Judges see only what they're assigned.",
  },
  {
    q: "Do you support certificates and QR badges?",
    a: "Auto-generated certificates with templated designs, printable QR badges, and a scan-based check-in flow that works offline for volunteers.",
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

function Landing() {
  const [q, setQ] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero + Search */}
        <section className="relative overflow-hidden bg-hero-gradient">
          <div className="container mx-auto px-4 py-20 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-3xl text-center animate-fade-up">
              <Badge
                variant="secondary"
                className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-primary"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Version 1.0 — now in early access
              </Badge>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Run unforgettable events, <span className="text-gradient-brand">the modern way.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Utsav is the operating system for hackathons, conferences, and campus fests —
                registrations, teams, judging, QR check-in, certificates, and analytics in one
                fast, beautiful platform.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href="#features">See what's inside</a>
                </Button>
              </div>

              {/* Search bar */}
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-elevated)]"
                role="search"
                aria-label="Search events"
              >
                <div className="flex flex-1 items-center gap-2 px-3">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search events, organizers, or cities"
                    className="border-0 shadow-none focus-visible:ring-0"
                    aria-label="Search events"
                  />
                </div>
                <Button type="submit" size="sm" className="rounded-xl">
                  Search
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border bg-card">
          <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:py-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured events */}
        <section className="container mx-auto px-4 py-20">
          <SectionHeading
            eyebrow="Featured"
            title="Events people are talking about"
            desc="A curated look at what's happening across the Utsav network this season."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((e) => (
              <article key={e.title} className="card-elevated card-elevated-hover overflow-hidden">
                <div
                  className={`h-40 w-full bg-gradient-to-br ${e.accent} flex items-end p-4`}
                  aria-hidden="true"
                >
                  <Badge className="bg-background/80 text-foreground backdrop-blur">
                    {e.tag}
                  </Badge>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground">{e.title}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" /> {e.date}
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" aria-hidden="true" /> {e.location}
                    </li>
                    <li className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" aria-hidden="true" /> {e.attendees}
                    </li>
                  </ul>
                  <Button variant="ghost" className="mt-4 px-0 text-primary hover:bg-transparent">
                    View event
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Upcoming events (timeline-style list) */}
        <section className="bg-secondary/40">
          <div className="container mx-auto px-4 py-20">
            <SectionHeading
              eyebrow="Coming up"
              title="Upcoming events this month"
              desc="A quick glance at what's next on the Utsav calendar."
            />
            <ol className="mt-10 space-y-3">
              {upcomingEvents.map((e, i) => (
                <li
                  key={e.title}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:flex sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
                      aria-hidden="true"
                    >
                      <span className="text-sm font-semibold">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{e.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {e.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {e.city}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0">
                    Register
                  </Button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Feature highlights */}
        <section id="features" className="container mx-auto px-4 py-20">
          <SectionHeading
            eyebrow="Platform"
            title="Everything you need. Nothing you don't."
            desc="A cohesive stack of features designed for real organizers — with the reliability enterprises demand."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card-elevated card-elevated-hover p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-secondary/40">
          <div className="container mx-auto px-4 py-20">
            <SectionHeading
              eyebrow="Loved by organizers"
              title="Teams ship better events with Utsav"
            />
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.name} className="rounded-2xl">
                  <CardContent className="pt-6">
                    <p className="text-foreground">"{t.quote}"</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground"
                        aria-hidden="true"
                      >
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Organizations */}
        <section className="container mx-auto px-4 py-20">
          <SectionHeading
            eyebrow="Trusted by"
            title="Organizations running on Utsav"
            desc="From student clubs to enterprise event teams."
          />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {orgs.map((name) => (
              <div
                key={name}
                className="flex h-16 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground transition hover:text-foreground"
              >
                {name}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-secondary/40">
          <div className="container mx-auto max-w-3xl px-4 py-20">
            <SectionHeading
              eyebrow="FAQ"
              title="Frequently asked questions"
              align="center"
            />
            <Accordion type="single" collapsible className="mt-10">
              {faqs.map((f, i) => (
                <AccordionItem key={f.q} value={`item-${i}`} className="border-border">
                  <AccordionTrigger className="text-left text-base font-medium">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-accent p-10 text-center sm:p-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to run your next event on Utsav?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
              Join hundreds of teams already shipping better events. Free to start, no credit card
              required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create your workspace
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </div>
      )}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {desc && <p className="mt-3 text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Footer() {
  const cols = [
    {
      title: "Product",
      links: ["Features", "Pricing", "Changelog", "Roadmap"],
    },
    {
      title: "Company",
      links: ["About", "Customers", "Careers", "Contact"],
    },
    {
      title: "Resources",
      links: ["Docs", "Guides", "API", "Status"],
    },
    {
      title: "Legal",
      links: ["Privacy", "Terms", "Security", "DPA"],
    },
  ];
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto grid gap-10 px-4 py-14 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground"
              aria-hidden="true"
            >
              <CalendarDays className="h-4 w-4" />
            </span>
            Utsav
          </Link>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The modern operating system for events — from campus hackathons to enterprise
            conferences.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" aria-hidden="true" /> WCAG AA accessible
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" aria-hidden="true" /> 99.99% uptime SLA
            </li>
          </ul>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-sm font-semibold text-foreground">{c.title}</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="transition hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} Utsav. All rights reserved.</div>
          <div>Made with care for event teams everywhere.</div>
        </div>
      </div>
    </footer>
  );
}
