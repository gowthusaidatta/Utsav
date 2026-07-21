import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Plus, X, Pin } from "lucide-react";
import { toast } from "sonner";
import {
  listEventFaqs,
  upsertEventFaq,
  deleteEventFaq,
  listEventAnnouncements,
  upsertEventAnnouncement,
  deleteEventAnnouncement,
} from "@/lib/event-extras.functions";

interface Props {
  eventId: string;
}

export function ManageFaqs({ eventId }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listEventFaqs);
  const saveFn = useServerFn(upsertEventFaq);
  const delFn = useServerFn(deleteEventFaq);
  const list = useQuery({
    queryKey: ["manage-faqs", eventId],
    queryFn: () => listFn({ data: { event_id: eventId } }),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [order, setOrder] = useState(0);

  const reset = () => {
    setEditingId(null);
    setQ("");
    setA("");
    setOrder(0);
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: editingId ?? undefined,
          event_id: eventId,
          question: q.trim(),
          answer: a.trim(),
          sort_order: order,
        },
      }),
    onSuccess: () => {
      toast.success("FAQ saved");
      reset();
      qc.invalidateQueries({ queryKey: ["manage-faqs", eventId] });
      qc.invalidateQueries({ queryKey: ["faqs", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manage-faqs", eventId] });
      qc.invalidateQueries({ queryKey: ["faqs", eventId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">FAQs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {editingId ? "Edit FAQ" : "Add new FAQ"}
            </p>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={reset}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            )}
          </div>
          <div className="grid gap-3">
            <div>
              <Label>Question</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea rows={3} value={a} onChange={(e) => setA(e.target.value)} maxLength={4000} />
            </div>
            <div className="w-32">
              <Label>Order</Label>
              <Input
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Button
                size="sm"
                onClick={() => save.mutate()}
                disabled={q.trim().length < 3 || a.trim().length < 1 || save.isPending}
              >
                <Plus className="mr-1 h-3 w-3" /> {editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </div>

        {(list.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.data!.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{f.sort_order}</Badge>
                    <p className="truncate text-sm font-medium">{f.question}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.answer}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(f.id);
                      setQ(f.question);
                      setA(f.answer);
                      setOrder(f.sort_order);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm("Delete this FAQ?")) remove.mutate(f.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

export function ManageAnnouncements({ eventId }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listEventAnnouncements);
  const saveFn = useServerFn(upsertEventAnnouncement);
  const delFn = useServerFn(deleteEventAnnouncement);
  const list = useQuery({
    queryKey: ["manage-announcements", eventId],
    queryFn: () => listFn({ data: { event_id: eventId } }),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setPinned(false);
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: editingId ?? undefined,
          event_id: eventId,
          title: title.trim(),
          body: body.trim(),
          is_pinned: pinned,
        },
      }),
    onSuccess: () => {
      toast.success("Announcement saved");
      reset();
      qc.invalidateQueries({ queryKey: ["manage-announcements", eventId] });
      qc.invalidateQueries({ queryKey: ["announcements", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manage-announcements", eventId] });
      qc.invalidateQueries({ queryKey: ["announcements", eventId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {editingId ? "Edit announcement" : "New announcement"}
            </p>
            {editingId && (
              <Button size="sm" variant="ghost" onClick={reset}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            )}
          </div>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={pinned} onCheckedChange={(v) => setPinned(!!v)} /> Pin to top
            </label>
            <div>
              <Button
                size="sm"
                onClick={() => save.mutate()}
                disabled={title.trim().length < 3 || body.trim().length < 1 || save.isPending}
              >
                <Plus className="mr-1 h-3 w-3" /> {editingId ? "Update" : "Post"}
              </Button>
            </div>
          </div>
        </div>

        {(list.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.data!.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(a.id);
                      setTitle(a.title);
                      setBody(a.body);
                      setPinned(a.is_pinned);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm("Delete this announcement?")) remove.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
