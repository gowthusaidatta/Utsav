import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getPublicProfile, type PublicProfileResult } from "@/lib/public-profile.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";

type EducationItem = {
  id: string;
  institution: string;
  degree?: string | null;
  course?: string | null;
  branch?: string | null;
  specialization?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currently_studying?: boolean;
  cgpa?: number | null;
  percentage?: number | null;
  achievements?: string | null;
  description?: string | null;
};

type PursuitItem = {
  id: string;
  type: string;
  title: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  credential_url?: string | null;
  description?: string | null;
  skills?: string[] | null;
  badge_url?: string | null;
};

type CertificateItem = {
  id: string;
  code: string;
  title?: string | null;
  template_key?: string | null;
  issued_at: string;
  event_id: string;
  event_title?: string | null;
  event_slug?: string | null;
  role?: string | null;
  position?: string | null;
  rank?: number | null;
  score?: number | null;
};

type ProfileShape = {
  id?: string | null;
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
  current_year?: string | null;
  experience_years?: number | null;
  technical_skills?: string[] | null;
  soft_skills?: string[] | null;
  languages?: string[] | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  personal_website?: string | null;
  portfolio_url?: string | null;
  leetcode_username?: string | null;
  codeforces_username?: string | null;
  codechef_username?: string | null;
  hackerrank_username?: string | null;
  gfg_username?: string | null;
  researchgate_url?: string | null;
  orcid?: string | null;
  resume_url?: string | null;
  email?: string | null;
  phone?: string | null;
  joined_at?: string | null;
  education?: EducationItem[] | null;
  pursuits?: PursuitItem[] | null;
  certificates?: CertificateItem[] | null;
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
    const desc = p.bio?.slice(0, 160) || `${name}'s public Utsav profile.`;
    const meta: Array<Record<string, string>> = [
      { title: `${name} — Utsav` },
      { name: "description", content: desc },
      { property: "og:title", content: `${name} — Utsav` },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "twitter:card", content: "summary_large_image" },
    ];
    if (p.avatar_url) {
      meta.push({ property: "og:image", content: p.avatar_url });
      meta.push({ property: "twitter:image", content: p.avatar_url });
    }
    return { meta };
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
  const education = p.education ?? [];
  const pursuits = p.pursuits ?? [];
  const certificates = p.certificates ?? [];

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Profile link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <main className="pb-16">
      <div
        className="h-48 w-full bg-gradient-to-br from-primary/20 via-primary/5 to-accent/20"
        style={p.cover_url ? { backgroundImage: `url(${p.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="mr-1 h-4 w-4" /> Copy link
                </Button>
              </div>
            </div>
            {p.bio ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{p.bio}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {p.linkedin_url ? <a className="text-primary hover:underline" href={p.linkedin_url} target="_blank" rel="noreferrer noopener">LinkedIn</a> : null}
              {p.github_url ? <a className="text-primary hover:underline" href={p.github_url} target="_blank" rel="noreferrer noopener">GitHub</a> : null}
              {p.twitter_url ? <a className="text-primary hover:underline" href={p.twitter_url} target="_blank" rel="noreferrer noopener">Twitter</a> : null}
              {p.personal_website ? <a className="text-primary hover:underline" href={p.personal_website} target="_blank" rel="noreferrer noopener">Website</a> : null}
              {p.portfolio_url ? <a className="text-primary hover:underline" href={p.portfolio_url} target="_blank" rel="noreferrer noopener">Portfolio</a> : null}
              {p.leetcode_username ? <a className="text-primary hover:underline" href={`https://leetcode.com/${p.leetcode_username}`} target="_blank" rel="noreferrer noopener">LeetCode</a> : null}
              {p.codeforces_username ? <a className="text-primary hover:underline" href={`https://codeforces.com/profile/${p.codeforces_username}`} target="_blank" rel="noreferrer noopener">Codeforces</a> : null}
              {p.codechef_username ? <a className="text-primary hover:underline" href={`https://codechef.com/users/${p.codechef_username}`} target="_blank" rel="noreferrer noopener">CodeChef</a> : null}
              {p.hackerrank_username ? <a className="text-primary hover:underline" href={`https://hackerrank.com/${p.hackerrank_username}`} target="_blank" rel="noreferrer noopener">HackerRank</a> : null}
              {p.gfg_username ? <a className="text-primary hover:underline" href={`https://auth.geeksforgeeks.org/user/${p.gfg_username}`} target="_blank" rel="noreferrer noopener">GeeksforGeeks</a> : null}
              {p.researchgate_url ? <a className="text-primary hover:underline" href={p.researchgate_url} target="_blank" rel="noreferrer noopener">ResearchGate</a> : null}
              {p.orcid ? <span className="text-muted-foreground">ORCID: {p.orcid}</span> : null}
              {p.email ? <a className="text-primary hover:underline" href={`mailto:${p.email}`}>{p.email}</a> : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Certificates" value={certificates.length} />
          <StatCard label="Education" value={education.length} />
          <StatCard label="Pursuits" value={pursuits.length} />
          <StatCard label="Skills" value={(p.technical_skills?.length ?? 0) + (p.soft_skills?.length ?? 0)} />
        </div>

        {(p.technical_skills?.length ?? 0) + (p.soft_skills?.length ?? 0) > 0 ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {p.technical_skills && p.technical_skills.length > 0 ? (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground">Technical skills</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.technical_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
              ) : null}
              {p.soft_skills && p.soft_skills.length > 0 ? (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground">Soft skills</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.soft_skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {education.length > 0 ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Education</h2>
            <div className="space-y-3">
              {education.map((e) => (
                <Card key={e.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{e.institution}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[e.degree, e.course, e.branch, e.specialization].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.start_date || "—"} – {e.currently_studying ? "Present" : e.end_date || "—"}
                      {e.cgpa != null ? ` · CGPA ${e.cgpa}` : ""}
                      {e.percentage != null ? ` · ${e.percentage}%` : ""}
                    </p>
                    {e.description ? <p className="mt-2 text-sm whitespace-pre-wrap">{e.description}</p> : null}
                    {e.achievements ? <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">🏆 {e.achievements}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {pursuits.length > 0 ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Certifications & pursuits</h2>
            <div className="space-y-3">
              {pursuits.map((it) => (
                <Card key={it.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{it.title}</h3>
                      <Badge variant="secondary">{it.type}</Badge>
                    </div>
                    {it.issuing_organization ? (
                      <p className="text-sm text-muted-foreground">{it.issuing_organization}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">{it.issue_date || ""}</p>
                    {it.description ? <p className="mt-2 text-sm whitespace-pre-wrap">{it.description}</p> : null}
                    {it.skills && it.skills.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {it.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                      </div>
                    ) : null}
                    {it.credential_url ? (
                      <a className="mt-2 inline-block text-xs text-primary hover:underline" href={it.credential_url} target="_blank" rel="noreferrer noopener">Credential →</a>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {certificates.length > 0 ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Event certificates</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {certificates.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold truncate">{c.title || c.event_title || "Certificate"}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.event_title ?? ""}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {new Date(c.issued_at).toLocaleDateString()}
                      {c.role ? ` · ${c.role}` : ""}
                      {c.position ? ` · ${c.position}` : ""}
                      {c.rank != null ? ` · Rank #${c.rank}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-mono">{c.code}</p>
                    <a
                      href={`/verify/${c.code}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verify
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
