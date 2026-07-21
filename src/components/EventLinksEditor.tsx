import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listEventLinksForEditor,
  createEventLink,
  updateEventLink,
  deleteEventLink,
  reorderEventLinks,
} from "@/lib/event-links.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, ArrowUp, ArrowDown, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function EventLinksEditor({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listEventLinksForEditor);
  const createFn = useServerFn(createEventLink);
  const updateFn = useServerFn(updateEventLink);
  const delFn = useServerFn(deleteEventLink);
  const reorderFn = useServerFn(reorderEventLinks);
  const key = ["event-links", eventId];

  const q = useQuery({
    queryKey: key,
    queryFn: () => listFn({ data: { event_id: eventId } }),
  });

  const [form, setForm] = useState({ title: "", url: "", description: "" });

  const add = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          event_id: eventId,
          title: form.title.trim(),
          url: form.url.trim(),
          description: form.description.trim() || null,
        },
      }),
    onSuccess: () => {
      setForm({ title: "", url: "", description: "" });
      qc.invalidateQueries({ queryKey: key });
      toast.success("Link added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Link removed");
    },
  });

  async function move(idx: number, dir: -1 | 1) {
    const rows = q.data ?? [];
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const order = rows.map((r) => r.id);
    [order[idx], order[j]] = [order[j], order[idx]];
    await reorderFn({ data: { event_id: eventId, order } });
    qc.invalidateQueries({ queryKey: key });
  }

  async function rename(id: string, patch: { title?: string; url?: string; description?: string | null }) {
    await updateFn({ data: { id, ...patch } });
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Related links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={120}
                placeholder="Sponsor deck"
              />
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                type="url"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              maxLength={500}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => add.mutate()}
            disabled={!form.title.trim() || !form.url.trim() || add.isPending}
          >
            <Plus className="mr-2 h-4 w-4" /> Add link
          </Button>
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No links yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {(q.data ?? []).map((row, idx) => (
              <li key={row.id} className="flex items-start gap-2 p-3">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => move(idx, -1)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => move(idx, 1)}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    defaultValue={row.title}
                    onBlur={(e) =>
                      e.target.value !== row.title && rename(row.id, { title: e.target.value })
                    }
                    className="h-8"
                  />
                  <Input
                    defaultValue={row.url}
                    onBlur={(e) =>
                      e.target.value !== row.url && rename(row.id, { url: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                  {row.description !== null && (
                    <Textarea
                      defaultValue={row.description ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (row.description ?? "") &&
                        rename(row.id, { description: e.target.value || null })
                      }
                      rows={1}
                      className="text-xs"
                    />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm("Remove this link?")) remove.mutate(row.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
