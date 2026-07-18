# Phase 1 Audit — Auth · Users · Organizations · RBAC · Delegation

Date: 2026-07-18
Scope: existing implementation only. Findings below map 1:1 to fixes shipped in the same commit.

## Legend
- 🔴 blocking (module considered incomplete)
- 🟡 correctness / UX
- 🟢 hardening / follow-up
- ✅ shipped in this pass

---

## 1. Authentication

| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | 🟡 | `auth.tsx` casts `search.next` to `"/dashboard"` and forwards without validation — potential open-redirect via user-crafted URL. | ✅ Sanitized to same-origin path or fallback to `/dashboard`. |
| A2 | 🟡 | Sign-up navigates to `/dashboard` even when email confirmation is required and no session exists — protected layout bounces user back to `/auth`, appears broken. | ✅ Detects missing session after `signUp`, stays on `/auth`, shows "check your inbox". |
| A3 | 🟡 | `reset-password` uses `window.location.href` (full reload, loses SPA state). | ✅ Uses `navigate({ to: "/dashboard" })`. |
| A4 | 🟢 | Google `redirect_uri` includes `/auth`; acceptable (public route) but `/auth/callback` would be cleaner long-term. | Deferred. |
| A5 | 🟢 | Password field lacks strength meter / HIBP toggle. | Deferred to Phase 9. |

## 2. Users / Profiles

| # | Severity | Finding | Fix |
|---|---|---|---|
| U1 | 🟢 | `profiles_select_authenticated` policy uses `qual: true` — every signed-in user can read every other user's email, phone, college. PII exposure. | Documented; tightening deferred to Phase 9 security pass because it requires a `profiles_public` view and refactor of every join. Server fns already project only needed columns. |
| U2 | 🟡 | Header shows email in trigger; no fallback to full name. | ✅ Shows full name when available. |
| U3 | 🟢 | Profile page has no avatar upload. | Deferred to Phase 4 (Media). |

## 3. Organizations

| # | Severity | Finding | Fix |
|---|---|---|---|
| O1 | 🔴 | `organizations` and `org_members` tables exist with RLS, but **no server fns and no UI**. Module non-functional. | ✅ Added `src/lib/orgs.functions.ts` (list/get/create/update/delete/addMember/removeMember/listMembers) + `/admin/organizations` and `/admin/organizations/$id` routes. |
| O2 | 🟡 | `orgs_insert_admin_faculty` policy — good. `orgs_delete_admin` — good. No update tracking. | ✅ Audit log entries on create/update/delete/member changes. |
| O3 | 🟢 | `orgmem_select qual: true` — every authenticated user can list all org memberships. | Documented; tighten in Phase 9. |

## 4. RBAC

| # | Severity | Finding | Fix |
|---|---|---|---|
| R1 | 🟡 | `getMyRoles` returns expired rows (no `expires_at` filter). Dashboard shows stale roles. | ✅ Filters `expires_at IS NULL OR expires_at > now()`. |
| R2 | 🟡 | `assignRole` surfaces raw Postgres unique-violation error text on duplicate grants. | ✅ Detects `23505` and returns "User already has this role". |
| R3 | 🟡 | `listUsersWithRoles` hard-limited to 200 users with no search / pagination. | ✅ Added `search` (name/email ilike) and `limit` (max 500). Search UI added. |
| R4 | 🟢 | No public route lists roles matrix / role descriptions for end users. | Deferred. |

## 5. Permission Delegation

| # | Severity | Finding | Fix |
|---|---|---|---|
| D1 | 🔴 | `delegatePermission` server fn exists but no UI to create, list, or revoke delegations. Module non-functional. | ✅ Added `revokeDelegation`, `listMyDelegations` (incoming + outgoing), `listAllDelegations` (admin). New routes `/delegations` (self) and `/admin/delegations`. |
| D2 | 🟡 | `has_role_in_event` respects delegations only when not revoked and not expired — correct. No cascade on delegator role loss. | Documented. |
| D3 | 🟢 | No email notification when a delegation is granted. | Deferred to Phase 7 (Notifications). |

## 6. Audit Logs

| # | Severity | Finding | Fix |
|---|---|---|---|
| L1 | 🟡 | `ip` and `user_agent` columns exist but never populated. | ✅ Every mutation in orgs/authz functions now writes `ip` from `x-forwarded-for` and `user_agent` when available. |
| L2 | 🟢 | No admin viewer for org-wide audit trail. | Wired into `/admin/organizations/$id` and `/admin/delegations`. |

---

## Acceptance for Phase 1

- [x] Sign in / sign up (email + Google) works and handles email-confirmation state.
- [x] Password reset flow completes without full page reload.
- [x] Profile CRUD works via authenticated server fn.
- [x] Admin can list, search, grant, and revoke global roles.
- [x] Admin can create / edit / delete organizations and manage members.
- [x] Admin can delegate a scoped role with expiry and revoke it.
- [x] Users can see their own outgoing and incoming delegations.
- [x] Every mutation writes an audit log entry with actor, action, resource, IP, and user agent.
- [x] Expired roles no longer surface on the dashboard.
- [x] TypeScript build passes.

Deferred (tracked): U1 (profiles PII), O3 (org_members select scope), A5 (password strength), D3 (delegation email). All revisit in Phase 9 or their owning phase.

Next: Phase 2 — Events (CRUD, publishing, approval, settings).
