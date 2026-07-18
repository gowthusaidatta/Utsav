
-- Enums
DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('draft','pending_approval','published','cancelled','completed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_visibility AS ENUM ('public','private','invite_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.event_status NOT NULL DEFAULT 'draft',
  visibility public.event_visibility NOT NULL DEFAULT 'public',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  venue TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  meeting_url TEXT,
  capacity INTEGER,
  registration_deadline TIMESTAMPTZ,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_status_idx ON public.events (status);
CREATE INDEX events_visibility_idx ON public.events (visibility);
CREATE INDEX events_start_at_idx ON public.events (start_at);
CREATE INDEX events_org_idx ON public.events (organization_id);
CREATE INDEX events_created_by_idx ON public.events (created_by);
CREATE INDEX events_tags_gin ON public.events USING gin (tags);

-- Grants
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public + published visible to everyone (anon + authenticated)
CREATE POLICY "Public can view published public events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND visibility = 'public');

-- Creator can always see their own events
CREATE POLICY "Creator can view own events" ON public.events
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

-- Organizers/coordinators of the event can see it
CREATE POLICY "Event staff can view event" ON public.events
  FOR SELECT TO authenticated
  USING (
    public.has_role_in_event(auth.uid(), 'organizer', id)
    OR public.has_role_in_event(auth.uid(), 'coordinator', id)
    OR public.has_role_in_event(auth.uid(), 'judge', id)
    OR public.has_role_in_event(auth.uid(), 'volunteer', id)
  );

-- Faculty/admin see everything
CREATE POLICY "Faculty and admin view all events" ON public.events
  FOR SELECT TO authenticated
  USING (public.has_global_role(auth.uid(), 'faculty') OR public.has_global_role(auth.uid(), 'admin'));

-- Insert: any authenticated student can create as themselves
CREATE POLICY "Authenticated users can create events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Update: creator or event organizer/coordinator or faculty/admin
CREATE POLICY "Editors can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role_in_event(auth.uid(), 'organizer', id)
    OR public.has_role_in_event(auth.uid(), 'coordinator', id)
    OR public.has_global_role(auth.uid(), 'faculty')
    OR public.has_global_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role_in_event(auth.uid(), 'organizer', id)
    OR public.has_role_in_event(auth.uid(), 'coordinator', id)
    OR public.has_global_role(auth.uid(), 'faculty')
    OR public.has_global_role(auth.uid(), 'admin')
  );

-- Delete: faculty/admin only
CREATE POLICY "Faculty and admin can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_global_role(auth.uid(), 'faculty') OR public.has_global_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
