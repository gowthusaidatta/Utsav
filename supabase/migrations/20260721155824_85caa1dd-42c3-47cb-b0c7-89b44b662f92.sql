
-- 1) Soft delete + cancellation fields
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS events_deleted_at_idx ON public.events (deleted_at);

-- 2) Rewrite SELECT policies to exclude deleted rows for everyone except super_admin/platform_admin.
DROP POLICY IF EXISTS "Public can view published public events" ON public.events;
DROP POLICY IF EXISTS "Creator can view own events" ON public.events;
DROP POLICY IF EXISTS "Event staff can view event" ON public.events;
DROP POLICY IF EXISTS "Faculty and admin view all events" ON public.events;

CREATE POLICY "Public can view published public events"
  ON public.events FOR SELECT
  USING (
    deleted_at IS NULL
    AND status = 'published'::event_status
    AND visibility = 'public'::event_visibility
  );

CREATE POLICY "Creator can view own events"
  ON public.events FOR SELECT
  USING (deleted_at IS NULL AND auth.uid() = created_by);

CREATE POLICY "Event staff can view event"
  ON public.events FOR SELECT
  USING (
    deleted_at IS NULL AND (
      has_role_in_event(auth.uid(), 'organizer'::app_role, id)
      OR has_role_in_event(auth.uid(), 'coordinator'::app_role, id)
      OR has_role_in_event(auth.uid(), 'judge'::app_role, id)
      OR has_role_in_event(auth.uid(), 'volunteer'::app_role, id)
    )
  );

CREATE POLICY "Faculty view non-deleted events"
  ON public.events FOR SELECT
  USING (
    deleted_at IS NULL AND (
      has_global_role(auth.uid(), 'faculty'::app_role)
      OR has_global_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Platform/super admin: see ALL events, including deleted.
CREATE POLICY "Platform admin view all events"
  ON public.events FOR SELECT
  USING (
    has_any_global_role(auth.uid(), ARRAY['platform_admin','super_admin'])
  );

-- 3) event_links table
CREATE TABLE IF NOT EXISTS public.event_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  url TEXT NOT NULL CHECK (length(url) BETWEEN 4 AND 2000),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS event_links_event_url_key ON public.event_links (event_id, lower(url));
CREATE INDEX IF NOT EXISTS event_links_event_order_idx ON public.event_links (event_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_links TO authenticated;
GRANT SELECT ON public.event_links TO anon;
GRANT ALL ON public.event_links TO service_role;

ALTER TABLE public.event_links ENABLE ROW LEVEL SECURITY;

-- Read: public if the parent event is publicly viewable; editors always read.
CREATE POLICY "Public can view links on published public events"
  ON public.event_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_links.event_id
        AND e.deleted_at IS NULL
        AND e.status = 'published'::event_status
        AND e.visibility = 'public'::event_visibility
    )
  );

CREATE POLICY "Editors can view links"
  ON public.event_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_links.event_id
        AND (
          auth.uid() = e.created_by
          OR has_role_in_event(auth.uid(), 'organizer'::app_role, e.id)
          OR has_role_in_event(auth.uid(), 'coordinator'::app_role, e.id)
          OR has_global_role(auth.uid(), 'faculty'::app_role)
          OR has_any_global_role(auth.uid(), ARRAY['admin','platform_admin','super_admin'])
        )
    )
  );

CREATE POLICY "Editors manage links"
  ON public.event_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_links.event_id
        AND (
          auth.uid() = e.created_by
          OR has_role_in_event(auth.uid(), 'organizer'::app_role, e.id)
          OR has_role_in_event(auth.uid(), 'coordinator'::app_role, e.id)
          OR has_global_role(auth.uid(), 'faculty'::app_role)
          OR has_any_global_role(auth.uid(), ARRAY['admin','platform_admin','super_admin'])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_links.event_id
        AND (
          auth.uid() = e.created_by
          OR has_role_in_event(auth.uid(), 'organizer'::app_role, e.id)
          OR has_role_in_event(auth.uid(), 'coordinator'::app_role, e.id)
          OR has_global_role(auth.uid(), 'faculty'::app_role)
          OR has_any_global_role(auth.uid(), ARRAY['admin','platform_admin','super_admin'])
        )
    )
  );

CREATE TRIGGER event_links_set_updated_at BEFORE UPDATE ON public.event_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Storage policies for event-covers bucket
CREATE POLICY "event-covers authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-covers');

CREATE POLICY "event-covers upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers' AND owner = auth.uid());

CREATE POLICY "event-covers update own or admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND (owner = auth.uid() OR has_any_global_role(auth.uid(), ARRAY['admin','platform_admin','super_admin']))
  );

CREATE POLICY "event-covers delete own or admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND (owner = auth.uid() OR has_any_global_role(auth.uid(), ARRAY['admin','platform_admin','super_admin']))
  );
