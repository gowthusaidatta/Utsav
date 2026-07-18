# Audit — Event creation end-to-end

## Root cause

Two issues blocked "admins cannot add events":

1. **No visible entry point.** The `/events/new` page and `createEvent` server
   function worked end-to-end for authenticated users, but the only UI link
   was buried on `/my-events`. Admins landing on `/` or `/dashboard` had no
   affordance to reach it — the button appeared missing.
2. **RLS was over-permissive.** The `events` INSERT policy allowed *any*
   authenticated user (including students, judges, volunteers) to create
   events, violating the required RBAC matrix. There was no server-side
   pre-check either.

## Fixes shipped

- New SQL helper `public.can_create_event(uid)` — true for admin, faculty,
  organizer, coordinator (global or scoped), and anyone with an active
  `permission_delegations` row granting one of those roles.
- `public.can()` extended with the `create_event` action, delegating to
  `can_create_event`.
- Replaced the `events` INSERT policy `"Authenticated users can create events"`
  with `"Authorized users can create events"` — `WITH CHECK (auth.uid() =
  created_by AND public.can_create_event(auth.uid()))`. Students, judges,
  volunteers, guests are now denied at the database layer.
- `createEvent` server function pre-checks `can(create_event)` via RPC and
  returns a clean forbidden error rather than a raw RLS violation.
- Dashboard now renders a **New event** button for eligible users
  (admin/faculty/organizer/coordinator) plus a **My events** link for all.
- Header dropdown gains **My events** and **New event** entries so every
  signed-in surface can reach the flow.

## Authorized vs denied roles

| Role | Can create? |
| --- | --- |
| admin (global) | ✅ |
| faculty (global) | ✅ |
| organizer (global or scoped) | ✅ |
| coordinator (global or scoped) | ✅ |
| Anyone with active delegation of the above | ✅ |
| student | ❌ (RLS + server + `can()` all deny) |
| volunteer | ❌ |
| judge | ❌ |
| guest / anon | ❌ |

## Verification

Reproduced end-to-end as global admin `memorablephotos0099@gmail.com` via
Playwright against the running preview: `/events/new` → filled title +
description → **Create draft** → server function `createEvent` returned
`200` with `{ id, slug }`, router navigated to `/events/:id/manage`, row
inserted into `public.events`, audit row logged (`event.created`).

Unauthorized denial is enforced by RLS + `can()`; UI hides the primary CTA
for students on the dashboard, but even if bypassed, the server returns
`Forbidden: your role does not permit creating events…` and the RLS
`WITH CHECK` blocks the insert.
