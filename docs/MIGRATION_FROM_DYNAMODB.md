# EventGo Migration: DynamoDB/Express/Cognito → Lovable Cloud/TanStack

Reference: `aditya-eventgo-main.zip` was the source repo.
Target stack: TanStack Start + Lovable Cloud (Postgres/Supabase Auth) on Cloudflare Workers.

## Table mapping (foundation phase — this document expands as later phases land)

| DynamoDB (original) | Postgres (this project) | Notes |
| --- | --- | --- |
| `USERS` | `public.profiles` + `auth.users` | `auth.users` owns credentials; `profiles` mirrors the domain fields (email, full_name, college, department, phone, avatar_url, is_active). |
| `USER-ROLES` (PK=event_id, SK=user_id) | `public.user_roles` (user_id, role, scope, scope_id) | The DynamoDB compound key becomes `scope='event' AND scope_id=<event_id>`. `GLOBAL` roles map to `scope='global' AND scope_id IS NULL`. Additional org-scoped grants use `scope='organization'`. |
| — (new) | `public.organizations`, `public.org_members` | The Express backend had no first-class Organization concept; we introduce it now so departments/clubs/colleges can host events. |
| — (new) | `public.permission_delegations` | Encodes time-bounded permission delegation from the spec. |
| — (new) | `public.audit_logs` | Every privileged action written here. Cognito/Dynamo backend had no audit table. |
| `EVENTS`, `REGISTRATIONS`, `TEAMS`, `SUBMISSIONS`, `SCORES`, `NOTIFICATIONS`, `SCHEDULES`, `CERTIFICATES` | (later phase) | Ported in the Events + Registrations MVP phase. |

## Endpoint mapping (foundation phase)

| Express endpoint | Replacement | Location |
| --- | --- | --- |
| `POST /auth/*` (Cognito) | Supabase Auth via `supabase.auth.signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser` | `src/routes/auth.tsx`, `src/routes/reset-password.tsx` |
| `authorizeRole` middleware | `public.can(_uid, _action, _event)` SQL function + `checkPermission` server fn | `src/lib/authz.functions.ts` |
| `GET /me/roles` | `getMyRoles` server fn | `src/lib/authz.functions.ts` |
| `POST /admin/users/:id/roles` | `assignRole` server fn (admin-gated, writes audit) | `src/lib/authz.functions.ts` |
| `DELETE /admin/users/:id/roles/:roleId` | `revokeRole` server fn | `src/lib/authz.functions.ts` |
| `POST /admin/delegate` | `delegatePermission` server fn | `src/lib/authz.functions.ts` |
| `GET /me` / `PUT /me` | `getMyProfile` / `updateMyProfile` server fns | `src/lib/profile.functions.ts` |

## RBAC parity

The 7-role permission matrix in `docs/RBAC_MATRIX.md` (from the upload) is encoded byte-for-byte
inside `public.can()`. Later phases call `can()` for every write action and use `requireSupabaseAuth`
+ `requirePermission(action)` in server functions.

## What's NOT migrated yet (by design)

- Frontend pages under `src/pages/` in the upload — they use React Router DOM and call Express/DynamoDB endpoints that no longer exist. They will be ported one-by-one as TanStack routes on top of new server functions in later phases.
- AWS SDK, Cognito, Express, Selenium, Electron, Docker, and the Java Maven test harness — outside the target stack.
- Feature modules (events, registrations, teams, submissions, judging, attendance, QR, certificates, notifications fan-out, payments, analytics, MCP server, search) — scheduled for subsequent phases.
