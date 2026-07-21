import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getMyProfile,
  updateMyProfile,
  checkUsernameAvailable,
  setMyUsername,
} from "@/lib/profile.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Utsav" }] }),
  component: ProfilePage,
});

type FormState = {
  full_name: string;
  display_name: string;
  phone: string;
  alternate_phone: string;
  gender: string;
  date_of_birth: string;
  bio: string;
  languages: string;
  // academic (student-like)
  college: string;
  campus: string;
  department: string;
  course: string;
  branch: string;
  specialization: string;
  registration_number: string;
  academic_year: string;
  section: string;
  semester: string;
  current_year: string;
  expected_graduation: string;
  student_id: string;
  admission_year: string;
  // professional (faculty / staff / admin / organizer etc.)
  designation: string;
  current_position: string;
  organization_name: string;
  experience_years: string;
  technical_skills: string;
  soft_skills: string;
  resume_url: string;
  portfolio_url: string;
  personal_website: string;
  // social
  linkedin_url: string;
  github_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  discord_username: string;
  leetcode_username: string;
  codeforces_username: string;
  codechef_username: string;
  hackerrank_username: string;
  gfg_username: string;
  researchgate_url: string;
  orcid: string;
  profile_is_public: boolean;
};

const empty: FormState = {
  full_name: "", display_name: "", phone: "", alternate_phone: "", gender: "",
  date_of_birth: "", bio: "", languages: "",
  college: "", campus: "", department: "", course: "", branch: "", specialization: "",
  registration_number: "", academic_year: "", section: "", semester: "", current_year: "",
  expected_graduation: "", student_id: "", admission_year: "",
  designation: "", current_position: "", organization_name: "", experience_years: "",
  technical_skills: "", soft_skills: "",
  resume_url: "", portfolio_url: "", personal_website: "",
  linkedin_url: "", github_url: "", twitter_url: "", instagram_url: "", facebook_url: "",
  discord_username: "", leetcode_username: "", codeforces_username: "",
  codechef_username: "", hackerrank_username: "", gfg_username: "",
  researchgate_url: "", orcid: "",
  profile_is_public: true,
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// Role → which context tab to render
const STUDENT_ROLES = new Set(["student", "student_coordinator", "volunteer", "guest"]);
const FACULTY_ROLES = new Set(["faculty", "coordinator", "mentor", "judge"]);
const ADMIN_ROLES = new Set([
  "admin", "super_admin", "platform_admin", "org_admin",
  "college_admin", "dept_admin", "organizer", "media", "sponsor", "finance",
]);

function roleContext(roles: string[] | undefined): "student" | "faculty" | "admin" {
  const list = roles ?? [];
  if (list.some((r) => ADMIN_ROLES.has(r))) return "admin";
  if (list.some((r) => FACULTY_ROLES.has(r))) return "faculty";
  if (list.some((r) => STUDENT_ROLES.has(r))) return "student";
  return "student";
}

function csvToArray(s: string) {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function ProfilePage() {
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const checkUsernameFn = useServerFn(checkUsernameAvailable);
  const setUsernameFn = useServerFn(setMyUsername);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => getFn() });
  const [form, setForm] = useState<FormState>(empty);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  const ctx = roleContext((data as { roles?: string[] } | null)?.roles);

  useEffect(() => {
    if (!data) return;
    setUsername(data.username ?? "");
    setForm({
      ...empty,
      full_name: data.full_name ?? "",
      display_name: data.display_name ?? "",
      phone: data.phone ?? "",
      alternate_phone: data.alternate_phone ?? "",
      gender: data.gender ?? "",
      date_of_birth: data.date_of_birth ?? "",
      bio: data.bio ?? "",
      languages: (data.languages ?? []).join(", "),
      college: data.college ?? "",
      campus: data.campus ?? "",
      department: data.department ?? "",
      course: data.course ?? "",
      branch: data.branch ?? "",
      specialization: data.specialization ?? "",
      registration_number: data.registration_number ?? "",
      academic_year: data.academic_year ?? "",
      section: data.section ?? "",
      semester: data.semester ?? "",
      current_year: data.current_year ?? "",
      expected_graduation: data.expected_graduation ?? "",
      student_id: data.student_id ?? "",
      admission_year: data.admission_year ?? "",
      designation: data.designation ?? "",
      current_position: data.current_position ?? "",
      organization_name: data.organization_name ?? "",
      experience_years: data.experience_years != null ? String(data.experience_years) : "",
      technical_skills: (data.technical_skills ?? []).join(", "),
      soft_skills: (data.soft_skills ?? []).join(", "),
      resume_url: data.resume_url ?? "",
      portfolio_url: data.portfolio_url ?? "",
      personal_website: data.personal_website ?? "",
      linkedin_url: data.linkedin_url ?? "",
      github_url: data.github_url ?? "",
      twitter_url: data.twitter_url ?? "",
      instagram_url: data.instagram_url ?? "",
      facebook_url: data.facebook_url ?? "",
      discord_username: data.discord_username ?? "",
      leetcode_username: data.leetcode_username ?? "",
      codeforces_username: data.codeforces_username ?? "",
      codechef_username: data.codechef_username ?? "",
      hackerrank_username: data.hackerrank_username ?? "",
      gfg_username: data.gfg_username ?? "",
      researchgate_url: data.researchgate_url ?? "",
      orcid: data.orcid ?? "",
      profile_is_public: data.profile_is_public ?? true,
    });
  }, [data]);

  useEffect(() => {
    if (!username) { setUsernameStatus("idle"); return; }
    if (username === data?.username) { setUsernameStatus("ok"); return; }
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await checkUsernameFn({ data: { username } });
        setUsernameStatus(res.available ? "ok" : "taken");
      } catch { setUsernameStatus("idle"); }
    }, 400);
    return () => clearTimeout(t);
  }, [username, data?.username, checkUsernameFn]);

  const saveUsername = useMutation({
    mutationFn: () => setUsernameFn({ data: { username } }),
    onSuccess: () => {
      toast.success("Username saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          full_name: form.full_name || null,
          display_name: form.display_name || null,
          phone: form.phone || null,
          alternate_phone: form.alternate_phone || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          bio: form.bio || null,
          languages: csvToArray(form.languages),
          // academic — only for student-like roles
          ...(ctx === "student" ? {
            college: form.college || null,
            campus: form.campus || null,
            department: form.department || null,
            course: form.course || null,
            branch: form.branch || null,
            specialization: form.specialization || null,
            registration_number: form.registration_number || null,
            academic_year: form.academic_year || null,
            section: form.section || null,
            semester: form.semester || null,
            current_year: form.current_year || null,
            expected_graduation: form.expected_graduation || null,
            student_id: form.student_id || null,
            admission_year: form.admission_year || null,
          } : {}),
          // professional — for faculty/admin/staff
          ...(ctx !== "student" ? {
            college: form.college || null,
            department: form.department || null,
            designation: form.designation || null,
            current_position: form.current_position || null,
            organization_name: form.organization_name || null,
            experience_years: form.experience_years ? Number(form.experience_years) : null,
            technical_skills: csvToArray(form.technical_skills),
            soft_skills: csvToArray(form.soft_skills),
            resume_url: form.resume_url || null,
            portfolio_url: form.portfolio_url || null,
            personal_website: form.personal_website || null,
          } : {}),
          linkedin_url: form.linkedin_url || null,
          github_url: form.github_url || null,
          twitter_url: form.twitter_url || null,
          instagram_url: form.instagram_url || null,
          facebook_url: form.facebook_url || null,
          discord_username: form.discord_username || null,
          leetcode_username: form.leetcode_username || null,
          codeforces_username: form.codeforces_username || null,
          codechef_username: form.codechef_username || null,
          hackerrank_username: form.hackerrank_username || null,
          gfg_username: form.gfg_username || null,
          researchgate_url: form.researchgate_url || null,
          orcid: form.orcid || null,
          profile_is_public: form.profile_is_public,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const contextTabValue = ctx === "student" ? "academic" : "professional";
  const contextTabLabel =
    ctx === "student" ? "Academic" : ctx === "faculty" ? "Faculty" : "Role details";

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage your identity and role details."
        actions={
          data?.username ? (
            <a
              href={`/profile/${data.username}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-primary hover:underline"
            >
              View public profile →
            </a>
          ) : null
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. aditya.rao"
                  />
                  <p className="text-xs text-muted-foreground">
                    {usernameStatus === "checking" && "Checking availability…"}
                    {usernameStatus === "ok" && "Available"}
                    {usernameStatus === "taken" && "This username is taken."}
                    {usernameStatus === "invalid" && "3–32 chars. Letters, digits, . _ -"}
                    {usernameStatus === "idle" && "Public URL: /profile/<username>"}
                  </p>
                </div>
                <Button
                  onClick={() => saveUsername.mutate()}
                  disabled={
                    saveUsername.isPending ||
                    username === (data?.username ?? "") ||
                    usernameStatus === "taken" ||
                    usernameStatus === "invalid"
                  }
                >
                  Save username
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Public profile</p>
                  <p className="text-xs text-muted-foreground">
                    When off, your /profile/{data?.username || "<username>"} page shows as private.
                  </p>
                </div>
                <Switch
                  checked={form.profile_is_public}
                  onCheckedChange={(v) => set("profile_is_public", v)}
                />
              </div>
            </CardContent>
          </Card>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-4"
          >
            <Tabs defaultValue="personal">
              <TabsList className="flex-wrap">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value={contextTabValue}>{contextTabLabel}</TabsTrigger>
                <TabsTrigger value="social">Social & links</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                  <Field label="Full name"><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} /></Field>
                  <Field label="Display name"><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={120} /></Field>
                  <Field label="Email"><Input value={data?.email ?? ""} disabled /></Field>
                  <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                  <Field label="Alternate phone"><Input value={form.alternate_phone} onChange={(e) => set("alternate_phone", e.target.value)} /></Field>
                  <Field label="Gender">
                    <Select value={form.gender || undefined} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date of birth"><Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
                  <Field label="Languages (comma-separated)"><Input value={form.languages} onChange={(e) => set("languages", e.target.value)} /></Field>
                  <div className="sm:col-span-2">
                    <Field label="Bio"><Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={2000} /></Field>
                  </div>
                </CardContent></Card>
              </TabsContent>

              {ctx === "student" && (
                <TabsContent value="academic">
                  <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                    <Field label="College"><Input value={form.college} onChange={(e) => set("college", e.target.value)} /></Field>
                    <Field label="Campus"><Input value={form.campus} onChange={(e) => set("campus", e.target.value)} /></Field>
                    <Field label="Department"><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
                    <Field label="Course"><Input value={form.course} onChange={(e) => set("course", e.target.value)} /></Field>
                    <Field label="Branch"><Input value={form.branch} onChange={(e) => set("branch", e.target.value)} /></Field>
                    <Field label="Specialization"><Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} /></Field>
                    <Field label="Registration number"><Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} /></Field>
                    <Field label="Student ID"><Input value={form.student_id} onChange={(e) => set("student_id", e.target.value)} /></Field>
                    <Field label="Academic year"><Input value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} /></Field>
                    <Field label="Current year"><Input value={form.current_year} onChange={(e) => set("current_year", e.target.value)} /></Field>
                    <Field label="Section"><Input value={form.section} onChange={(e) => set("section", e.target.value)} /></Field>
                    <Field label="Semester"><Input value={form.semester} onChange={(e) => set("semester", e.target.value)} /></Field>
                    <Field label="Admission year"><Input value={form.admission_year} onChange={(e) => set("admission_year", e.target.value)} /></Field>
                    <Field label="Expected graduation"><Input value={form.expected_graduation} onChange={(e) => set("expected_graduation", e.target.value)} placeholder="e.g. May 2027" /></Field>
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Manage detailed education history on the{" "}
                      <a className="text-primary hover:underline" href="/education">Education</a> page.
                    </div>
                  </CardContent></Card>
                </TabsContent>
              )}

              {ctx !== "student" && (
                <TabsContent value="professional">
                  <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                    <Field label={ctx === "faculty" ? "College / Institute" : "Organization"}>
                      <Input
                        value={ctx === "faculty" ? form.college : form.organization_name}
                        onChange={(e) =>
                          ctx === "faculty"
                            ? set("college", e.target.value)
                            : set("organization_name", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Department"><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
                    <Field label="Designation"><Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder={ctx === "faculty" ? "e.g. Assistant Professor" : "e.g. Event Organizer"} /></Field>
                    <Field label="Current position"><Input value={form.current_position} onChange={(e) => set("current_position", e.target.value)} /></Field>
                    <Field label="Years of experience"><Input type="number" min={0} max={80} value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} /></Field>
                    <Field label="Personal website"><Input value={form.personal_website} onChange={(e) => set("personal_website", e.target.value)} /></Field>
                    <div className="sm:col-span-2">
                      <Field label={ctx === "faculty" ? "Areas of expertise (comma-separated)" : "Skills (comma-separated)"}>
                        <Input value={form.technical_skills} onChange={(e) => set("technical_skills", e.target.value)} placeholder={ctx === "faculty" ? "Machine Learning, Data Structures" : "Operations, Sponsorships"} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Soft skills (comma-separated)"><Input value={form.soft_skills} onChange={(e) => set("soft_skills", e.target.value)} placeholder="Leadership, Communication" /></Field>
                    </div>
                    <Field label={ctx === "faculty" ? "CV URL" : "Resume URL"}><Input value={form.resume_url} onChange={(e) => set("resume_url", e.target.value)} /></Field>
                    <Field label="Portfolio URL"><Input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} /></Field>
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Add certifications, publications & awards on the{" "}
                      <a className="text-primary hover:underline" href="/certifications">Certifications</a> page.
                    </div>
                  </CardContent></Card>
                </TabsContent>
              )}

              <TabsContent value="social">
                <Card><CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                  <Field label="LinkedIn"><Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} /></Field>
                  <Field label="GitHub"><Input value={form.github_url} onChange={(e) => set("github_url", e.target.value)} /></Field>
                  <Field label="Twitter / X"><Input value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} /></Field>
                  <Field label="Instagram"><Input value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} /></Field>
                  <Field label="Facebook"><Input value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} /></Field>
                  <Field label="Discord username"><Input value={form.discord_username} onChange={(e) => set("discord_username", e.target.value)} /></Field>
                  {ctx === "student" && (
                    <>
                      <Field label="LeetCode"><Input value={form.leetcode_username} onChange={(e) => set("leetcode_username", e.target.value)} /></Field>
                      <Field label="Codeforces"><Input value={form.codeforces_username} onChange={(e) => set("codeforces_username", e.target.value)} /></Field>
                      <Field label="CodeChef"><Input value={form.codechef_username} onChange={(e) => set("codechef_username", e.target.value)} /></Field>
                      <Field label="HackerRank"><Input value={form.hackerrank_username} onChange={(e) => set("hackerrank_username", e.target.value)} /></Field>
                      <Field label="GeeksforGeeks"><Input value={form.gfg_username} onChange={(e) => set("gfg_username", e.target.value)} /></Field>
                    </>
                  )}
                  {ctx === "faculty" && (
                    <>
                      <Field label="ResearchGate"><Input value={form.researchgate_url} onChange={(e) => set("researchgate_url", e.target.value)} /></Field>
                      <Field label="ORCID"><Input value={form.orcid} onChange={(e) => set("orcid", e.target.value)} /></Field>
                    </>
                  )}
                </CardContent></Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
