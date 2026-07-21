import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { listPublicEvents } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Sparkles, Search } from "lucide-react";
import { BackBar } from "@/components/BackBar";

const searchSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  category: z.string().trim().max(64).optional().catch(undefined),
});

const publicEventsOptions = (params: { q?: string; category?: string }) =>
  queryOptions({
    queryKey: ["public-events", params.q ?? "", params.category ?? ""],
    queryFn: () =>
      listPublicEvents({
        data: { limit: 48, q: params.q || undefined, category: params.category || undefined },
      }),
  });

export const Route = createFileRoute("/events/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q, category: search.category }),
  head: () => ({
    meta: [
      { title: "Browse Events — Utsav" },
      {
        name: "description",
        content:
          "Discover hackathons, workshops, cultural fests, and technical events on Utsav.",
      },
      { property: "og:title", content: "Browse Events — Utsav" },
      {
        property: "og:description",
        content: "Discover published events across colleges and organizations on Utsav.",
      },
    ],
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(publicEventsOptions(deps)),
  component: EventsIndex,
});

function formatDate(iso: string | null) {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventsIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(search.q ?? "");
  const [category, setCategory] = useState(search.category ?? "");

  const query = useQuery(publicEventsOptions({ q: search.q, category: search.category }));
  const events = query.data?.events ?? [];

  function apply(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      search: {
        q: q.trim() || undefined,
        category: category.trim() || undefined,
      },
    });
  }

  return (
    <>
    <BackBar />
    <main className="container mx-auto px-4 py-10">
      <header className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Live on Utsav
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Browse events</h1>
        <p className="max-w-2xl text-muted-foreground">
          Hackathons, workshops, fests, meetups and more from communities everywhere.
        </p>
      </header>

      <form onSubmit={apply} className="mb-6 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, keywords, descriptions…"
            className="pl-9"
            maxLength={120}
          />
        </div>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. hackathon)"
          maxLength={64}
        />
        <div className="flex gap-2">
          <Button type="submit">Search</Button>
          {(search.q || search.category) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQ("");
                setCategory("");
                navigate({ search: {} });
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search.q || search.category
              ? "No events match your search."
              : "No published events yet — check back soon."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.id}
              to="/events/$slug"
              params={{ slug: e.slug }}
              className="group focus:outline-none"
            >
              <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                {e.cover_image_url && (
                  <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-muted">
                    <img
                      src={e.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    {e.category && <Badge variant="secondary">{e.category}</Badge>}
                    {e.is_paid ? (
                      <Badge>Paid</Badge>
                    ) : (
                      <Badge variant="outline">Free</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg leading-snug">{e.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> {formatDate(e.start_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />{" "}
                    {e.is_online ? "Online" : (e.venue ?? "Venue TBA")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
    </>
  );
}
