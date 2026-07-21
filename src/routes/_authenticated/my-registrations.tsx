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
