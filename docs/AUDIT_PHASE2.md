# Phase 2 Audit — Events Module

Status: shipped. Templates deferred to Phase 2b (requires migration).

## Fixes applied
- **Status transitions enforced server-side.** New `changeEventStatus` server fn is the only path to change `status`; a transition table blocks illegal moves. `updateEvent` no longer accepts a `status` field from clients.
- **Approval workflow.** Organizers submit `draft → pending_approval`. Faculty/admin (or event coordinators) publish `pending_approval → published`. Rejection sends back to draft with an audit entry. Faculty/admin can override the transition table.
- **Publish-readiness validation.** Title, description (≥ 20 chars), start_at, end_at, and either venue or meeting_url are required before an event can move to `published`. `end_at` must be after `start_at` on any save.
- **Manage form gaps closed.** Added `tags`, `registration_deadline`, `meeting_url`, `cover_image_url` fields. Meeting URL replaces venue for online events. Currency uppercased and length-capped.
- **`published_at` stamped** automatically on publish.
- **Duplicate event.** New `duplicateEvent` clones an event as a fresh draft with cleared dates.
- **`listMyEvents` status filter.** UI now filters by status; server fn accepts optional `status` param.
- **Public browse search.** `/events` gains a search + category filter UI wired to URL search params (SSR-safe, cache-keyed).
- **Approval queue.** New `/admin/approvals` route for faculty/admin lists all `pending_approval` events with Approve / Reject actions.
- **Dashboard quick-links.** Faculty now see the approvals link; admin sees users/orgs/delegations/approvals.
- **Cancel button fix.** New Event page uses `navigate({ to: "/my-events" })` instead of `router.history.back()` — no dead-end when opened directly.
- **ILIKE search hardening.** `%` and `_` in the query are escaped before OR-search.
- **Server publishable client hardened** for opaque `sb_*` keys (apikey-only header).

## Server functions
- `listPublicEvents`, `getEventBySlug` — public, publishable client, RLS as anon.
- `listMyEvents`, `getEventById` — authenticated, RLS as user.
- `createEvent`, `updateEvent`, `deleteEvent`, `duplicateEvent` — authenticated, audited.
- `changeEventStatus` — authenticated, transition + role + publish-readiness checks, audited.
- `listPendingApproval` — faculty/admin only.

## RBAC
Existing policies unchanged (they already delegate to `can()`). New role checks in `changeEventStatus`:
- Direct `draft → published`: coordinator (event-scoped), faculty, or admin.
- `pending_approval → published`: same.
- Anything else: transition table, enforced.

## Deferred to Phase 2b
- **Event Templates.** New `event_templates` table + CRUD + "Create from template" flow. Requires a migration.
- **Cover image upload.** Blocked on Phase 4 (Media & Storage buckets).
