import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getEventBySlug } from "@/lib/events.functions";
import { registerForEvent } from "@/lib/registrations.functions";
import { createTeam, joinTeamByCode, listEventTeams } from "@/lib/teams.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, UserPlus, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/$slug/register")({
  head: () => ({ meta: [{ title: "Register — Utsav" }, { name: "robots", content: "noindex" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const getEvent = useServerFn(getEventBySlug);
  const register = useServerFn(registerForEvent);
  const doCreateTeam = useServerFn(createTeam);
  const doJoinTeam = useServerFn(joinTeamByCode);
  const listTeams = useServerFn(listEventTeams);

  const eventQ = useQuery({ queryKey: ["event", slug], queryFn: () => getEvent({ data: { slug } }) });
  const event = eventQ.data;

  const teamsQ = useQuery({
    queryKey: ["event-teams", event?.id],
    queryFn: () => listTeams({ data: { event_id: event!.id } }),
    enabled: !!event?.id,
  });

  const [notes, setNotes] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const soloMutation = useMutation({
    mutationFn: () => register({ data: { event_id: event!.id, notes: notes || undefined } }),
    onSuccess: (r) => {
      toast.success(r.status === "waitlist" ? "You're on the waitlist" : "Registered!");
      navigate({ to: "/my-registrations" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const teamMutation = useMutation({
    mutationFn: async () => {
      const team = await doCreateTeam({ data: { event_id: event!.id, name: teamName, description: teamDesc || undefined } });
      await register({ data: { event_id: event!.id, team_id: team.id, notes: notes || undefined } });
      return team;
    },
    onSuccess: (t) => {
      toast.success(`Team created — share invite code: ${t.invite_code}`);
      navigate({ to: "/my-registrations" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const t = await doJoinTeam({ data: { invite_code: inviteCode.trim() } });
      await register({ data: { event_id: t.event_id, team_id: t.team_id, notes: notes || undefined } });
      return t;
    },
    onSuccess: () => {
      toast.success("Joined team and registered!");
      navigate({ to: "/my-registrations" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (eventQ.isLoading) return <main className="container mx-auto px-4 py-10">Loading…</main>;
  if (!event) return <main className="container mx-auto px-4 py-10">Event not found.</main>;

  const busy = soloMutation.isPending || teamMutation.isPending || joinMutation.isPending;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Link to="/events/$slug" params={{ slug }} className="text-sm text-muted-foreground hover:underline">
        ← Back to event
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Register for {event.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {event.is_paid ? `${event.currency} ${event.price} — payment via organizer` : "Free registration"}
        {event.capacity ? ` · Capacity ${event.capacity}` : ""}
      </p>

      <Tabs defaultValue="solo" className="mt-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="solo"><User className="mr-2 h-4 w-4" />Solo</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Create Team</TabsTrigger>
          <TabsTrigger value="join"><UserPlus className="mr-2 h-4 w-4" />Join Team</TabsTrigger>
        </TabsList>

        <TabsContent value="solo">
          <Card>
            <CardHeader><CardTitle>Register as an individual</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dietary needs, accessibility, etc." />
              </div>
              <Button disabled={busy} onClick={() => soloMutation.mutate()}>Confirm registration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader><CardTitle>Create a team</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tname">Team name</Label>
                <Input id="tname" value={teamName} onChange={(e) => setTeamName(e.target.value)} required minLength={2} />
              </div>
              <div>
                <Label htmlFor="tdesc">Description (optional)</Label>
                <Textarea id="tdesc" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} />
              </div>
              <Button disabled={busy || teamName.trim().length < 2} onClick={() => teamMutation.mutate()}>
                Create team & register
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join">
          <Card>
            <CardHeader><CardTitle>Join with invite code</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="code">Invite code</Label>
                <Input id="code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="e.g. a1b2c3d4" />
              </div>
              <Button disabled={busy || inviteCode.trim().length < 4} onClick={() => joinMutation.mutate()}>
                Join team & register
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {teamsQ.data && teamsQ.data.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Existing teams ({teamsQ.data.length})</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {teamsQ.data.map((t) => (
              <Card key={t.id}>
                <CardContent className="py-4">
                  <div className="font-medium">{t.name}</div>
                  {t.description && <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t.members?.[0]?.count ?? 0}/{t.max_size} members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
