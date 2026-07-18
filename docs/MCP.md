# Utsav MCP Server — v1.0

The Utsav MCP server is the official AI integration layer for Utsav. AI clients
(ChatGPT, Claude, Codex, Cursor) connect to `/mcp` via OAuth 2.1 (Supabase),
and every call runs as the signed-in Utsav user under Row-Level Security.

## Endpoint

- URL: `https://<published-domain>/mcp`
- Transport: MCP Streamable HTTP
- Auth: OAuth 2.1 via Supabase (dynamic client registration enabled)
- Consent route: `/.lovable/oauth/consent`

## Authentication flow

1. Client discovers metadata at `/.well-known/oauth-protected-resource`.
2. Client registers (DCR) with Supabase's `oauth-authorization-server`.
3. Client sends the user to the authorization endpoint.
4. Supabase redirects to `/.lovable/oauth/consent`; the user signs in and approves.
5. Client exchanges the code for an access token bound to `aud=authenticated`.
6. Client sends the token as `Authorization: Bearer <token>` on every `/mcp` call.
7. Every tool handler builds a **per-request** Supabase client that forwards the
   token, so PostgREST and RLS enforce the caller's identity and role scope.

## Security model

Every tool:

- **Authenticates** via `ctx.isAuthenticated()`; else returns `UNAUTHENTICATED`.
- **Authorizes** through Utsav's RBAC:
  - `has_global_role(uid, role)` for admin/faculty checks.
  - `has_role_in_event(uid, role, event_id)` for event-scoped roles.
  - `can(uid, action, event_id)` for the app-wide permission table.
- **Enforces RLS** on every read/write via the caller-token Supabase client.
- **Uses the admin client only** after server-side role verification, for
  writes to tables locked by RLS (e.g. `user_roles`, `permission_delegations`).
- **Validates inputs** with Zod (UUID formats, length caps, enums).
- **Records audit logs** to `public.audit_logs` with `source: "mcp"`.
- **Returns standardized responses** — never raw DB errors.

## Standard response envelope

Success:
```json
{ "<domain>": "...", "id": "...", "..." }
```

Error:
```json
{ "error": { "code": "FORBIDDEN", "message": "..." } }
```

## Error codes

| Code | Meaning |
|------|---------|
| `UNAUTHENTICATED` | No valid Supabase token on the call. |
| `FORBIDDEN` | Caller is authenticated but lacks the RBAC role for this action. |
| `NOT_FOUND` | Target resource doesn't exist or isn't visible under RLS. |
| `INVALID_INPUT` | Input failed validation or business rules (e.g. publish preconditions). |
| `CONFLICT` | Uniqueness or capacity conflict (duplicate registration, full team). |
| `DB_ERROR` | Generic database failure; internals hidden. |
| `NOT_IMPLEMENTED` | Tool is registered but its module ships in a later phase. |
| `INTERNAL` | Unexpected server error. |

## Tool catalog

### Authentication (3)
| Tool | RBAC | Description |
|------|------|-------------|
| `whoami` | any signed-in user | User profile + global roles. |
| `current_permissions` | any signed-in user | Permission matrix for standard actions. |
| `current_organizations` | any signed-in user | Orgs the caller belongs to. |

### Users (8)
| Tool | RBAC | Description |
|------|------|-------------|
| `list_users` | admin | Search users. |
| `get_user` | self or admin | Profile + roles for a user id. |
| `create_user` | n/a | Not supported — Utsav uses self-service sign-up. Returns `NOT_IMPLEMENTED`. |
| `update_user` | self | Update own profile fields. |
| `deactivate_user` | admin | Revoke ALL non-expired roles for a user. |
| `assign_role` | admin (global/admin/faculty) or faculty (event/org) | Grant a role with optional scope/expiry. |
| `revoke_role` | admin (global/admin/faculty) or faculty (event/org) | Revoke a role by id. |
| `delegate_permission` | admin, faculty, or event coordinator | Time-boxed event-scoped role delegation. |

### Organizations (5)
| Tool | RBAC | Description |
|------|------|-------------|
| `list_organizations` | any signed-in user | Browse orgs. |
| `create_organization` | faculty or admin (RLS) | Create org (auto-slug). |
| `update_organization` | faculty or admin (RLS) | Update fields. |
| `invite_member` | org coordinator or admin (RLS) | Add existing user to org. |
| `remove_member` | self, org coordinator, or admin (RLS) | Remove membership. |

### Events (11)
| Tool | RBAC | Description |
|------|------|-------------|
| `list_events` | any signed-in user (RLS-filtered) | Filter by status/category/query/mine_only. |
| `get_event` | any signed-in user (RLS-filtered) | Fetch by id or slug. |
| `create_event` | any authenticated user | Create draft with full field set. |
| `create_event_draft` | any authenticated user | Legacy alias — minimal fields. |
| `update_event` | organizer/coordinator/faculty/admin | Update mutable fields (not status). |
| `duplicate_event` | any user with view access | Draft copy. |
| `publish_event` | coordinator/faculty/admin | Requires description+times+venue-or-URL. |
| `archive_event` | coordinator/faculty/admin | Move to archived. |
| `cancel_event` | coordinator/faculty/admin | Move to cancelled. |
| `delete_event` | faculty or admin | Permanent delete. |
| `change_event_status` | policy-based | Legacy lifecycle helper. |

### Registrations (6)
| Tool | RBAC | Description |
|------|------|-------------|
| `register_event` | student (via `can('register')`) | Solo registration; auto-waitlists at capacity. |
| `unregister_event` | self | Cancel own registration. |
| `list_registrations` | organizer/coordinator/volunteer/faculty/admin | Roster for one event. |
| `list_my_registrations` | self | Caller's own registrations. |
| `approve_registration` | manage_teams staff | Promote waitlist → registered. |
| `reject_registration` | manage_teams staff | Cancel a registration (staff). |

### Teams (5)
| Tool | RBAC | Description |
|------|------|-------------|
| `create_team` | student | Leader-created team; caller is leader. |
| `join_team` | any student | Join via invite code. |
| `invite_team_member` | leader or event staff | Add existing user directly. |
| `remove_team_member` | leader or event staff | Remove member. |
| `transfer_leader` | current leader | Transfer leadership to an active member. |

### Attendance (6)
| Tool | RBAC | Description |
|------|------|-------------|
| `generate_qr` | registrant, or check_in staff | HMAC-signed, time-boxed QR token. |
| `validate_qr` | any signed-in user | Verify signature/expiry; no state change. |
| `scan_qr` | check_in staff | Verify token then check the registration in. |
| `manual_checkin` | check_in staff | Check in without QR. |
| `checkout` | check_in staff | Reverse check-in. |
| `attendance_report` | check_in/manage_teams staff | Status counts + check-in rate. |

### Analytics (4)
| Tool | RBAC | Description |
|------|------|-------------|
| `event_statistics` | RLS-scoped | Reg + team counts for one event. |
| `attendance_statistics` | RLS-scoped | Check-in totals (global or per-event). |
| `registration_statistics` | RLS-scoped | Status + payment breakdown. |
| `dashboard_metrics` | self | Personal totals for the signed-in user. |

### Search (1)
| Tool | RBAC | Description |
|------|------|-------------|
| `global_search` | RLS-scoped | Combined event + organization search. |

### Audit (3)
| Tool | RBAC | Description |
|------|------|-------------|
| `audit_logs` | self or admin | Query audit log entries with filters. |
| `permission_history` | self or admin | Role/delegation events for a user. |
| `event_history` | RLS-scoped | Audit trail for one event. |

### Roadmap (registered, return `NOT_IMPLEMENTED`)
These tools are advertised for client discovery. Handlers return a
`NOT_IMPLEMENTED` error that names the phase in which they ship.

- **Phase 4 — Media**: `upload_image`, `upload_video`, `upload_document`, `delete_media`, `list_media`.
- **Phase 6 — Reports**: `export_excel`, `export_csv`, `export_pdf`.
- **Phase 7 — Certificates & Notifications**: `generate_certificate`, `verify_certificate`, `download_certificate`, `send_notification`, `schedule_notification`, `notification_history`.

## Usage examples

### Read events I created

```json
{ "name": "list_events", "arguments": { "mine_only": true, "status": "draft" } }
```

### Create, then publish an event

```json
{ "name": "create_event", "arguments": {
  "title": "TechFest 2026",
  "description": "Annual hackathon",
  "start_at": "2026-03-01T09:00:00Z",
  "end_at":   "2026-03-02T18:00:00Z",
  "venue": "Main Auditorium"
} }
```
Then:
```json
{ "name": "publish_event", "arguments": { "event_id": "<uuid>" } }
```

### Register + issue a check-in QR

```json
{ "name": "register_event", "arguments": { "event_id": "<uuid>" } }
{ "name": "generate_qr", "arguments": { "registration_id": "<uuid>", "ttl_minutes": 240 } }
```

Volunteer scans:
```json
{ "name": "scan_qr", "arguments": { "token": "<base64url>.<base64url>" } }
```

### Delegate coordinator to another user

```json
{ "name": "delegate_permission", "arguments": {
  "delegate_user_id": "<uuid>",
  "role": "coordinator",
  "event_id": "<uuid>",
  "expires_at": "2026-03-05T00:00:00Z"
} }
```

## Data-shape reference

All timestamps are ISO 8601 UTC. All ids are UUIDs. Strings are trimmed and
length-capped in every input schema. See individual tool files under
`src/lib/mcp/tools/` for the exact Zod schemas — those files are the
source of truth.

## Auditing

Every mutation writes an `audit_logs` row with:
- `actor_user_id` — the OAuth-authenticated Utsav user
- `action` — dotted namespace (e.g. `event.publish`, `role.assign`)
- `resource_type` / `resource_id` — the affected row
- `metadata.source = "mcp"` — distinguishes MCP-originated actions

Query via `audit_logs`, `permission_history`, `event_history`.

## Extending the server

1. Add a file under `src/lib/mcp/tools/`.
2. Use `defineTool({ name, title, description, inputSchema, annotations, handler })`.
3. In `handler`: check `ctx.isAuthenticated()`, build the caller-scoped client
   with `supabaseForUser(ctx)`, do RBAC checks, validate inputs (Zod runs
   automatically), query/mutate, call `recordAudit`, and return `ok(...)`.
4. Register the tool in `src/lib/mcp/index.ts`.
5. Run the MCP manifest extractor to regenerate `.lovable/mcp/manifest.json`.
