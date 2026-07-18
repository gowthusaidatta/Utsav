import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublicEvents } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Sparkles } from "lucide-react";

const publicEventsOptions = queryOptions({
  queryKey: ["public-events"],
  queryFn: () => listPublicEvents({ data: { limit: 48 } }),
});

export const Route = createFileRoute("/events/")({
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
  loader: ({ context }) => context.queryClient.ensureQueryData(publicEventsOptions),
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
  const { data } = useSuspenseQuery(publicEventsOptions);
  const events = data.events;

  return (
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

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No published events yet — check back soon.
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
                    {e.is_online ? "Online" : e.venue ?? "Venue TBA"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
