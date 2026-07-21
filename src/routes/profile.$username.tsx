import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getPublicProfile, type PublicProfileResult } from "@/lib/public-profile.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileShape = {
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  college?: string | null;
  department?: string | null;
  designation?: string | null;
  current_position?: string | null;
  organization_name?: string | null;
  technical_skills?: string[] | null;
  soft_skills?: string[] | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  personal_website?: string | null;
  portfolio_url?: string | null;
};

export const Route = createFileRoute("/profile/$username")({
  loader: async ({ params }) => {
    const res = (await getPublicProfile({ data: { username: params.username } })) as PublicProfileResult;
    if (res.not_found) {
      if (res.redirect_to) throw redirect({ to: "/profile/$username", params: { username: res.redirect_to } });
      throw notFound();
    }
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData || loaderData.not_found) return { meta: [{ title: "Profile — Utsav" }] };
    if (loaderData.private) {
      return { meta: [{ title: `@${loaderData.username} — Utsav` }] };
    }
    const p = loaderData.profile as ProfileShape;
    const name = p.display_name || p.full_name || p.username || "Utsav profile";
    return {
      meta: [
        { title: `${name} — Utsav` },
        { name: "description", content: p.bio?.slice(0, 160) || `${name}'s public Utsav profile.` },
        { property: "og:title", content: `${name} — Utsav` },
        { property: "og:description", content: p.bio?.slice(0, 160) || "" },
        { property: "og:type", content: "profile" },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Profile not found</h1>
      <p className="mt-2 text-muted-foreground">No public profile matches this username.</p>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </main>
  ),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const data = Route.useLoaderData();
  if (data.not_found) return null;
  if (data.private) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">@{data.username}</h1>
        <p className="mt-2 text-muted-foreground">This profile is private.</p>
      </main>
    );
  }
  const p = data.profile as ProfileShape;
  const name = p.display_name || p.full_name || p.username || "";
  const initials = (name || "?").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <main className="pb-16">
      <div className="h-48 w-full bg-gradient-to-br from-primary/20 via-primary/5 to-accent/20" style={p.cover_url ? { backgroundImage: `url(${p.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
      <div className="container mx-auto max-w-4xl px-4 -mt-16 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-background shadow">
                {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={name} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
                {p.username ? <p className="text-sm text-muted-foreground">@{p.username}</p> : null}
                {(p.current_position || p.designation) && (
                  <p className="mt-1 text-sm">
                    {p.current_position || p.designation}
                    {p.organization_name ? ` · ${p.organization_name}` : ""}
                  </p>
                )}
                {(p.college || p.department) && (
                  <p className="text-sm text-muted-foreground">
                    {[p.college, p.department].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {p.bio ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{p.bio}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {p.linkedin_url ? <a className="text-primary hover:underline" href={p.linkedin_url} target="_blank" rel="noreferrer noopener">LinkedIn</a> : null}
              {p.github_url ? <a className="text-primary hover:underline" href={p.github_url} target="_blank" rel="noreferrer noopener">GitHub</a> : null}
              {p.twitter_url ? <a className="text-primary hover:underline" href={p.twitter_url} target="_blank" rel="noreferrer noopener">Twitter</a> : null}
              {p.personal_website ? <a className="text-primary hover:underline" href={p.personal_website} target="_blank" rel="noreferrer noopener">Website</a> : null}
              {p.portfolio_url ? <a className="text-primary hover:underline" href={p.portfolio_url} target="_blank" rel="noreferrer noopener">Portfolio</a> : null}
            </div>
          </CardContent>
        </Card>

        {p.technical_skills && p.technical_skills.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-medium text-muted-foreground">Technical skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.technical_skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {p.soft_skills && p.soft_skills.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-medium text-muted-foreground">Soft skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.soft_skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
