// Utsav RBAC — role metadata for UI. The permission catalog itself now lives in the
// database (`public.role_permissions`) and is fetched via `listPermissionCatalog`.
// Keep role labels and descriptions here so they stay under version control.

export const APP_ROLES = [
  "super_admin",
  "platform_admin",
  "admin",
  "org_admin",
  "college_admin",
  "dept_admin",
  "faculty",
  "coordinator",
  "student_coordinator",
  "organizer",
  "judge",
  "mentor",
  "finance",
  "media",
  "sponsor",
  "volunteer",
  "student",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

// Platform admins bypass every check in `public.can()`.
export const PLATFORM_ADMIN_ROLES: readonly AppRole[] = [
  "super_admin",
  "admin",
  "platform_admin",
];

export const ROLE_LABELS: Record<AppRole | "guest", string> = {
  super_admin: "Super Admin",
  platform_admin: "Platform Admin",
  admin: "Admin",
  org_admin: "Organization Admin",
  college_admin: "College Admin",
  dept_admin: "Department Admin",
  faculty: "Faculty",
  coordinator: "Faculty Coordinator",
  student_coordinator: "Student Coordinator",
  organizer: "Event Organizer",
  volunteer: "Volunteer",
  judge: "Judge",
  mentor: "Mentor",
  sponsor: "Sponsor",
  finance: "Finance",
  media: "Media Manager",
  student: "Student",
  guest: "Guest (not signed in)",
};

export const ROLE_DESCRIPTIONS: Record<AppRole | "guest", string> = {
  super_admin: "Highest-privilege platform operator. Bypasses all checks.",
  platform_admin: "Platform operator. Bypasses all checks.",
  admin: "Legacy platform admin. Bypasses all checks.",
  org_admin: "Runs an organization, its events, finance, and staff.",
  college_admin: "Runs a college and its departments and events.",
  dept_admin: "Runs a department's events, staff, and approvals.",
  faculty: "Approves accounts and events, publishes and audits delivery.",
  coordinator: "Faculty coordinator: owns event lifecycle and certificate approvals.",
  student_coordinator: "Student coordinator: assists coordinator with event ops.",
  organizer: "Runs one or more events end-to-end within their scope.",
  volunteer: "Assists on-site; performs QR / manual attendance check-in.",
  judge: "Evaluates and scores submissions for a specific event.",
  mentor: "Guides teams and shares mentoring resources on a specific event.",
  sponsor: "Views sponsor-facing analytics and reports for their event.",
  finance: "Handles revenue, payments, refunds, invoices, and financial exports.",
  media: "Uploads, approves, and manages event media (images, video, docs).",
  student: "Registers for events, joins teams, submits projects, earns certificates.",
  guest: "Anonymous visitor. Sees only public events and certificate verification.",
};

// Cell types used by the matrix UI. Derived at render time from `role_permissions`.
export type MatrixCell = "G" | "E" | "-";

// Category → display label for the grouped matrix render.
export const CATEGORY_LABELS: Record<string, string> = {
  events: "Events",
  registration: "Registration",
  teams: "Teams",
  projects: "Projects & Submissions",
  attendance: "Attendance",
  certificates: "Certificates",
  users: "Users",
  organizations: "Organizations",
  finance: "Finance",
  media: "Media",
  notifications: "Notifications",
  reports: "Reports & Analytics",
  audit: "Audit",
  settings: "Settings",
};

export const CATEGORY_ORDER = [
  "events",
  "registration",
  "teams",
  "projects",
  "attendance",
  "certificates",
  "media",
  "notifications",
  "reports",
  "finance",
  "users",
  "organizations",
  "audit",
  "settings",
] as const;

// Compute a matrix cell for (role, permission-row) given the DB catalog.
export function cellFor(
  role: AppRole | "guest",
  row: {
    global_roles: string[];
    event_roles: string[];
    is_public: boolean;
    is_self_service: boolean;
  },
): MatrixCell {
  if (row.is_public) return "G";
  if (role === "guest") return "-";
  if ((PLATFORM_ADMIN_ROLES as readonly string[]).includes(role)) return "G";
  if (row.is_self_service) return "G";
  if (row.global_roles.includes(role)) return "G";
  if (row.event_roles.includes(role)) return "E";
  return "-";
}
