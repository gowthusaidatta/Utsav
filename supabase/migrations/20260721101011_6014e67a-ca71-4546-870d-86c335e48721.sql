
-- FAQs
CREATE TABLE public.event_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (length(question) BETWEEN 3 AND 300),
  answer text NOT NULL CHECK (length(answer) BETWEEN 1 AND 4000),
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_faqs_event_idx ON public.event_faqs(event_id, sort_order);
GRANT SELECT ON public.event_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_faqs TO authenticated;
GRANT ALL ON public.event_faqs TO service_role;
ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY faqs_read_public ON public.event_faqs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id
          AND e.status='published' AND e.visibility='public')
);
CREATE POLICY faqs_read_authed ON public.event_faqs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
);
CREATE POLICY faqs_write_manager ON public.event_faqs FOR ALL TO authenticated
  USING (public.can(auth.uid(), 'edit_event', event_id))
  WITH CHECK (public.can(auth.uid(), 'edit_event', event_id));
CREATE TRIGGER trg_event_faqs_updated BEFORE UPDATE ON public.event_faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Announcements
CREATE TABLE public.event_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_announcements_event_idx ON public.event_announcements(event_id, created_at DESC);
GRANT SELECT ON public.event_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_announcements TO authenticated;
GRANT ALL ON public.event_announcements TO service_role;
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_read_public ON public.event_announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id
          AND e.status='published' AND e.visibility='public')
);
CREATE POLICY announcements_read_authed ON public.event_announcements FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
);
CREATE POLICY announcements_write_manager ON public.event_announcements FOR ALL TO authenticated
  USING (public.can(auth.uid(), 'edit_event', event_id))
  WITH CHECK (public.can(auth.uid(), 'edit_event', event_id));
CREATE TRIGGER trg_event_announcements_updated BEFORE UPDATE ON public.event_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Feedback / Ratings — one row per (event, user); only registered attendees can post
CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR length(comment) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX event_feedback_event_idx ON public.event_feedback(event_id, created_at DESC);
GRANT SELECT ON public.event_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_feedback TO authenticated;
GRANT ALL ON public.event_feedback TO service_role;
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;
-- Public can read feedback for published/public events
CREATE POLICY feedback_read_public ON public.event_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id
          AND e.status='published' AND e.visibility='public')
);
CREATE POLICY feedback_read_authed ON public.event_feedback FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
);
-- Authors: only users with a non-cancelled registration for this event
CREATE POLICY feedback_write_own ON public.event_feedback FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.event_id = event_feedback.event_id
      AND r.user_id = auth.uid()
      AND r.status IN ('registered','checked_in','checked_out','completed')
  )
);
CREATE POLICY feedback_update_own ON public.event_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY feedback_delete_own_or_manager ON public.event_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.can(auth.uid(), 'edit_event', event_id));
CREATE TRIGGER trg_event_feedback_updated BEFORE UPDATE ON public.event_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
