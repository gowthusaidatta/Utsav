import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getTeam, leaveTeam, removeTeamMember } from "@/lib/teams.functions";
import {
  inviteToTeam,
  listTeamInvites,
  revokeInvite,
  transferLeadership,
} from "@/lib/team-invites.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Users, UserPlus, Crown, X } from "lucide-react";
import { toast } from "sonner";
import { RegistrationQR } from "@/components/RegistrationQR";

export const Route = createFileRoute("/_authenticated/teams/$id")({
  head: () => ({ meta: [{ title: "Team — Utsav" }, { name: "robots", content: "noindex" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getT = useServerFn(getTeam);
  const invites = useServerFn(listTeamInvites);
  const invite = useServerFn(inviteToTeam);
  const revoke = useServerFn(revokeInvite);
  const remove = useServerFn(removeTeamMember);
  const leave = useServerFn(leaveTeam);
  const transfer = useServerFn(transferLeadership);

  const teamQ = useQuery({ queryKey: ["team", id], queryFn: () => getT({ data: { team_id: id } }) });
  const invQ = useQuery({ queryKey: ["team-invites", id], queryFn: () => invites({ data: { team_id: id } }) });

  const [inviteInput, setInviteInput] = useState("");
  const [inviteMode, setInviteMode] = useState<"username" | "email">("username");

  const inviteM = useMutation({
    mutationFn: () =>
      invite({
        data: {
          team_id: id,
          [inviteMode]: inviteInput.trim(),
        } as { team_id: string; username?: string; email?: string },
      }),
    onSuccess: () => {
      toast.success("Invite sent");
      setInviteInput("");
      qc.invalidateQueries({ queryKey: ["team-invites", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (teamQ.isLoading) return <main className="container mx-auto px-4 py-10">Loading…</main>;
  const team = teamQ.data;
  if (!team) return <main className="container mx-auto px-4 py-10">Team not found.</main>;

  const members = ((team.members ?? []) as unknown) as Array<{
    id: string;
    user_id: string;
    role: string;
    status: string;
    profile: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
  }>;

  const activeMembers = members.filter((m) => m.status === "active");

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "My registrations", to: "/my-registrations" },
          { label: team.name },
        ]}
        title={team.name}
        subtitle={team.description ?? "Team dashboard"}
        actions={
          <Button variant="outline" size="sm" onClick={() => leave({ data: { team_id: id } }).then(() => toast.success("Left team"))}>
            Leave team
          </Button>
        }
      />

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">Members</div><div className="text-2xl font-bold">{activeMembers.length}/{team.max_size}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">Invite code</div><div className="font-mono text-lg">{team.invite_code}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-muted-foreground">Status</div><Badge>{team.status}</Badge></CardContent></Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {m.role === "leader" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    {m.profile?.full_name ?? "Member"}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
                </div>
                <div className="flex gap-1">
                  {m.user_id === team.leader_user_id ? null : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          transfer({ data: { team_id: id, new_leader_id: m.user_id } })
                            .then(() => {
                              toast.success("Leadership transferred");
                              qc.invalidateQueries({ queryKey: ["team", id] });
                            })
                            .catch((e) => toast.error((e as Error).message))
                        }
                      >
                        Make leader
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          remove({ data: { team_id: id, user_id: m.user_id } })
                            .then(() => qc.invalidateQueries({ queryKey: ["team", id] }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base"><UserPlus className="mr-2 inline h-4 w-4" />Invite</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setInviteMode("username")}
                className={`rounded px-2 py-1 ${inviteMode === "username" ? "bg-primary text-primary-foreground" : "border"}`}
              >
                Username
              </button>
              <button
                onClick={() => setInviteMode("email")}
                className={`rounded px-2 py-1 ${inviteMode === "email" ? "bg-primary text-primary-foreground" : "border"}`}
              >
                Email
              </button>
            </div>
            <div>
              <Label htmlFor="inv">{inviteMode === "username" ? "Username" : "Email"}</Label>
              <Input id="inv" value={inviteInput} onChange={(e) => setInviteInput(e.target.value)} />
            </div>
            <Button size="sm" disabled={inviteInput.trim().length < 2 || inviteM.isPending} onClick={() => inviteM.mutate()}>
              Send invite
            </Button>

            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Pending invites</div>
              <div className="space-y-1.5 text-sm">
                {invQ.data?.filter((i) => i.status === "pending").map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                    <span>{i.invited_username ?? i.invited_email}</span>
                    <Button variant="ghost" size="sm" onClick={() => revoke({ data: { invite_id: i.id } }).then(() => qc.invalidateQueries({ queryKey: ["team-invites", id] }))}>
                      Revoke
                    </Button>
                  </div>
                ))}
                {invQ.data?.filter((i) => i.status === "pending").length === 0 && (
                  <div className="text-xs text-muted-foreground">No pending invites.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Team invite link</CardTitle></CardHeader>
        <CardContent>
          <RegistrationQR
            token={team.invite_code}
            title={team.name}
            subtitle="Scan to join this team"
            size={200}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Or share code: <span className="font-mono">{team.invite_code}</span>. Members join via the event's Register → Join Team tab.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
