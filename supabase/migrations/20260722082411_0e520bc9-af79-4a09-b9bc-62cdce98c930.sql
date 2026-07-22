-- 1. Security fix: remove qr_secret exposure from events table.
-- The column is unused by app code; drop it to eliminate the leak.
ALTER TABLE public.events DROP COLUMN IF EXISTS qr_secret;

-- 2. Extend team_config defaults so new team-event boolean options have a stable shape.
-- team_config is jsonb; document the expected keys (allow_name/description/logo/leader_transfer/
-- invite_by_username/invite_by_email, auto_accept, require_full_team). No schema change required.

-- 3. Add my registrations to expose invite_code via join (no column change needed;
--    teams.invite_code already exists and is permanent).

-- No-op guard so the migration always has at least one visible effect.
COMMENT ON TABLE public.events IS 'Events. qr_secret removed 2026-07 (security). Per-registration QR lives on registrations.qr_token.';