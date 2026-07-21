# Utsav v1.0 — Feature Completion Matrix & Gap Analysis

Legend: ✅ Complete · 🟡 Partial · 🔴 Missing · ⏸ Deferred (product decision)

Source of truth: current codebase (`src/`, `supabase/migrations/`) vs the v1.0
product specification. Updated as modules land.

---

## 1. Authentication & Identity

| Feature | State | Notes |
|---|---|---|
| Email + password | ✅ | `src/routes/auth.tsx` |
| Google OAuth | ✅ | Lovable managed broker |
| GitHub / Apple / Microsoft | 🔴 | Not supported in Lovable Cloud (GitHub); Apple/Microsoft require `configure_social_auth`. |
| OTP / Phone | 🔴 | Requires Twilio + `configure_auth`. |
| Password reset | ✅ | `/reset-password` |
| Email verification | 🟡 | Supabase-managed; UI copy exists. Needs re-send button + status page. |
| 2FA / MFA | 🔴 | Enrol UI + Supabase MFA API not wired. |
| Session / device list | 🔴 | Not implemented. |
| Account deletion | 🔴 | Not implemented. |
| Profile completion gate | 🟡 | Roll/faculty ID collected on signup; no "complete your profile" nag. |
| Sign-in state in header | ✅ | `Header.tsx` |
| RBAC (16 roles) | ✅ | `docs/AUDIT_ROLE_MATRIX.md` |
| Role hierarchy enforcement | ✅ | `role_rank` / `can_assign_role` |
| Identity uniqueness + immutability | ✅ | `profiles_protect_identity` trigger |

## 2. Profile

| Feature | State | Notes |
|---|---|---|
| Basic fields (name, email, phone, college, dept, roll) | ✅ | `profiles` table |
| Avatar upload | 🟡 | Column exists; no upload widget on profile page. |
| Cover image | 🔴 | |
| Bio / skills / interests | 🔴 | |
| Social links / portfolio | 🔴 | |
| Certificates / achievements / badges | 🟡 | Certificates issue+verify done; no profile display. |
| Preferences (theme/lang/tz/notifications) | 🟡 | Theme ✅; language/tz/notif prefs 🔴. |
| Privacy settings | 🔴 | |
| Activity history | 🔴 | Audit log exists per admin; user-facing feed missing. |

## 3. Dashboards

| Role | State | Notes |
|---|---|---|
| Participant | 🟡 | Generic dashboard exists; not tailored. |
| Organizer | 🟡 | Reuses generic dashboard. |
| Admin | 🟡 | Admin routes exist; no consolidated cockpit. |
| Finance / Judge / Volunteer / Sponsor | 🔴 | |
| Statistics + charts | 🟡 | Basic counts; no charts (Recharts). |
| Recent activity feed | 🔴 | |
| Tasks / upcoming | 🟡 | Upcoming events yes; tasks no. |

## 4. Events

| Feature | State | Notes |
|---|---|---|
| Create / edit / publish / draft / cancel | ✅ | Strict lifecycle transitions. |
| Faculty/admin approval queue | ✅ | `admin.approvals.tsx` |
| Duplicate / clone | 🟡 | MCP tool `duplicate-event` exists; no UI button. |
| Archive / restore | 🟡 | MCP tool; no UI. |
| Delete | ✅ | |
| Import / export event | 🔴 | Exports at registration level only. |
| Templates | 🔴 | |
| Categories / subcategories / tags | 🟡 | Single `category` column; no multi-tag. |
| Banner | ✅ | URL only; no upload widget. |
| Gallery | 🔴 | |
| Documents / resources | 🟡 | `media` table supports attach; no UI on event page. |
| Venue / map / location | 🟡 | Text field; no map picker. |
| Online meeting link | 🟡 | Free-text URL. |
| Capacity / unlimited | ✅ | |
| Registration dates | ✅ | |
| Timezone | 🟡 | UTC stored; no per-event tz picker. |
| Schedule / agenda | 🔴 | |
| Tracks / sessions | 🔴 | |
| Speakers | 🔴 | |
| Sponsors / partners | 🔴 | |
| Rules / FAQs | 🔴 | |
| Announcements | 🔴 | Notifications infra ready; broadcast UI missing. |
| Feedback / ratings / reviews | 🔴 | |
| SEO metadata + OG image | ✅ | Per-route `head()`. |

## 5. Registrations

| Feature | State | Notes |
|---|---|---|
| Solo | ✅ | |
| Team | ✅ | |
| Approval-based | 🟡 | Data model supports pending/approved; no approver UI. |
| Waitlist | 🔴 | |
| Capacity enforcement | ✅ | Server-side. |
| QR ticket | ✅ | Verify page `/verify/$code`. |
| Email confirmation | 🟡 | Notifications table ready; no auto-send hook. |
| SMS / push | 🔴 | |
| Discount / referral / coupons | 🔴 | |
| Cancellation | ✅ | Self-cancel guarded by trigger. |
| Transfer registration | 🔴 | |
| Re-registration | 🟡 | Blocked by unique index (correct). |
| Duplicate prevention | ✅ | |

## 6. Teams

| Feature | State | Notes |
|---|---|---|
| Create / edit / delete | ✅ | |
| Invite / accept / reject | 🟡 | MCP tools exist; UI is basic. |
| Transfer leader | 🟡 | MCP tool; no UI button. |
| Roles / permissions | ✅ | `team_members.role`. |
| Team chat | ⏸ | Not v1.0. |
| Team documents / QR | 🔴 | |
| Team analytics | 🔴 | |

## 7. Media

| Feature | State | Notes |
|---|---|---|
| Image / video / doc upload | ✅ | Server functions + storage buckets. |
| Drag & drop / clipboard paste | 🔴 | No client widget. |
| URL import | 🟡 | Cover image URL only. |
| Preview / crop / compress | 🔴 | |
| Thumbnail | 🔴 | |
| Bulk upload / folders | 🔴 | |
| Media library UI | 🔴 | |

## 8. Communication

| Feature | State | Notes |
|---|---|---|
| In-app notifications (data) | ✅ | `notifications` table. |
| Notification center UI | 🔴 | No bell / dropdown. |
| Preferences | 🔴 | |
| Broadcast (event-wide) | 🟡 | MCP tool; no UI. |
| Scheduled | 🟡 | MCP tool; no scheduler UI. |
| Email delivery | 🔴 | No outbound provider wired. |
| SMS / push | 🔴 | |

## 9. Certificates

| Feature | State | Notes |
|---|---|---|
| Templates | 🟡 | Single default template. |
| Generate / bulk generate | ✅ | MCP tools. |
| Verify page + QR | ✅ | `/verify/$code`. |
| Download PDF | ✅ | |
| History (per user) | 🔴 | |

## 10. Attendance

| Feature | State | Notes |
|---|---|---|
| Manual check-in | ✅ | MCP + server fn. |
| QR scan check-in | 🟡 | Scan tool exists; no camera UI. |
| Bulk check-in | 🟡 | MCP tool; no UI. |
| Reports | ✅ | MCP `attendance-report`. |
| Re-entry / late tracking | 🔴 | |
| Attendance dashboard | 🔴 | |

## 11. Payments

Status: ⏸ **Deferred by product decision** — DB flags (`is_paid`, `price`)
retained; no gateway wired. Revisit post-v1.0.

## 12. Search

| Feature | State | Notes |
|---|---|---|
| Public event browse + filter | 🟡 | `/events` lists; no full-text. |
| Global search (events/users/orgs/teams) | 🔴 | |
| Filters / sort / pagination | 🟡 | Basic; not saved. |
| Saved searches | 🔴 | |

## 13. Organizations

| Feature | State | Notes |
|---|---|---|
| Org profiles + CRUD | ✅ | |
| Departments | 🟡 | Free-text on profiles; no sub-entity. |
| Members / invites | 🟡 | `org_members` table; no invite flow. |
| Branding | 🔴 | |
| Analytics | 🔴 | |

## 14. Admin Panel

| Feature | State | Notes |
|---|---|---|
| Users / roles | ✅ | |
| Organizations | ✅ | |
| Delegations | ✅ | |
| User approvals | ✅ | |
| Event approvals | ✅ | |
| Audit logs | 🟡 | Table populated; viewer is per-user only. |
| System settings / feature flags | 🔴 | |
| Content moderation | 🔴 | |
| Platform analytics | 🔴 | |

## 15. Analytics

| Feature | State | Notes |
|---|---|---|
| Any charts | 🔴 | No Recharts wiring. |
| Exports (CSV/Excel/PDF) | ✅ | MCP tools; UI buttons needed. |
| Custom reports | 🔴 | |

## 16. UI/UX Foundations

| Feature | State | Notes |
|---|---|---|
| Light / dark / system theme | ✅ | `ThemeProvider`. |
| Back navigation | ✅ | `BackBar` in `_authenticated` layout + public event routes. |
| Breadcrumbs | 🟡 | `PageHeader` supports; not adopted per-page yet. |
| Page title / subtitle / actions | 🟡 | New `PageHeader`; roll-out pending. |
| Skeletons / empty / error states | 🟡 | Primitives shipped (`EmptyState`, `ErrorState`, `ListSkeleton`); adoption pending. |
| Confirmation dialogs | 🟡 | `window.confirm` in places — replace with AlertDialog. |
| Undo support | 🔴 | |
| Responsive audit (320–1920) | 🟡 | Spot-checked; no systematic pass. |
| Accessibility (WCAG 2.2 AA) | 🟡 | No audit yet. |

## 17. Security

| Item | State |
|---|---|
| RBAC + RLS on every table | ✅ |
| Input validation (zod on server fns) | ✅ |
| RLS-enforced identity/ownership | ✅ |
| Rate limiting | 🔴 |
| CSRF | ✅ | Same-origin server fns. |
| XSS | ✅ | React default escaping. |
| Audit logs | ✅ |
| Secrets management | ✅ | Lovable Cloud secrets. |

## 18. Performance / DX / Docs / Testing

| Item | State |
|---|---|
| Code splitting (route-level) | ✅ | TanStack default. |
| Image optimisation | 🔴 |
| Pagination on lists | 🟡 |
| Virtualisation for big tables | 🔴 |
| Unit tests | 🔴 |
| Integration tests | 🔴 |
| Playwright E2E | 🟡 | Ad-hoc during audits; no committed suite. |
| README / architecture docs | 🟡 | Audit docs exist; user/admin guides missing. |
| Changelog | 🔴 |

---

## Execution Plan (ordered)

Payments: ⏸ deferred throughout.

1. **UX polish pass** — adopt `PageHeader`/`EmptyState`/`ListSkeleton`
   across all authenticated pages, replace `window.confirm` with
   `AlertDialog`, responsive audit at 320/768/1280, a11y sweep, notification
   bell in header (read-only feed).
2. **Notifications + Search** — notification center UI, preferences,
   broadcast form, global search (Postgres FTS on events/users/orgs/teams).
3. **Event depth** — categories/tags many-to-many, schedule + sessions,
   speakers, sponsors, FAQs, announcements, feedback/ratings, duplicate/
   archive/restore UI buttons, templates.
4. **Dashboards + Analytics** — role-tailored dashboards, Recharts widgets,
   platform analytics, exports wired to UI buttons.
5. **Media library** — drag&drop uploader, gallery on event page, avatar/
   cover on profile.
6. **Testing** — Vitest units for `authz`/`events`/`registrations`
   helpers, Playwright E2E per module (auth, event lifecycle, register,
   team, check-in, cert verify), a11y checks via `@axe-core/playwright`.
7. **Docs** — README, ARCHITECTURE, ADMIN_GUIDE, USER_GUIDE, CHANGELOG.

Each milestone lands with:

- Type check ✅
- Lint ✅
- Regression test(s) added
- Build ✅
- This document updated (state cells flip)
