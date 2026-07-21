import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  eventAttendanceStats,
  listAttendanceLog,
  manualCheckIn,
  undoCheckIn,
  searchEventRegistrations,
} from "@/lib/attendance.functions";
import { listEventRegistrations } from "@/lib/registrations.functions";
import { getEventById } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { ClipboardCheck, ScanLine, RotateCcw, Search, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$id/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Utsav" }, { name: "robots", content: "noindex" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getEvent = useServerFn(getEventById);
  const stats = useServerFn(eventAttendanceStats);
  const logs = useServerFn(listAttendanceLog);
  const listRegs = useServerFn(listEventRegistrations);
  const doManual = useServerFn(manualCheckIn);
  const doUndo = useServerFn(undoCheckIn);
  const doSearch = useServerFn(searchEventRegistrations);

  const eventQ = useQuery({ queryKey: ["event", id], queryFn: () => getEvent({ data: { id } }) });
  const statsQ = useQuery({
    queryKey: ["att-stats", id],
    queryFn: () => stats({ data: { event_id: id } }),
    refetchInterval: 8000,
  });
  const logsQ = useQuery({ queryKey: ["att-logs", id], queryFn: () => logs({ data: { event_id: id, limit: 50 } }) });
  const regsQ = useQuery({ queryKey: ["event-regs", id], queryFn: () => listRegs({ data: { event_id: id } }) });

  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof doSearch>> | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["att-stats", id] });
    qc.invalidateQueries({ queryKey: ["att-logs", id] });
    qc.invalidateQueries({ queryKey: ["event-regs", id] });
  };

  const manualM = useMutation({
    mutationFn: (rid: string) => doManual({ data: { registration_id: rid } }),
    onSuccess: () => {
      toast.success("Marked present");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const undoM = useMutation({
    mutationFn: (rid: string) => doUndo({ data: { registration_id: rid } }),
    onSuccess: () => {
      toast.success("Attendance reverted");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function runSearch() {
    if (q.trim().length < 1) return;
    try {
      const r = await doSearch({ data: { event_id: id, q: q.trim() } });
      setSearchResults(r);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function exportCsv() {
    const regs = regsQ.data ?? [];
    const rows = [
      ["Name", "Email", "Status", "Checked in at"],
      ...regs.map((r) => [
        r.user?.full_name ?? "",
        r.user?.email ?? "",
        r.status,
        r.checked_in_at ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = statsQ.data;
  const attendancePct = s && s.registered > 0 ? Math.round((s.checked_in / s.registered) * 100) : 0;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "My events", to: "/my-events" },
          { label: eventQ.data?.title ?? "Event" },
        ]}
        title="Attendance"
        subtitle="Live check-in monitoring, manual entry, and audit log."
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/scan"><ScanLine className="mr-2 h-4 w-4" />Open scanner</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
          </div>
        }
      />

      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Registered" value={s?.registered ?? 0} />
        <Stat label="Checked in" value={s?.checked_in ?? 0} accent="emerald" />
        <Stat label="Pending" value={s?.pending ?? 0} />
        <Stat label="Walk-ins" value={s?.walk_ins ?? 0} />
        <Stat label="No-show" value={s?.no_show ?? 0} />
        <Stat label="Attendance %" value={`${attendancePct}%`} accent="indigo" />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Search & manual check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
            >
              <Input placeholder="Search by name, email or username" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button type="submit" size="sm"><Search className="mr-2 h-4 w-4" />Search</Button>
            </form>
            <div className="mt-4 space-y-2">
              {searchResults?.map((r) => (
                <div key={r.profile.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{r.profile.full_name ?? r.profile.username}</div>
                    <div className="text-xs text-muted-foreground">{r.profile.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.registration?.checked_in_at ? (
                      <Badge variant="secondary">Checked in</Badge>
                    ) : (
                      <Button size="sm" onClick={() => r.registration && manualM.mutate(r.registration.id)}>
                        Check in
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {searchResults?.length === 0 && <div className="text-sm text-muted-foreground">No matches.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-2 overflow-auto text-xs">
              {logsQ.data?.length === 0 && <div className="text-muted-foreground">No events yet.</div>}
              {logsQ.data?.map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b py-1.5">
                  <div>
                    <span className="font-medium">{l.action}</span>
                    <span className="ml-1 text-muted-foreground">via {l.method}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">All registrations</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2">Name</th><th>Email</th><th>Status</th><th>Checked in</th><th></th></tr>
              </thead>
              <tbody>
                {regsQ.data?.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.user?.full_name ?? "—"}</td>
                    <td>{r.user?.email ?? "—"}</td>
                    <td><Badge variant={r.status === "checked_in" ? "default" : "outline"}>{r.status}</Badge></td>
                    <td>{r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "—"}</td>
                    <td className="text-right">
                      {r.checked_in_at ? (
                        <Button variant="ghost" size="sm" onClick={() => undoM.mutate(r.id)}>
                          <RotateCcw className="mr-1 h-3 w-3" />Undo
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => manualM.mutate(r.id)}>
                          Mark
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: "emerald" | "indigo" }) {
  const cls =
    accent === "emerald" ? "text-emerald-600" : accent === "indigo" ? "text-indigo-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
