import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listMyPursuits,
  createPursuit,
  updatePursuit,
  deletePursuit,
  listMyCertificatesAll,
  PURSUIT_TYPES,
} from "@/lib/pursuits.functions";
import { getSignedReadUrl } from "@/lib/profile.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Pencil, Trash2, Plus, Download, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/certifications")({
  head: () => ({ meta: [{ title: "Certifications & Pursuits — Utsav" }] }),
  component: CertificationsPage,
});

type Pursuit = {
  id: string;
  type: (typeof PURSUIT_TYPES)[number];
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  description: string | null;
  skills: string[];
  verification_url: string | null;
  badge_url: string | null;
};

type EventCert = {
  id: string;
  code: string;
  title: string | null;
  template_key: string | null;
  position: string | null;
  rank: number | null;
  score: number | null;
  role: string | null;
  event_id: string;
  issued_at: string;
  revoked_at: string | null;
  storage_path: string | null;
  event: { id: string; title: string; slug: string; start_at: string | null } | null;
  verify_url: string;
};

type Draft = {
  type: (typeof PURSUIT_TYPES)[number];
  title: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string;
  credential_id: string;
  credential_url: string;
  description: string;
  skills: string;
  verification_url: string;
  badge_url: string;
};

const emptyDraft: Draft = {
  type: "certificate",
  title: "",
  issuing_organization: "",
  issue_date: "",
  expiry_date: "",
  credential_id: "",
  credential_url: "",
  description: "",
  skills: "",
  verification_url: "",
  badge_url: "",
};

const TYPE_LABEL: Record<(typeof PURSUIT_TYPES)[number], string> = {
  certificate: "Certificate",
  course: "Course",
  internship: "Internship",
  bootcamp: "Bootcamp",
  workshop: "Workshop",
  seminar: "Seminar",
  conference: "Conference",
  research: "Research",
  award: "Award",
  scholarship: "Scholarship",
  publication: "Publication",
  license: "License",
  project: "Project",
  patent: "Patent",
  open_source: "Open source",
  volunteer: "Volunteer",
  leadership: "Leadership",
  work: "Work experience",
};

function CertificationsPage() {
  const listFn = useServerFn(listMyPursuits);
  const createFn = useServerFn(createPursuit);
  const updateFn = useServerFn(updatePursuit);
  const deleteFn = useServerFn(deletePursuit);
  const listCertsFn = useServerFn(listMyCertificatesAll);
  const getUrlFn = useServerFn(getSignedReadUrl);
  const qc = useQueryClient();

  const pursuitsQ = useQuery({ queryKey: ["my-pursuits"], queryFn: () => listFn() });
  const certsQ = useQuery({ queryKey: ["my-event-certificates"], queryFn: () => listCertsFn() });
  const pursuits = (pursuitsQ.data ?? []) as unknown as Pursuit[];
  const eventCerts = (certsQ.data ?? []) as unknown as EventCert[];

  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const d = editing.draft;
      if (!d.title.trim()) throw new Error("Title is required.");
      const payload = {
        type: d.type,
        title: d.title.trim(),
        issuing_organization: d.issuing_organization.trim() || null,
        issue_date: d.issue_date || null,
        expiry_date: d.expiry_date || null,
        credential_id: d.credential_id.trim() || null,
        credential_url: d.credential_url.trim() || null,
        description: d.description.trim() || null,
        skills: d.skills.split(",").map((s) => s.trim()).filter(Boolean),
        verification_url: d.verification_url.trim() || null,
        badge_url: d.badge_url.trim() || null,
      };
      if (editing.id) await updateFn({ data: { id: editing.id, patch: payload } });
      else await createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["my-pursuits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["my-pursuits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadCert = async (path: string | null) => {
    if (!path) return;
    try {
      const { url } = await getUrlFn({ data: { path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Certifications & Pursuits"
        subtitle="Every course, internship, publication, award, and event certificate you've earned."
      />

      <Tabs defaultValue="pursuits">
        <TabsList>
          <TabsTrigger value="pursuits">My pursuits</TabsTrigger>
          <TabsTrigger value="events">Event certificates ({eventCerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pursuits" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={editing !== null}
              onOpenChange={(o) => (o ? setEditing({ id: null, draft: emptyDraft }) : setEditing(null))}
            >
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add pursuit</Button>
              </DialogTrigger>
              <PursuitDialog
                editing={editing}
                setEditing={setEditing}
                onSave={() => save.mutate()}
                saving={save.isPending}
              />
            </Dialog>
          </div>

          {pursuitsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pursuits.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              description="Add your first certificate, course, internship, publication, or award."
            />
          ) : (
            <div className="space-y-3">
              {pursuits.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{p.title}</h3>
                          <Badge variant="secondary">{TYPE_LABEL[p.type]}</Badge>
                        </div>
                        {p.issuing_organization ? (
                          <p className="text-sm text-muted-foreground">{p.issuing_organization}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.issue_date ? `Issued ${p.issue_date}` : ""}
                          {p.expiry_date ? ` · Expires ${p.expiry_date}` : ""}
                          {p.credential_id ? ` · ID ${p.credential_id}` : ""}
                        </p>
                        {p.description ? (
                          <p className="mt-2 text-sm whitespace-pre-wrap">{p.description}</p>
                        ) : null}
                        {p.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.skills.map((s) => (
                              <Badge key={s} variant="outline">{s}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          {p.credential_url ? (
                            <a className="text-primary hover:underline" href={p.credential_url} target="_blank" rel="noreferrer noopener">
                              Credential →
                            </a>
                          ) : null}
                          {p.verification_url ? (
                            <a className="text-primary hover:underline" href={p.verification_url} target="_blank" rel="noreferrer noopener">
                              Verify →
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditing({
                          id: p.id,
                          draft: {
                            type: p.type,
                            title: p.title,
                            issuing_organization: p.issuing_organization ?? "",
                            issue_date: p.issue_date ?? "",
                            expiry_date: p.expiry_date ?? "",
                            credential_id: p.credential_id ?? "",
                            credential_url: p.credential_url ?? "",
                            description: p.description ?? "",
                            skills: p.skills.join(", "),
                            verification_url: p.verification_url ?? "",
                            badge_url: p.badge_url ?? "",
                          },
                        })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm(`Remove "${p.title}"?`)) remove.mutate(p.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {certsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : eventCerts.length === 0 ? (
            <EmptyState
              title="No event certificates yet"
              description="Certificates issued for events you attend will show up here automatically."
            />
          ) : (
            <div className="space-y-3">
              {eventCerts.map((c) => (
                <Card key={c.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {c.title || c.event?.title || "Event certificate"}
                          </h3>
                          {c.template_key ? <Badge variant="secondary">{c.template_key}</Badge> : null}
                          {c.revoked_at ? <Badge variant="destructive">Revoked</Badge> : null}
                        </div>
                        {c.event?.title ? <p className="text-sm text-muted-foreground">{c.event.title}</p> : null}
                        <p className="text-xs text-muted-foreground mt-1">
                          Issued {new Date(c.issued_at).toLocaleDateString()}
                          {c.role ? ` · ${c.role}` : ""}
                          {c.position ? ` · ${c.position}` : ""}
                          {c.rank != null ? ` · Rank #${c.rank}` : ""}
                          {c.score != null ? ` · ${c.score}` : ""}
                        </p>
                        <p className="mt-1 text-xs font-mono">{c.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <a href={c.verify_url} target="_blank" rel="noreferrer noopener">
                          <Button variant="outline" size="sm">
                            <ShieldCheck className="mr-1 h-4 w-4" /> Verify
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          onClick={() => downloadCert(c.storage_path)}
                          disabled={!c.storage_path}
                        >
                          <Download className="mr-1 h-4 w-4" /> Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function PursuitDialog({
  editing, setEditing, onSave, saving,
}: {
  editing: { id: string | null; draft: Draft } | null;
  setEditing: (v: { id: string | null; draft: Draft } | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!editing) return null;
  const d = editing.draft;
  const set = (patch: Partial<Draft>) => setEditing({ ...editing, draft: { ...d, ...patch } });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing.id ? "Edit pursuit" : "Add pursuit"}</DialogTitle>
      </DialogHeader>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
      >
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={d.type} onValueChange={(v) => set({ type: v as (typeof PURSUIT_TYPES)[number] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PURSUIT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input value={d.title} onChange={(e) => set({ title: e.target.value })} required maxLength={200} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Issuing organization</Label>
          <Input value={d.issuing_organization} onChange={(e) => set({ issuing_organization: e.target.value })} maxLength={200} />
        </div>
        <div className="space-y-1.5"><Label>Issue date</Label><Input type="date" value={d.issue_date} onChange={(e) => set({ issue_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Expiry date</Label><Input type="date" value={d.expiry_date} onChange={(e) => set({ expiry_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Credential ID</Label><Input value={d.credential_id} onChange={(e) => set({ credential_id: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Credential URL</Label><Input value={d.credential_url} onChange={(e) => set({ credential_url: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Skills (comma separated)</Label>
          <Input value={d.skills} onChange={(e) => set({ skills: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={d.description} onChange={(e) => set({ description: e.target.value })} />
        </div>
        <div className="space-y-1.5"><Label>Verification URL</Label><Input value={d.verification_url} onChange={(e) => set({ verification_url: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Badge image URL</Label><Input value={d.badge_url} onChange={(e) => set({ badge_url: e.target.value })} /></div>
        <DialogFooter className="sm:col-span-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
