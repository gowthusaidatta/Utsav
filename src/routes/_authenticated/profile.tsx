import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — EventGo" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getFn() });
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    college: "",
    department: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        college: data.college ?? "",
        department: data.department ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          full_name: form.full_name || null,
          phone: form.phone || null,
          college: form.college || null,
          department: form.department || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={data?.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={32}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="college">College</Label>
                  <Input
                    id="college"
                    value={form.college}
                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                    maxLength={160}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    maxLength={160}
                  />
                </div>
              </div>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
