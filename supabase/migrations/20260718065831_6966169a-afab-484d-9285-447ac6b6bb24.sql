
-- ============================================================
-- MEDIA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('event','organization','user')),
  owner_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','video','document')),
  bucket text NOT NULL DEFAULT 'media',
  storage_path text NOT NULL,
  thumbnail_path text,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  checksum text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','infected','skipped')),
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_owner_idx ON public.media (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS media_event_idx ON public.media (event_id);
CREATE INDEX IF NOT EXISTS media_uploader_idx ON public.media (uploaded_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_read_own_or_event"
ON public.media FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_global_role(auth.uid(),'admin')
  OR public.has_global_role(auth.uid(),'faculty')
  OR (event_id IS NOT NULL AND (
       public.has_role_in_event(auth.uid(),'organizer',event_id)
    OR public.has_role_in_event(auth.uid(),'coordinator',event_id)))
);

CREATE POLICY "media_insert_self"
ON public.media FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "media_update_owner_or_manager"
ON public.media FOR UPDATE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_global_role(auth.uid(),'admin')
  OR (event_id IS NOT NULL AND (
       public.has_role_in_event(auth.uid(),'organizer',event_id)
    OR public.has_role_in_event(auth.uid(),'coordinator',event_id)))
);

CREATE POLICY "media_delete_owner_or_manager"
ON public.media FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_global_role(auth.uid(),'admin')
  OR (event_id IS NOT NULL AND (
       public.has_role_in_event(auth.uid(),'organizer',event_id)
    OR public.has_role_in_event(auth.uid(),'coordinator',event_id)))
);

CREATE TRIGGER media_set_updated_at BEFORE UPDATE ON public.media
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  verification_hash text NOT NULL,
  template_key text NOT NULL DEFAULT 'default',
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_path text,
  issued_by uuid NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, template_key)
);

CREATE INDEX IF NOT EXISTS certificates_user_idx ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS certificates_event_idx ON public.certificates(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can verify by code (SELECT). Recipients see their own by any query.
CREATE POLICY "certificates_read_all_authenticated"
ON public.certificates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "certificates_insert_manager"
ON public.certificates FOR INSERT TO authenticated
WITH CHECK (
  public.has_global_role(auth.uid(),'admin')
  OR public.has_global_role(auth.uid(),'faculty')
  OR public.has_role_in_event(auth.uid(),'organizer',event_id)
  OR public.has_role_in_event(auth.uid(),'coordinator',event_id)
);

CREATE POLICY "certificates_update_manager"
ON public.certificates FOR UPDATE TO authenticated
USING (
  public.has_global_role(auth.uid(),'admin')
  OR public.has_global_role(auth.uid(),'faculty')
  OR public.has_role_in_event(auth.uid(),'coordinator',event_id)
);

CREATE POLICY "certificates_delete_admin"
ON public.certificates FOR DELETE TO authenticated
USING (public.has_global_role(auth.uid(),'admin'));

CREATE TRIGGER certificates_set_updated_at BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','email','both')),
  subject_template text,
  body_template text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ntpl_read_authenticated"
ON public.notification_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "ntpl_write_admin_faculty"
ON public.notification_templates FOR INSERT TO authenticated
WITH CHECK (public.has_global_role(auth.uid(),'admin') OR public.has_global_role(auth.uid(),'faculty'));

CREATE POLICY "ntpl_update_admin_faculty"
ON public.notification_templates FOR UPDATE TO authenticated
USING (public.has_global_role(auth.uid(),'admin') OR public.has_global_role(auth.uid(),'faculty'));

CREATE POLICY "ntpl_delete_admin"
ON public.notification_templates FOR DELETE TO authenticated
USING (public.has_global_role(auth.uid(),'admin'));

CREATE TRIGGER ntpl_set_updated_at BEFORE UPDATE ON public.notification_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  sender_user_id uuid,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','email')),
  template_key text,
  subject text,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','scheduled','sent','failed','read','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_recipient_idx ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_status_idx ON public.notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS notif_event_idx ON public.notifications(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_read_recipient_or_manager"
ON public.notifications FOR SELECT TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR sender_user_id = auth.uid()
  OR public.has_global_role(auth.uid(),'admin')
  OR public.has_global_role(auth.uid(),'faculty')
  OR (event_id IS NOT NULL AND (
       public.has_role_in_event(auth.uid(),'organizer',event_id)
    OR public.has_role_in_event(auth.uid(),'coordinator',event_id)))
);

CREATE POLICY "notif_insert_sender"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    public.has_global_role(auth.uid(),'admin')
    OR public.has_global_role(auth.uid(),'faculty')
    OR (event_id IS NOT NULL AND (
         public.has_role_in_event(auth.uid(),'organizer',event_id)
      OR public.has_role_in_event(auth.uid(),'coordinator',event_id)))
    OR recipient_user_id = auth.uid()
  )
);

CREATE POLICY "notif_update_recipient_or_admin"
ON public.notifications FOR UPDATE TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR public.has_global_role(auth.uid(),'admin')
);

CREATE POLICY "notif_delete_admin"
ON public.notifications FOR DELETE TO authenticated
USING (public.has_global_role(auth.uid(),'admin'));

CREATE TRIGGER notif_set_updated_at BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
