import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEventRegistrations, updateRegistrationStatus } from "@/lib/registrations.functions";
import { getEventById } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/$id/registrations")({
  head: () => ({ meta: [{ title: "Event Registrations — Utsav" }, { name: "robots", content: "noindex" }] }),
  component: EventRegistrations,
});

function EventRegistrations() {
  const { id } = Route.useParams();
  const list = useServerFn(listEventRegistrations);
  const setStatus = useServerFn(updateRegistrationStatus);
  const getEv = useServerFn(getEventById);
  const qc = useQueryClient();

  const ev = useQuery({ queryKey: ["event", id], queryFn: () => getEv({ data: { id } }) });
  const q = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: () => list({ data: { event_id: id } }),
  });

  const mut = useMutation({
    mutationFn: (v: { registration_id: string; status: "registered" | "waitlist" | "cancelled" | "checked_in" | "no_show" }) =>
      setStatus({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["event-registrations", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = q.data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  function exportCsv() {
    const header = ["name", "email", "status", "payment_status", "team_id", "checked_in_at", "created_at"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const u = r.user as unknown as { full_name: string | null; email: string | null } | null;
      lines.push([
        JSON.stringify(u?.full_name ?? ""),
        JSON.stringify(u?.email ?? ""),
        r.status,
        r.payment_status,
        r.team_id ?? "",
        r.checked_in_at ?? "",
        r.created_at,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Link to="/events/$id/manage" params={{ id }} className="text-sm text-muted-foreground hover:underline">
        ← Back to manage
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registrations</h1>
          {ev.data && <p className="text-sm text-muted-foreground">{ev.data.title}</p>}
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {["registered", "waitlist", "checked_in", "cancelled", "no_show"].map((s) => (
          <Card key={s}>
            <CardContent className="py-4">
              <div className="text-xs uppercase text-muted-foreground">{s.replace("_", " ")}</div>
              <div className="mt-1 text-2xl font-bold">{counts[s] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Attendees ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!q.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          )}
          <div className="divide-y">
            {rows.map((r) => {
              const u = r.user as unknown as { full_name: string | null; email: string | null; avatar_url: string | null } | null;
              return (
                <div key={r.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted" />
                    <div>
                      <div className="text-sm font-medium">{u?.full_name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{u?.email ?? ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.payment_status}</Badge>
                    <Select
                      value={r.status}
                      onValueChange={(v) =>
                        mut.mutate({
                          registration_id: r.id,
                          status: v as "registered" | "waitlist" | "cancelled" | "checked_in" | "no_show",
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["registered", "waitlist", "checked_in", "cancelled", "no_show"].map((s) => (
                          <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {r.status !== "checked_in" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mut.mutate({ registration_id: r.id, status: "checked_in" })}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Check in
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
