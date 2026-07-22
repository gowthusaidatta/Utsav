import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  listUsersWithRoles,
  assignRole,
  revokeRole,
  getMyAuditLog,
  getActorContext,
  ROLE_RANK,
  ROLE_LABEL,
  type AppRole,
} from "@/lib/authz.functions";
import { adminCreateUser, adminBulkCreateUsers } from "@/lib/admin-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X, Users, UserPlus, Upload, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/EmptyState";

const ROLES: AppRole[] = [
  "super_admin","platform_admin","org_admin","college_admin","dept_admin",
  "coordinator","student_coordinator","organizer","faculty","judge","mentor",
  "finance","media","sponsor","volunteer","student","guest",
];

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users — Utsav" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const listFn = useServerFn(listUsersWithRoles);
  const assignFn = useServerFn(assignRole);
  const revokeFn = useServerFn(revokeRole);
  const auditFn = useServerFn(getMyAuditLog);
  const meFn = useServerFn(getActorContext);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState("");
  const me = useQuery({ queryKey: ["actor-ctx"], queryFn: () => meFn() });
  const actorRank = me.data?.rank ?? 0;
  const assignable = (Object.keys(ROLE_RANK) as AppRole[])
    .filter((r) => ROLE_RANK[r] < actorRank && r !== "admin")
    .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);
  const users = useQuery({
    queryKey: ["admin-users", committed],
    queryFn: () => listFn({ data: committed ? { search: committed } : {} }),
  });
  const audit = useQuery({ queryKey: ["my-audit"], queryFn: () => auditFn() });

  const [pending, setPending] = useState<Record<string, AppRole>>({});

  const assign = useMutation({
    mutationFn: (v: { userId: string; role: AppRole }) =>
      assignFn({ data: { userId: v.userId, role: v.role, scope: "global" } }),
    onSuccess: () => {
      toast.success("Role assigned");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["my-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (roleId: string) => revokeFn({ data: { roleId } }),
    onSuccess: () => {
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["my-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (users.isError) {
    return (
      <main className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          icon={<Users className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Admin" },
            { label: "Users" },
          ]}
          title="Users & roles"
        />
        <ErrorState
          description={
            (users.error as Error).message === "Forbidden"
              ? "You don't have permission to view this page."
              : "Failed to load users."
          }
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Admin" },
          { label: "Users" },
        ]}
        title="Users & roles"
        subtitle="Admin-only view. Create users, grant or revoke global roles."
        actions={
          <div className="flex gap-2">
            <CreateUserDialog assignable={assignable} onDone={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />
            <BulkImportDialog assignable={assignable} onDone={() => qc.invalidateQueries({ queryKey: ["admin-users"] })} />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCommitted(search.trim());
            }}
          >
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" size="sm" variant="outline">Search</Button>
            {committed && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { setSearch(""); setCommitted(""); }}>
                Clear
              </Button>
            )}
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="w-[280px]">Grant global role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">none</span>
                      )}
                      {u.roles.map((r) => (
                        <Badge key={r.role + r.scope + (r.scope_id ?? "")} variant="secondary" className="gap-1">
                          {r.role} · {r.scope}
                          <button
                            className="ml-1 hover:text-destructive"
                            onClick={() => {
                              const id = (r as { id?: string }).id;
                              if (id) revoke.mutate(id);
                            }}
                            aria-label="Revoke role"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select value={pending[u.id] ?? ""} onValueChange={(v) => setPending({ ...pending, [u.id]: v as AppRole })}>
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignable.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" disabled={!pending[u.id] || assign.isPending}
                        onClick={() => pending[u.id] && assign.mutate({ userId: u.id, role: pending[u.id] })}>
                        Grant
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity (your audit trail)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {(audit.data ?? []).slice(0, 20).map((e) => (
              <li key={e.id} className="text-muted-foreground">
                <span className="font-mono text-foreground">{e.action}</span>{" "}
                {e.resource_type ? `· ${e.resource_type}` : ""}{" "}
                <span className="text-xs">{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
            {(audit.data ?? []).length === 0 && (
              <li className="text-muted-foreground">No activity yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Roles you can assign are limited to those strictly below your own rank. {ROLES.length} total roles in the system.
      </p>
    </main>
  );
}

function CreateUserDialog({ assignable, onDone }: { assignable: AppRole[]; onDone: () => void }) {
  const createFn = useServerFn(adminCreateUser);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", full_name: "", password: "", phone: "",
    college: "", department: "", roll_number: "", faculty_id: "", employee_id: "",
    role: "" as AppRole | "",
  });

  async function submit() {
    if (!form.email) { toast.error("Email is required"); return; }
    setBusy(true);
    try {
      const res = await createFn({
        data: {
          email: form.email.trim(),
          full_name: form.full_name.trim() || undefined,
          password: form.password || undefined,
          phone: form.phone.trim() || undefined,
          college: form.college.trim() || undefined,
          department: form.department.trim() || undefined,
          roll_number: form.roll_number.trim() || undefined,
          faculty_id: form.faculty_id.trim() || undefined,
          employee_id: form.employee_id.trim() || undefined,
          role: form.role || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error || "Failed");
      if (res.temp_password) {
        toast.success(`Created ${res.email}. Temp password: ${res.temp_password}`, { duration: 15000 });
      } else {
        toast.success(`Created ${res.email}`);
      }
      onDone();
      setOpen(false);
      setForm({ email: "", full_name: "", password: "", phone: "", college: "", department: "", roll_number: "", faculty_id: "", employee_id: "", role: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> New user</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>Creates an account and profile. Leave password blank to generate a temporary one.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email *"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></Field>
          <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Password (optional)"><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="text" placeholder="Auto-generated if blank" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="College"><Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></Field>
          <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
          <Field label="Roll number"><Input value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} /></Field>
          <Field label="Faculty ID"><Input value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })} /></Field>
          <Field label="Employee ID"><Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} /></Field>
          <Field label="Initial role (optional)">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
              <SelectTrigger><SelectValue placeholder="No role" /></SelectTrigger>
              <SelectContent>
                {assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

type ParsedRow = {
  email: string; full_name?: string; password?: string; phone?: string;
  college?: string; department?: string; roll_number?: string;
  faculty_id?: string; employee_id?: string; role?: string;
};

function BulkImportDialog({ assignable, onDone }: { assignable: AppRole[]; onDone: () => void }) {
  const bulkFn = useServerFn(adminBulkCreateUsers);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<ReturnType<typeof useServerFn<typeof adminBulkCreateUsers>>>> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const allowedRoles = new Set(assignable as string[]);

  async function handleFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      if (!ws) throw new Error("Empty workbook");
      const headers: string[] = [];
      ws.getRow(1).eachCell((c, col) => { headers[col - 1] = String(c.value ?? "").trim().toLowerCase().replace(/\s+/g, "_"); });
      const parsed: ParsedRow[] = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const obj: Record<string, string> = {};
        row.eachCell((c, col) => {
          const key = headers[col - 1];
          if (!key) return;
          const v = c.value;
          obj[key] = typeof v === "object" && v !== null && "text" in v ? String((v as { text: string }).text)
            : v == null ? "" : String(v);
        });
        if (!obj.email) return;
        const role = obj.role?.trim();
        parsed.push({
          email: obj.email.trim(),
          full_name: obj.full_name || obj.name || undefined,
          password: obj.password || undefined,
          phone: obj.phone || undefined,
          college: obj.college || undefined,
          department: obj.department || undefined,
          roll_number: obj.roll_number || obj.rollno || undefined,
          faculty_id: obj.faculty_id || undefined,
          employee_id: obj.employee_id || undefined,
          role: role && allowedRoles.has(role) ? role : undefined,
        });
      });
      if (parsed.length === 0) throw new Error("No rows found. First row must be headers including 'email'.");
      setRows(parsed);
      setResults(null);
      toast.success(`Parsed ${parsed.length} rows`);
    } catch (e) {
      toast.error("Parse failed: " + (e as Error).message);
    }
  }

  async function submit() {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const res = await bulkFn({ data: { users: rows as never } });
      setResults(res);
      toast.success(`Created ${res.succeeded}/${res.total} users`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Users");
    ws.addRow(["email","full_name","password","phone","college","department","roll_number","faculty_id","employee_id","role"]);
    ws.addRow(["student1@example.com","Jane Doe","","+91...","MIT","CSE","2024CS001","","","student"]);
    ws.addRow(["prof@example.com","Prof. Smith","","","MIT","EE","","FAC-101","","faculty"]);
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "utsav-users-template.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); setResults(null); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk import users from Excel</DialogTitle>
          <DialogDescription>
            Upload an .xlsx file. First row = headers. Supported columns: <code>email</code> (required),
            <code> full_name, password, phone, college, department, roll_number, faculty_id, employee_id, role</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Download template
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Choose .xlsx
          </Button>
        </div>

        {rows.length > 0 && !results && (
          <div className="max-h-64 overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.email}</TableCell>
                    <TableCell className="text-xs">{r.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.role ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 100 && <div className="p-2 text-xs text-muted-foreground">…and {rows.length - 100} more.</div>}
          </div>
        )}

        {results && (
          <div className="space-y-2 rounded border p-3 text-sm">
            <div>
              <Badge variant="secondary">Total {results.total}</Badge>{" "}
              <Badge className="bg-emerald-500/15 text-emerald-700">Success {results.succeeded}</Badge>{" "}
              <Badge variant="destructive">Failed {results.failed}</Badge>
            </div>
            <div className="max-h-56 overflow-auto text-xs">
              {results.results.map((r, i) => (
                <div key={i} className={r.ok ? "text-emerald-700" : "text-destructive"}>
                  {r.ok ? "✓" : "✗"} {r.email} {r.temp_password ? `— temp password: ${r.temp_password}` : ""} {r.error ? `— ${r.error}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} disabled={busy || rows.length === 0 || !!results}>
            {busy ? "Importing…" : `Import ${rows.length} users`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
