// Utsav RBAC — 16-role permission matrix (SOURCE OF TRUTH mirrored in SQL `public.can()`).
// Keep this file in sync with the migration that rewrites can(); breaking either side
// silently mis-authorizes users, so update both in the same change.

export const APP_ROLES = [
  "super_admin",
  "platform_admin",
  "admin",
  "org_admin",
  "college_admin",
  "dept_admin",
  "faculty",
  "organizer",
  "coordinator",
  "volunteer",
  "judge",
  "mentor",
  "sponsor",
  "finance",
  "media",
  "student",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

// Guest is unauthenticated — no stored role. Listed for docs/UI only.
export const ROLE_LABELS: Record<AppRole | "guest", string> = {
  super_admin: "Super Admin",
  platform_admin: "Platform Admin",
  admin: "Admin",
  org_admin: "Organization Admin",
  college_admin: "College Admin",
  dept_admin: "Department Admin",
  faculty: "Faculty",
  organizer: "Organizer",
  coordinator: "Coordinator",
  volunteer: "Volunteer",
  judge: "Judge",
  mentor: "Mentor",
  sponsor: "Sponsor",
  finance: "Finance",
  media: "Media",
  student: "Student",
  guest: "Guest (not signed in)",
};

export const ROLE_DESCRIPTIONS: Record<AppRole | "guest", string> = {
  super_admin: "Highest-privilege platform operator. Bypasses all checks.",
  platform_admin: "Platform operator. Bypasses all checks.",
  admin: "Platform administrator. Bypasses all checks.",
  org_admin: "Manages an organization, its events and staff.",
  college_admin: "Manages a college and its departments/events.",
  dept_admin: "Manages a department's events and staff.",
  faculty: "Approves/publishes events, oversees delivery.",
  organizer: "Runs one or more events end-to-end.",
  coordinator: "Coordinates staff and approves submissions for an event.",
  volunteer: "Assists on-site; checks attendees in.",
  judge: "Scores submissions for an event.",
  mentor: "Guides teams on an event.",
  sponsor: "Sponsor of an event; views sponsor-facing dashboards.",
  finance: "Views revenue, payments, refunds, financial exports.",
  media: "Manages media library (images, videos, documents).",
  student: "Registers for events, joins teams, submits projects.",
  guest: "Anonymous visitor. Browses only public events.",
};

// Actions used by `public.can()`. E = event-scoped (needs an event id).
export const ACTIONS = [
  "view_event",
  "register",
  "create_team",
  "submit_project",
  "create_event",
  "edit_event",
  "publish_event",
  "manage_teams",
  "approve_registration",
  "score_submissions",
  "check_in",
  "issue_certificates",
  "delete_event",
  "manage_users",
  "manage_organizations",
  "view_finance",
  "manage_media",
  "mentor_teams",
  "sponsor_view",
  "view_audit_logs",
] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<Action, string> = {
  view_event: "View event",
  register: "Register for an event",
  create_team: "Create a team",
  submit_project: "Submit a project",
  create_event: "Create event",
  edit_event: "Edit event",
  publish_event: "Publish event",
  manage_teams: "Manage teams",
  approve_registration: "Approve registrations",
  score_submissions: "Score submissions",
  check_in: "Check attendees in",
  issue_certificates: "Issue certificates",
  delete_event: "Delete event",
  manage_users: "Manage users",
  manage_organizations: "Manage organizations",
  view_finance: "View finance",
  manage_media: "Manage media library",
  mentor_teams: "Mentor teams",
  sponsor_view: "Sponsor dashboard",
  view_audit_logs: "View audit logs",
};

// "G" = allowed at global scope; "E" = allowed only for scoped assignments on
// the specific event; "-" = denied. Platform admins are pre-authorized in can()
// so their column is "G" everywhere. Mirrors the SQL matrix exactly.
type Cell = "G" | "E" | "-";
export const MATRIX: Record<AppRole | "guest", Record<Action, Cell>> = {
  super_admin:    all("G"),
  platform_admin: all("G"),
  admin:          all("G"),

  org_admin: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "G", edit_event: "G", publish_event: "G",
    manage_teams: "G", approve_registration: "G", score_submissions: "-",
    check_in: "G", issue_certificates: "G", delete_event: "-",
    manage_users: "-", manage_organizations: "G", view_finance: "G",
    manage_media: "G", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "G",
  },
  college_admin: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "G", edit_event: "G", publish_event: "G",
    manage_teams: "G", approve_registration: "G", score_submissions: "-",
    check_in: "G", issue_certificates: "G", delete_event: "-",
    manage_users: "-", manage_organizations: "G", view_finance: "-",
    manage_media: "G", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "G",
  },
  dept_admin: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "G", edit_event: "G", publish_event: "G",
    manage_teams: "G", approve_registration: "G", score_submissions: "-",
    check_in: "G", issue_certificates: "G", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "G", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  faculty: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "G", edit_event: "G", publish_event: "G",
    manage_teams: "G", approve_registration: "G", score_submissions: "-",
    check_in: "G", issue_certificates: "G", delete_event: "G",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "G", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "G",
  },
  organizer: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "G", edit_event: "E", publish_event: "-",
    manage_teams: "E", approve_registration: "E", score_submissions: "-",
    check_in: "E", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "E", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  coordinator: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "G", edit_event: "E", publish_event: "E",
    manage_teams: "E", approve_registration: "E", score_submissions: "-",
    check_in: "E", issue_certificates: "E", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "E", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  volunteer: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "E", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "-", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  judge: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "E",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "-", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  mentor: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "-", mentor_teams: "E", sponsor_view: "-", view_audit_logs: "-",
  },
  sponsor: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "-", mentor_teams: "-", sponsor_view: "G", view_audit_logs: "-",
  },
  finance: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "G",
    manage_media: "-", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  media: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "G", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  student: {
    view_event: "G", register: "G", create_team: "G", submit_project: "G",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "-", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
  guest: {
    view_event: "G", register: "-", create_team: "-", submit_project: "-",
    create_event: "-", edit_event: "-", publish_event: "-",
    manage_teams: "-", approve_registration: "-", score_submissions: "-",
    check_in: "-", issue_certificates: "-", delete_event: "-",
    manage_users: "-", manage_organizations: "-", view_finance: "-",
    manage_media: "-", mentor_teams: "-", sponsor_view: "-", view_audit_logs: "-",
  },
};

function all(v: Cell): Record<Action, Cell> {
  return Object.fromEntries(ACTIONS.map((a) => [a, v])) as Record<Action, Cell>;
}
