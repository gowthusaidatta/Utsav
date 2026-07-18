# Audit — Role & permissions matrix (16 roles)

## What shipped

- **Extended `app_role` enum** with 9 new values so we can grant the roles
  you named: `super_admin`, `platform_admin`, `org_admin`, `college_admin`,
  `dept_admin`, `mentor`, `sponsor`, `finance`, `media`. Existing 7 values
  (`student`, `volunteer`, `organizer`, `coordinator`, `judge`, `faculty`,
  `admin`) unchanged. `guest` is not a stored role — it means "not signed in"
  and is enforced by RLS.
- **`is_platform_admin(uid)`** — treats `admin`, `super_admin`, and
  `platform_admin` as equivalent top-tier roles. All three short-circuit
  `can()` to `true`.
- **`has_any_global_role(uid, text[])`** / **`has_any_role_in_event(uid, text[], event)`**
  — set-based helpers so `can()` can name several eligible roles per action.
- **`can_create_event(uid)`** widened: platform-level admins, org/college/dept
  admins, faculty, organizer, coordinator (or anyone with a matching active
  delegation) can create events. Students, volunteers, judges, mentors,
  sponsors, finance, media, guests are denied — enforced by both the RLS
  `WITH CHECK` on `events` INSERT and a server-side pre-check in `createEvent`.
- **`can()`** rewritten with an explicit per-action matrix (20 actions × 16
  roles). See `src/lib/rbac-matrix.ts` for the mirrored TypeScript matrix.

## Surfaces

- **`/admin/users`** role picker now offers all 16 roles with human labels.
- **`/admin/role-matrix`** — new page. Two views:
  1. **Live verification** — calls the new `verifyMyPermissions` server fn,
     which iterates every action through `public.can()` server-side and shows
     ✓/✗ for the signed-in user. This is the "actually working" proof.
  2. **Full matrix** — the 16 × 20 grid rendered from the SOURCE-OF-TRUTH
     table with three states: allowed globally (G), event-scoped only (E),
     denied (—).
- **Dashboard** gains a "Role matrix" quick-link for admins.

## Action → role mapping (summary)

| Action                | Platform admins* | Faculty | Org/College/Dept admin | Organizer | Coordinator | Volunteer | Judge | Mentor | Sponsor | Finance | Media | Student | Guest |
|-----------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| view_event            | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| register / create_team / submit_project | ✓ | – | – | – | – | – | – | – | – | – | – | ✓ | – |
| create_event          | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | – |
| edit_event            | ✓ | ✓ | ✓ | E | E | – | – | – | – | – | – | – | – |
| publish_event         | ✓ | ✓ | ✓ | – | E | – | – | – | – | – | – | – | – |
| manage_teams / approve_registration | ✓ | ✓ | ✓ | E | E | – | – | – | – | – | – | – | – |
| score_submissions     | ✓ | – | – | – | – | – | E | – | – | – | – | – | – |
| check_in              | ✓ | ✓ | ✓ | E | E | E | – | – | – | – | – | – | – |
| issue_certificates    | ✓ | ✓ | ✓ | – | E | – | – | – | – | – | – | – | – |
| delete_event          | ✓ | ✓ | – | – | – | – | – | – | – | – | – | – | – |
| manage_users          | ✓ | – | – | – | – | – | – | – | – | – | – | – | – |
| manage_organizations  | ✓ | – | Org/College | – | – | – | – | – | – | – | – | – | – |
| view_finance          | ✓ | – | Org only | – | – | – | – | – | – | ✓ | – | – | – |
| manage_media          | ✓ | ✓ | ✓ | E | E | – | – | – | – | – | ✓ | – | – |
| mentor_teams          | ✓ | – | – | – | – | – | – | E | – | – | – | – | – |
| sponsor_view          | ✓ | – | – | – | – | – | – | – | ✓/E | – | – | – | – |
| view_audit_logs       | ✓ | ✓ | Org/College | – | – | – | – | – | – | – | – | – | – |

*Platform admins = `admin`, `super_admin`, `platform_admin` (equivalent).
E = allowed only via a scoped `user_roles` row or active delegation on that
specific event.

## Verification

- Enum values confirmed via `SELECT enum_range(NULL::app_role)` — all 16
  literals present.
- End-to-end verified live from the signed-in admin browser session: the
  `verifyMyPermissions` server function walked all 20 actions through
  `public.can()` and returned the expected admin ✓ result set.
- Event creation continues to pass (see `docs/AUDIT_EVENT_CREATE.md`).

## What this does NOT do

- It does not automatically demote existing users. Anyone previously granted
  `admin` remains admin; you can now additionally grant the new roles.
- Attaching org/college/dept admins to specific organizations is still
  modelled through `user_roles.scope='organization'` + `scope_id`. UI for
  scoped org assignments is a follow-up.
- The `super_admin` and `platform_admin` labels are aliases of `admin` in
  `can()`. If you want a strict hierarchy where `super_admin` can promote
  `platform_admin` but not vice versa, that's a follow-up policy layer on
  `assignRole`.
