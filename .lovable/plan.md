
# EventGo v1 — Foundation Phase Plan

## Gap analysis of `aditya-eventgo-main.zip`

The uploaded repo is **Vite + React Router DOM + Express + AWS DynamoDB + Cognito**, not TanStack/Prisma/Clerk. It contains:

**Frontend (`src/`)** — 22 pages (Dashboards for Student/Organizer/Judge/Mentor/College/Admin, Events, EventDetail, CreateEvent, Hackathons, Analytics, Auth flow, Profile), ~15 feature components (QRCheckIn, TeamManagement, SubmissionForm, JudgingPanel, Leaderboard, EventPermissionsManager, EventRegistrationDialog, NotificationBell, EventMediaUpload, etc.), dual auth contexts (Supabase + Cognito).

**Backend (`backend/server.js`, 2452 lines)** — monolithic Express server against DynamoDB with tables: USERS, EVENTS, USER-ROLES (event-scoped), REGISTRATIONS, TEAMS, SUBMISSIONS, SCORES, NOTIFICATIONS. Middleware `authorizeRole` enforces the 7-role matrix.

**RBAC matrix (from `docs/RBAC_MATRIX.md`)** — 7 roles: Student, Volunteer, Organizer, Coordinator, Judge, Faculty, Admin. Roles are **event-scoped** (PK=event_id, SK=user_id) with a `GLOBAL` scope for Admin. This is the key business rule to preserve.

**Status per repo's own docs** — RBAC/Events/Registrations/Teams/Submissions/Judging done; Certificates, Schedules, Notifications-fanout, Zod validation, S3 presign integration are gaps.

**What must be preserved:** the 7-role event-scoped RBAC model, the domain tables above, feature parity of the 22 pages.

**What must change (stack migration):** DynamoDB → Postgres (Lovable Cloud), Cognito → Supabase Auth, Express → TanStack `createServerFn` + `/api/public/*` routes, React Router DOM → TanStack Router file routes, AWS SDK → Lovable Cloud storage + connectors.

## Foundation phase — what I will build now

Scope: identity + authorization core, end-to-end, so every later module plugs in without rework. No event features yet.

### 1. Enable Lovable Cloud
Enables Supabase auth, Postgres, migrations, secrets, storage. Configure Google + email/password (matches your spec's defaults). No Clerk.

### 2. Database schema (one migration)

```text
profiles                — id (=auth.users.id), email, full_name, avatar_url, phone,
                          college, department, is_active, created_at, updated_at
organizations           — id, name, slug, type (college|department|club|external),
                          parent_org_id, created_by, created_at
org_members             — org_id, user_id, joined_at (PK composite)
app_role (enum)         — student, volunteer, organizer, coordinator, judge, faculty, admin
role_scope (enum)       — global, organization, event
user_roles              — id, user_id, role app_role, scope role_scope,
                          scope_id uuid NULL (org_id or event_id; NULL for global),
                          granted_by, granted_at, expires_at NULL,
                          UNIQUE(user_id, role, scope, scope_id)
permission_delegations  — id, delegator_user_id, delegate_user_id, role, scope, scope_id,
                          expires_at, revoked_at, created_at   (time-bounded grants)
audit_logs              — id, actor_user_id, action, resource_type, resource_id,
                          metadata jsonb, ip, user_agent, created_at
```

All tables get explicit `GRANT`s + RLS. Roles stored in a **separate table** (never on profiles) per platform rules.

### 3. Security-definer authorization functions

```sql
public.has_global_role(_uid, _role)              -- global admin/faculty check
public.has_role_in_org(_uid, _role, _org_id)     -- org-scoped
public.has_role_in_event(_uid, _role, _event_id) -- event-scoped, matches DynamoDB semantics
public.can(_uid, _action text, _event_id uuid)   -- combines the 3 above with permission matrix + active delegations
```

`can()` encodes the RBAC matrix exactly as `docs/RBAC_MATRIX.md` specifies. All RLS policies call `can()` — no policy queries its own table (avoids recursion).

### 4. Auto-provision profile + default role on signup
Trigger on `auth.users` → insert `profiles` row + `user_roles(role=student, scope=global)`.

### 5. Server-side authorization layer

- `src/lib/authz.functions.ts` — `checkPermission({ action, eventId? })` server fn using `requireSupabaseAuth`, calls `can()`.
- `src/lib/audit.server.ts` — `logAudit(actor, action, resource, meta)` for every privileged action.
- `src/lib/authz-middleware.ts` — `requirePermission(action)` composable server-fn middleware.

### 6. Frontend auth UX (foundation only — no event pages)

- `/` — public landing (replace placeholder) with sign-in CTA + session-aware header.
- `/auth` — email/password + Google sign-in (managed).
- `/auth/callback` — Supabase OAuth return, redirects to `next`.
- `/reset-password` — password reset landing.
- `src/routes/_authenticated/route.tsx` — integration-managed protected layout.
- `src/routes/_authenticated/dashboard.tsx` — post-login home showing user's roles/orgs.
- `src/routes/_authenticated/admin/users.tsx` — admin-only user + role management (assign/revoke roles, view audit trail, delegate permissions). Gated by `has_global_role('admin')`.
- `src/routes/_authenticated/profile.tsx` — profile management.
- Session-aware `<Header>` component (sign-in ↔ account menu with sign-out).
- Root `onAuthStateChange` listener; correct sign-out hygiene.

### 7. SEO baseline
Real `head()` metadata in `__root.tsx` (title "EventGo — Event Management Platform", description, og/twitter), `sitemap.xml`, `robots.txt`.

### 8. Explicit non-goals for this phase
Events, Registrations, Teams, Submissions, Judging, Attendance, QR, Certificates, Notifications fan-out, Payments, Analytics, MCP server, Search, Reports — all shipped in subsequent phases on top of this foundation. I will not touch the placeholder event pages.

## Technical details

- **Stack**: TanStack Start (existing) + Lovable Cloud (Supabase) + Cloudflare Workers runtime. No Prisma — Supabase-typed queries. No Clerk — Supabase Auth. No Neon/Railway.
- **Repo strategy**: I do NOT copy the uploaded `src/pages/*` files. They target React Router DOM + a DynamoDB REST backend that does not exist here; porting them one-by-one to TanStack file routes with the new server layer happens in the Events phase. The uploaded repo becomes the reference for feature parity and RBAC semantics, not a code drop.
- **Auth roles table**: separate `user_roles` table with security-definer functions — non-negotiable per platform security rules; prevents privilege escalation.
- **Audit logging**: every role grant, delegation, and privileged action written to `audit_logs`.
- **RLS**: enabled on every public-schema table; every policy uses `can()` or `auth.uid()` — no self-referential queries.
- **Migration doc**: I add `docs/MIGRATION_FROM_DYNAMODB.md` mapping each DynamoDB table + endpoint to the new Postgres schema + server fn, so subsequent phases can port endpoints deterministically.

## After this phase

Next phase (Events + Registrations MVP) can be built entirely on top of `can()`, `requirePermission`, and `audit_logs` without changing any foundation code. Certificates, QR check-in, submissions, judging each become one migration + one server-fn module + one route.
