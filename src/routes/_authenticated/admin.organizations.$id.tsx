import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  addOrgMember,
  removeOrgMember,
} from "@/lib/orgs.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const ORG_TYPES = ["college", "department", "club", "company", "external"] as const;

export const Route = createFileRoute("/_authenticated/admin/organizations/$id")({
  head: () => ({ meta: [{ title: "Organization — Utsav" }] }),
  component: OrgDetailPage,
});

function OrgDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const getFn = useServerFn(getOrganization);
  const updateFn = useServerFn(updateOrganization);
  const deleteFn = useServerFn(deleteOrganization);
  const addFn = useServerFn(addOrgMember);
  const removeFn = useServerFn(removeOrgMember);
  const qc = useQueryClient();

  const org = useQuery({
    queryKey: ["org", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "college" as (typeof ORG_TYPES)[number],
  });
  const [memberId, setMemberId] = useState("");

  useEffect(() => {
    if (org.data) {
      setForm({
        name: org.data.name,
        slug: org.data.slug,
        type: org.data.type as (typeof ORG_TYPES)[number],
      });
    }
  }, [org.data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: { id, name: form.name, slug: form.slug, type: form.type },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["org", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Organization deleted");
      router.navigate({ to: "/admin/organizations" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: () => addFn({ data: { org_id: id, user_id: memberId.trim() } }),
    onSuccess: () => {
      setMemberId("");
      toast.success("Member added");
      qc.invalidateQueries({ queryKey: ["org", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (uid: string) => removeFn({ data: { org_id: id, user_id: uid } }),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["org", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (org.isLoading)
    return <main className="container mx-auto px-4 py-8 text-sm text-muted-foreground">Loading…</main>;
  if (org.isError)
    return <main className="container mx-auto px-4 py-8 text-sm text-destructive">Failed to load.</main>;

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{org.data?.name}</h1>
          <p className="text-sm text-muted-foreground">Organization settings & members.</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (window.confirm("Delete this organization? This cannot be undone."))
              del.mutate();
          }}
          disabled={del.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as (typeof ORG_TYPES)[number] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!memberId.trim()) return;
              addMember.mutate();
            }}
          >
            <Input
              placeholder="User ID (UUID)"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="font-mono text-xs"
            />
            <Button type="submit" disabled={addMember.isPending}>
              Add
            </Button>
          </form>

          <ul className="divide-y">
            {(org.data?.members ?? []).map((m) => {
              const u = m.user as
                | { id: string; full_name: string | null; email: string }
                | null;
              return (
                <li key={m.user_id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">{u?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u?.email ?? m.user_id}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(m.user_id)}
                    disabled={remove.isPending}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
            {(org.data?.members ?? []).length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">No members yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
