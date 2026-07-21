import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getEventById,
  updateEvent,
  deleteEvent,
  changeEventStatus,
  duplicateEvent,
} from "@/lib/events.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Copy, Send, CheckCircle2, XCircle, Archive } from "lucide-react";
import { ManageFaqs, ManageAnnouncements } from "@/components/ManageEventExtras";

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

interface EventForm {
  title: string;
  description: string;
  category: string;
  venue: string;
  meeting_url: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  capacity: string;
  visibility: string;
  is_online: boolean;
  is_paid: boolean;
  price: number | string;
  currency: string;
  cover_image_url: string;
  tags: string;
}

function ManageEvent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const getFn = useServerFn(getEventById);
  const updFn = useServerFn(updateEvent);
  const delFn = useServerFn(deleteEvent);
  const statusFn = useServerFn(changeEventStatus);
  const dupFn = useServerFn(duplicateEvent);

  const q = useQuery({ queryKey: ["event", id], queryFn: () => getFn({ data: { id } }) });

  const [form, setForm] = useState<EventForm | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data && !form) {
      setForm({
        title: q.data.title,
        description: q.data.description ?? "",
        category: q.data.category ?? "",
        venue: q.data.venue ?? "",
        meeting_url: q.data.meeting_url ?? "",
        start_at: toLocalInput(q.data.start_at),
        end_at: toLocalInput(q.data.end_at),
        registration_deadline: toLocalInput(q.data.registration_deadline),
        capacity: q.data.capacity?.toString() ?? "",
        visibility: q.data.visibility,
        is_online: q.data.is_online,
        is_paid: q.data.is_paid,
        price: q.data.price ?? 0,
        currency: q.data.currency ?? "INR",
        cover_image_url: q.data.cover_image_url ?? "",
        tags: (q.data.tags ?? []).join(", "),
      });
    }
  }, [q.data, form]);

  if (q.isLoading || !form)
    return <main className="container mx-auto px-4 py-8 text-sm text-muted-foreground">Loading…</main>;
  if (q.error || !q.data)
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-destructive">Unable to load event.</p>
      </main>
    );

  const currentStatus = q.data.status as
    | "draft"
    | "pending_approval"
    | "published"
    | "cancelled"
    | "completed"
    | "archived";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20);
      await updFn({
        data: {
          id,
          title: form.title,
          description: form.description || null,
          category: form.category || null,
          venue: form.is_online ? null : form.venue || null,
          meeting_url: form.is_online ? form.meeting_url || null : null,
          start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
          end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
          registration_deadline: form.registration_deadline
            ? new Date(form.registration_deadline).toISOString()
            : null,
          capacity: form.capacity ? Number(form.capacity) : null,
          visibility: form.visibility as "public" | "private" | "invite_only",
          is_online: form.is_online,
          is_paid: form.is_paid,
          price: form.is_paid ? Number(form.price || 0) : 0,
          currency: form.currency || "INR",
          cover_image_url: form.cover_image_url || null,
          tags,
        },
      });
      await qc.invalidateQueries({ queryKey: ["event", id] });
      toast.success("Event saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function transition(to: typeof currentStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await statusFn({ data: { id, to } });
      await qc.invalidateQueries({ queryKey: ["event", id] });
      toast.success(`Status changed to ${to}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Event deleted");
      router.navigate({ to: "/my-events" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function duplicate() {
    try {
      const res = await dupFn({ data: { id } });
      toast.success("Event duplicated");
      router.navigate({ to: "/events/$id/manage", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{currentStatus}</Badge>
            <Badge variant="outline">{q.data.visibility}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{q.data.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/events/$id/registrations" params={{ id }}>Registrations</Link>
          </Button>
          {currentStatus === "published" && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/events/$slug" params={{ slug: q.data.slug }}>View public page</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={duplicate}>
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {currentStatus === "draft" && (
            <>
              <Button
                size="sm"
                onClick={() => transition("pending_approval")}
                disabled={busy}
              >
                <Send className="mr-2 h-4 w-4" /> Submit for approval
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  transition(
                    "published",
                    "Publish this event now? Coordinators, faculty, or admin only.",
                  )
                }
                disabled={busy}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Publish directly
              </Button>
            </>
          )}
          {currentStatus === "pending_approval" && (
            <>
              <Button
                size="sm"
                onClick={() => transition("published", "Approve and publish?")}
                disabled={busy}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve & publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => transition("draft", "Send back to draft?")}
                disabled={busy}
              >
                <XCircle className="mr-2 h-4 w-4" /> Send back to draft
              </Button>
            </>
          )}
          {currentStatus === "published" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => transition("completed", "Mark as completed?")}
                disabled={busy}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => transition("cancelled", "Cancel this event?")}
                disabled={busy}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel event
              </Button>
            </>
          )}
          {(currentStatus === "cancelled" || currentStatus === "completed") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => transition("archived", "Archive this event?")}
              disabled={busy}
            >
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          )}
          {currentStatus === "cancelled" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => transition("draft", "Restore to draft?")}
              disabled={busy}
            >
              Restore to draft
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            <F label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                minLength={3}
                maxLength={160}
              />
            </F>
            <F label="Cover image URL">
              <Input
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                placeholder="https://…"
                type="url"
                maxLength={500}
              />
            </F>
            <F label="Description">
              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={10000}
              />
            </F>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Visibility">
                <Select
                  value={form.visibility}
                  onValueChange={(v) => setForm({ ...form, visibility: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["public", "private", "invite_only"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Category">
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  maxLength={64}
                />
              </F>
              <F label="Capacity">
                <Input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </F>
              <F label="Tags (comma-separated)">
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="ai, workshop, beginner"
                />
              </F>
              <F label="Start">
                <Input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                />
              </F>
              <F label="End">
                <Input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                />
              </F>
              <F label="Registration deadline">
                <Input
                  type="datetime-local"
                  value={form.registration_deadline}
                  onChange={(e) =>
                    setForm({ ...form, registration_deadline: e.target.value })
                  }
                />
              </F>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_online}
                  onCheckedChange={(v) => setForm({ ...form, is_online: !!v })}
                />
                Online event
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_paid}
                  onCheckedChange={(v) => setForm({ ...form, is_paid: !!v })}
                />
                Paid event
              </label>
            </div>

            {form.is_online ? (
              <F label="Meeting URL">
                <Input
                  type="url"
                  value={form.meeting_url}
                  onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                  placeholder="https://meet.…"
                  maxLength={500}
                />
              </F>
            ) : (
              <F label="Venue">
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  maxLength={240}
                />
              </F>
            )}

            {form.is_paid && (
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Price">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </F>
                <F label="Currency">
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })
                    }
                    maxLength={3}
                  />
                </F>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="destructive" onClick={remove} disabled={busy}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete event
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
