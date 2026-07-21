import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createEvent } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "New Event — Utsav" }] }),
  component: NewEvent,
});

function NewEvent() {
  const router = useRouter();
  const fn = useServerFn(createEvent);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    venue: "",
    start_at: "",
    end_at: "",
    capacity: "",
    is_online: false,
    is_paid: false,
    price: "",
    registration_type: "individual" as "individual" | "team",
    min_team_size: "2",
    max_team_size: "4",
    max_teams: "",
    attendance_rule: "member" as "member" | "leader" | "all_members" | "any_member",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.registration_type === "team") {
      const min = Number(form.min_team_size);
      const max = Number(form.max_team_size);
      if (!(min >= 2)) return toast.error("Minimum team size must be at least 2");
      if (!(max >= min)) return toast.error("Max team size must be ≥ min");
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        category: form.category || undefined,
        venue: form.venue || undefined,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : undefined,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        is_online: form.is_online,
        is_paid: form.is_paid,
        price: form.is_paid && form.price ? Number(form.price) : 0,
        registration_type: form.registration_type,
        min_team_size: form.registration_type === "team" ? Number(form.min_team_size) : undefined,
        max_team_size: form.registration_type === "team" ? Number(form.max_team_size) : undefined,
        max_teams: form.registration_type === "team" && form.max_teams ? Number(form.max_teams) : undefined,
        attendance_rule: form.attendance_rule,
      };
      const res = await fn({ data: payload });
      toast.success("Event created as draft");
      router.navigate({ to: "/events/$id/manage", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setBusy(false);
    }
  }


  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a new event</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Title" required>
              <Input
                required
                minLength={3}
                maxLength={160}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={4}
                maxLength={10000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Input
                  placeholder="Hackathon, workshop, fest…"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </Field>
              <Field label="Capacity">
                <Input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </Field>
              <Field label="Start">
                <Input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                />
              </Field>
              <Field label="End">
                <Input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_online}
                  onChange={(e) => setForm({ ...form, is_online: e.target.checked })}
                />
                Online event
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_paid}
                  onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                />
                Paid event
              </label>
            </div>
            {!form.is_online && (
              <Field label="Venue">
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </Field>
            )}
            {form.is_paid && (
              <Field label="Price (INR)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create draft"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.navigate({ to: "/my-events" })}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
