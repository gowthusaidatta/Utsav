import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getEventBySlug } from "@/lib/events.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, IndianRupee, Globe } from "lucide-react";

const eventBySlug = (slug: string) =>
  queryOptions({
    queryKey: ["event", slug],
    queryFn: () => getEventBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(eventBySlug(params.slug));
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Event unavailable — Utsav" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const e = loaderData.event;
    const desc = (e.description ?? `${e.title} on Utsav`).slice(0, 160);
    const meta = [
      { title: `${e.title} — Utsav` },
      { name: "description", content: desc },
      { property: "og:title", content: e.title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (e.cover_image_url) {
      meta.push({ property: "og:image", content: e.cover_image_url });
      meta.push({ name: "twitter:image", content: e.cover_image_url });
    }
    return { meta };
  },
  notFoundComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Event not found</h1>
      <p className="mt-2 text-muted-foreground">
        This event doesn't exist, isn't published, or is private.
      </p>
    </main>
  ),
  component: EventDetail,
});

function fmt(iso: string | null) {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventDetail() {
  const { slug } = Route.useParams();
  const { data: e } = useSuspenseQuery(eventBySlug(slug));
  if (!e) return null;

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      {e.cover_image_url && (
        <div className="mb-6 aspect-[16/7] overflow-hidden rounded-2xl bg-muted">
          <img src={e.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {e.category && <Badge variant="secondary">{e.category}</Badge>}
        {e.tags?.map((t: string) => (
          <Badge key={t} variant="outline">
            #{t}
          </Badge>
        ))}
      </div>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{e.title}</h1>
      {e.description && (
        <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{e.description}</p>
      )}

      <Card className="mt-8">
        <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Starts" value={fmt(e.start_at)} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Ends" value={fmt(e.end_at)} />
          <InfoRow
            icon={e.is_online ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            label={e.is_online ? "Online" : "Venue"}
            value={e.is_online ? "Virtual event" : e.venue ?? "TBA"}
          />
          <InfoRow
            icon={<Users className="h-4 w-4" />}
            label="Capacity"
            value={e.capacity ? `${e.capacity} seats` : "Unlimited"}
          />
          <InfoRow
            icon={<IndianRupee className="h-4 w-4" />}
            label="Price"
            value={e.is_paid ? `${e.currency} ${e.price}` : "Free"}
          />
          <InfoRow
            icon={<Clock className="h-4 w-4" />}
            label="Register by"
            value={fmt(e.registration_deadline)}
          />
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-3">
        <Link
          to="/events/$slug/register"
          params={{ slug: e.slug }}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Register
        </Link>
        <Button size="lg" variant="outline" onClick={() => navigator.share?.({ title: e.title, url: window.location.href }).catch(() => {})}>
          Share
        </Button>
      </div>
    </main>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
