import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listMyEducation,
  createEducation,
  updateEducation,
  deleteEducation,
} from "@/lib/education.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/education")({
  head: () => ({ meta: [{ title: "Education — Utsav" }] }),
  component: EducationPage,
});

type EducationRow = {
  id: string;
  institution: string;
  degree: string | null;
  course: string | null;
  branch: string | null;
  specialization: string | null;
  start_date: string | null;
  end_date: string | null;
  currently_studying: boolean;
  cgpa: number | null;
  percentage: number | null;
  subjects: string[];
  achievements: string | null;
  description: string | null;
  transcript_url: string | null;
  sort_order: number;
};

type Draft = {
  institution: string;
  degree: string;
  course: string;
  branch: string;
  specialization: string;
  start_date: string;
  end_date: string;
  currently_studying: boolean;
  cgpa: string;
  percentage: string;
  subjects: string;
  achievements: string;
  description: string;
  transcript_url: string;
};

const emptyDraft: Draft = {
  institution: "", degree: "", course: "", branch: "", specialization: "",
  start_date: "", end_date: "", currently_studying: false,
  cgpa: "", percentage: "", subjects: "", achievements: "", description: "", transcript_url: "",
};

function toRowPayload(d: Draft) {
  return {
    institution: d.institution.trim(),
    degree: d.degree.trim() || null,
    course: d.course.trim() || null,
    branch: d.branch.trim() || null,
    specialization: d.specialization.trim() || null,
    start_date: d.start_date || null,
    end_date: d.end_date || null,
    currently_studying: d.currently_studying,
    cgpa: d.cgpa ? Number(d.cgpa) : null,
    percentage: d.percentage ? Number(d.percentage) : null,
    subjects: d.subjects.split(",").map((s) => s.trim()).filter(Boolean),
    achievements: d.achievements.trim() || null,
    description: d.description.trim() || null,
    transcript_url: d.transcript_url.trim() || null,
  };
}

function EducationPage() {
  const listFn = useServerFn(listMyEducation);
  const createFn = useServerFn(createEducation);
  const updateFn = useServerFn(updateEducation);
  const deleteFn = useServerFn(deleteEducation);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-education"],
    queryFn: () => listFn(),
  });
  const rows = (data ?? []) as unknown as EducationRow[];

  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const payload = toRowPayload(editing.draft);
      if (!payload.institution) throw new Error("Institution is required.");
      if (editing.id) {
        await updateFn({ data: { id: editing.id, patch: payload } });
      } else {
        await createFn({ data: payload });
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["my-education"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["my-education"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Education"
        subtitle="Add every school, college, and program that shapes your journey."
        actions={
          <Dialog open={editing !== null} onOpenChange={(o) => (o ? setEditing({ id: null, draft: emptyDraft }) : setEditing(null))}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add education</Button>
            </DialogTrigger>
            <EducationDialog editing={editing} setEditing={setEditing} onSave={() => save.mutate()} saving={save.isPending} />
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No education records yet"
          description="Add your school, college, and any additional programs."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{r.institution}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[r.degree, r.course, r.branch, r.specialization].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.start_date || "—"} – {r.currently_studying ? "Present" : r.end_date || "—"}
                      {r.cgpa != null ? ` · CGPA ${r.cgpa}` : ""}
                      {r.percentage != null ? ` · ${r.percentage}%` : ""}
                    </p>
                    {r.description ? <p className="mt-2 text-sm whitespace-pre-wrap">{r.description}</p> : null}
                    {r.achievements ? <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">🏆 {r.achievements}</p> : null}
                    {r.subjects.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">Subjects: {r.subjects.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditing({
                      id: r.id,
                      draft: {
                        institution: r.institution,
                        degree: r.degree ?? "",
                        course: r.course ?? "",
                        branch: r.branch ?? "",
                        specialization: r.specialization ?? "",
                        start_date: r.start_date ?? "",
                        end_date: r.end_date ?? "",
                        currently_studying: r.currently_studying,
                        cgpa: r.cgpa != null ? String(r.cgpa) : "",
                        percentage: r.percentage != null ? String(r.percentage) : "",
                        subjects: r.subjects.join(", "),
                        achievements: r.achievements ?? "",
                        description: r.description ?? "",
                        transcript_url: r.transcript_url ?? "",
                      },
                    })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm(`Remove ${r.institution}?`)) remove.mutate(r.id);
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
    </main>
  );
}

function EducationDialog({
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
        <DialogTitle>{editing.id ? "Edit education" : "Add education"}</DialogTitle>
      </DialogHeader>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Institution *</Label>
          <Input value={d.institution} onChange={(e) => set({ institution: e.target.value })} required maxLength={200} />
        </div>
        <div className="space-y-1.5"><Label>Degree</Label><Input value={d.degree} onChange={(e) => set({ degree: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Course</Label><Input value={d.course} onChange={(e) => set({ course: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Branch</Label><Input value={d.branch} onChange={(e) => set({ branch: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Specialization</Label><Input value={d.specialization} onChange={(e) => set({ specialization: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={d.start_date} onChange={(e) => set({ start_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={d.end_date} onChange={(e) => set({ end_date: e.target.value })} disabled={d.currently_studying} /></div>
        <div className="space-y-1.5 flex items-center gap-3 sm:col-span-2">
          <Switch checked={d.currently_studying} onCheckedChange={(v) => set({ currently_studying: v, end_date: v ? "" : d.end_date })} />
          <Label className="!mt-0">Currently studying here</Label>
        </div>
        <div className="space-y-1.5"><Label>CGPA</Label><Input type="number" step="0.01" min={0} max={10} value={d.cgpa} onChange={(e) => set({ cgpa: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Percentage</Label><Input type="number" step="0.01" min={0} max={100} value={d.percentage} onChange={(e) => set({ percentage: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Subjects (comma separated)</Label><Input value={d.subjects} onChange={(e) => set({ subjects: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Achievements</Label><Textarea rows={2} value={d.achievements} onChange={(e) => set({ achievements: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea rows={3} value={d.description} onChange={(e) => set({ description: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Transcript URL</Label><Input value={d.transcript_url} onChange={(e) => set({ transcript_url: e.target.value })} /></div>
        <DialogFooter className="sm:col-span-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
