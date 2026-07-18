import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listOrganizations,
  createOrganization,
} from "@/lib/orgs.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ORG_TYPES = ["college", "department", "club", "company", "external"] as const;

export const Route = createFileRoute("/_authenticated/admin/organizations")({
  head: () => ({ meta: [{ title: "Admin · Organizations — Utsav" }] }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const listFn = useServerFn(listOrganizations);
  const createFn = useServerFn(createOrganization);
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: ["admin-orgs"], queryFn: () => listFn() });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "college" as (typeof ORG_TYPES)[number],
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: form.name,
          slug: form.slug || undefined,
          type: form.type,
        },
      }),
    onSuccess: () => {
      toast.success("Organization created");
      setForm({ name: "", slug: "", type: "college" });
      qc.invalidateQueries({ queryKey: ["admin-orgs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Colleges, departments, clubs and partners that host events on Utsav.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.name.trim().length < 2) return toast.error("Name too short");
              create.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto"
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
            <div className="sm:col-span-4">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All organizations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {orgs.isError ? (
            <p className="text-sm text-destructive">Failed to load organizations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orgs.data ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{o.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {o.slug}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/admin/organizations/$id"
                          params={{ id: o.id }}
                        >
                          Manage
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(orgs.data ?? []).length === 0 && !orgs.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No organizations yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
