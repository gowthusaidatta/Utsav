import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEventById, updateEvent, deleteEvent } from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/$id/manage")({
  head: () => ({ meta: [{ title: "Manage Event — Utsav" }] }),
  component: ManageEvent,
});

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ManageEvent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const getFn = useServerFn(getEventById);
  const updFn = useServerFn(updateEvent);
  const delFn = useServerFn(deleteEvent);
  const q = useQuery({ queryKey: ["event", id], queryFn: () => getFn({ data: { id } }) });

  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data && Object.keys(form).length === 0) {
      setForm({
        title: q.data.title,
        description: q.data.description ?? "",
        category: q.data.category ?? "",
        venue: q.data.venue ?? "",
        start_at: toLocalInput(q.data.start_at),
        end_at: toLocalInput(q.data.end_at),
        capacity: q.data.capacity ?? "",
        status: q.data.status,
        visibility: q.data.visibility,
        is_online: q.data.is_online,
        is_paid: q.data.is_paid,
        price: q.data.price ?? 0,
        cover_image_url: q.data.cover_image_url ?? "",
      });
    }
  }, [q.data]);

  if (q.isLoading) return <main className="container mx-auto px-4 py-8">Loading…</main>;
  if (q.error || !q.data)
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-destructive">Unable to load event.</p>
      </main>
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updFn({
        data: {
          id,
          title: form.title,
          description: form.description || null,
          category: form.category || null,
          venue: form.venue || null,
          start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
          end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
          capacity: form.capacity ? Number(form.capacity) : null,
          status: form.status,
          visibility: form.visibility,
          is_online: !!form.is_online,
          is_paid: !!form.is_paid,
          price: form.is_paid ? Number(form.price || 0) : 0,
          cover_image_url: form.cover_image_url || null,
        },
      });
      toast.success("Event saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Event deleted");
      router.navigate({ to: "/events" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{q.data.status}</Badge>
            <Badge variant="outline">{q.data.visibility}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{q.data.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/events/$id/registrations" params={{ id }}>Registrations</Link>
          </Button>
          {q.data.status === "published" && (
            <Button variant="outline" asChild>
              <Link to="/events/$slug" params={{ slug: q.data.slug }}>View public page</Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            <F label="Title">
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </F>
            <F label="Cover image URL">
              <Input
                value={form.cover_image_url ?? ""}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                placeholder="https://…"
              />
            </F>
            <F label="Description">
              <Textarea
                rows={5}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </F>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft","pending_approval","published","cancelled","completed","archived"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Visibility">
                <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["public","private","invite_only"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Category">
                <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </F>
              <F label="Capacity">
                <Input type="number" min={1} value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </F>
              <F label="Start">
                <Input type="datetime-local" value={form.start_at ?? ""} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
              </F>
              <F label="End">
                <Input type="datetime-local" value={form.end_at ?? ""} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
              </F>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_online} onChange={(e) => setForm({ ...form, is_online: e.target.checked })} /> Online
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_paid} onChange={(e) => setForm({ ...form, is_paid: e.target.checked })} /> Paid
              </label>
            </div>
            {!form.is_online && (
              <F label="Venue">
                <Input value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
              </F>
            )}
            {form.is_paid && (
              <F label="Price">
                <Input type="number" min={0} step="0.01" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </F>
            )}
            <div className="flex justify-between pt-2">
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
              <Button type="button" variant="destructive" onClick={remove}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
