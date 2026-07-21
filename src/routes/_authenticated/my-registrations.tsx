import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { myRegistrations, cancelRegistration } from "@/lib/registrations.functions";
import { regenerateMyQr } from "@/lib/attendance.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Ticket, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ListSkeleton } from "@/components/EmptyState";
import { RegistrationQR } from "@/components/RegistrationQR";



export const Route = createFileRoute("/_authenticated/my-registrations")({
  head: () => ({ meta: [{ title: "My Registrations — Utsav" }] }),
  component: MyRegs,
});

function statusBadge(s: string) {
  const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    registered: "default",
    waitlist: "secondary",
    checked_in: "default",
    cancelled: "outline",
    no_show: "destructive",
  };
  return map[s] ?? "outline";
}

function MyRegs() {
  const list = useServerFn(myRegistrations);
  const cancel = useServerFn(cancelRegistration);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["my-registrations"], queryFn: () => list() });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancel({ data: { registration_id: id } }),
    onSuccess: () => {
      toast.success("Registration cancelled");
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        icon={<Ticket className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "My registrations" },
        ]}
        title="My registrations"
        subtitle="Track events you've signed up for."
      />

      <div className="mt-2 space-y-3">
        {q.isLoading && <ListSkeleton rows={3} />}
        {q.data && q.data.length === 0 && (
          <EmptyState
            icon={<Calendar className="h-5 w-5" />}
            title="No registrations yet"
            description="Browse events and sign up to see them here."
            action={
              <Button asChild size="sm">
                <Link to="/events">Browse events</Link>
              </Button>
            }
          />
        )}
        {q.data?.map((r) => <RegRow key={r.id} reg={r} onCancel={() => cancelM.mutate(r.id)} cancelling={cancelM.isPending} />)}

      </div>
    </main>
  );
}

type Reg = {
  id: string;
  status: string;
  payment_status: string;
  qr_token: string | null;
  qr_revoked_at: string | null;
  checked_in_at: string | null;
  event: unknown;
};

function RegRow({ reg, onCancel, cancelling }: { reg: Reg; onCancel: () => void; cancelling: boolean }) {
  const [showQR, setShowQR] = useState(false);
  const ev = reg.event as { slug: string; title: string; start_at: string | null } | null;
  const regenFn = useServerFn(regenerateMyQr);
  const qc = useQueryClient();
  const canShowQR = reg.status === "registered" || reg.status === "checked_in";
  const regen = useMutation({
    mutationFn: () => regenFn({ data: { registration_id: reg.id } }),
    onSuccess: () => {
      toast.success("QR regenerated");
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge(reg.status)}>{reg.status.replace("_", " ")}</Badge>
              {reg.payment_status !== "not_required" && (
                <Badge variant="outline">Payment: {reg.payment_status}</Badge>
              )}
              {reg.checked_in_at && <Badge variant="secondary">Checked-in</Badge>}
            </div>
            <div className="mt-2 font-medium">{ev?.title ?? "Event"}</div>
            <div className="text-xs text-muted-foreground">
              {ev?.start_at ? new Date(ev.start_at).toLocaleString() : "Date TBA"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ev?.slug && (
              <Link
                to="/events/$slug"
                params={{ slug: ev.slug }}
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
              >
                View
              </Link>
            )}
            {canShowQR && reg.qr_token && (
              <Button variant="outline" size="sm" onClick={() => setShowQR((s) => !s)}>
                <QrCode className="mr-1 h-4 w-4" />
                {showQR ? "Hide pass" : "Show pass"}
              </Button>
            )}
            {reg.status !== "cancelled" && reg.status !== "checked_in" && (
              <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        {showQR && reg.qr_token && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <RegistrationQR token={reg.qr_token} title={ev?.title ?? "Event pass"} />
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => regen.mutate()} disabled={regen.isPending}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Regenerate token
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

