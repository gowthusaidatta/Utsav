
-- 1. Extend profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS alternate_phone text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS address_country text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_district text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS semester text,
  ADD COLUMN IF NOT EXISTS current_year text,
  ADD COLUMN IF NOT EXISTS expected_graduation text,
  ADD COLUMN IF NOT EXISTS student_id text,
  ADD COLUMN IF NOT EXISTS admission_year text,
  ADD COLUMN IF NOT EXISTS current_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS current_position text,
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS experience_years numeric(4,1),
  ADD COLUMN IF NOT EXISTS technical_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS soft_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS personal_website text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS discord_username text,
  ADD COLUMN IF NOT EXISTS leetcode_username text,
  ADD COLUMN IF NOT EXISTS codeforces_username text,
  ADD COLUMN IF NOT EXISTS codechef_username text,
  ADD COLUMN IF NOT EXISTS hackerrank_username text,
  ADD COLUMN IF NOT EXISTS gfg_username text,
  ADD COLUMN IF NOT EXISTS researchgate_url text,
  ADD COLUMN IF NOT EXISTS orcid text,
  ADD COLUMN IF NOT EXISTS field_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_is_public boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_current_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_current_status_check
  CHECK (current_status IN ('active','alumni','suspended','graduated'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uniq
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._-]{3,32}$');

-- Public read of a *narrow* set of profile columns via RPC; also allow anon SELECT so RLS-scoped
-- education/pursuits joins work. The row still respects profile_is_public through the RPC.
CREATE POLICY "profiles_public_read_when_public" ON public.profiles
  FOR SELECT USING (profile_is_public = true);

-- 2. Username history.
CREATE TABLE IF NOT EXISTS public.username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_username text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS username_history_old_uniq ON public.username_history (lower(old_username));
GRANT SELECT ON public.username_history TO anon, authenticated;
GRANT ALL ON public.username_history TO service_role;
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "username_history_public_read" ON public.username_history FOR SELECT USING (true);

-- 3. Education.
CREATE TABLE IF NOT EXISTS public.user_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text,
  course text,
  branch text,
  specialization text,
  start_date date,
  end_date date,
  currently_studying boolean NOT NULL DEFAULT false,
  cgpa numeric(4,2),
  percentage numeric(5,2),
  subjects text[] NOT NULL DEFAULT '{}',
  achievements text,
  description text,
  transcript_url text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_education_user_idx ON public.user_education (user_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_education TO authenticated;
GRANT SELECT ON public.user_education TO anon;
GRANT ALL ON public.user_education TO service_role;
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_education_owner_all" ON public.user_education
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_education_public_read" ON public.user_education
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.profile_is_public)
  );
CREATE POLICY "user_education_admin_all" ON public.user_education
  FOR ALL TO authenticated
  USING (public.has_global_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_global_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_user_education_updated
  BEFORE UPDATE ON public.user_education
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Pursuits.
CREATE TABLE IF NOT EXISTS public.user_pursuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  description text,
  skills text[] NOT NULL DEFAULT '{}',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_url text,
  badge_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_pursuits_type_check CHECK (type IN (
    'certificate','course','internship','bootcamp','workshop','seminar',
    'conference','research','award','scholarship','publication','license',
    'project','patent','open_source','volunteer','leadership','work'
  ))
);
CREATE INDEX IF NOT EXISTS user_pursuits_user_idx ON public.user_pursuits (user_id, sort_order);
CREATE INDEX IF NOT EXISTS user_pursuits_type_idx ON public.user_pursuits (type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pursuits TO authenticated;
GRANT SELECT ON public.user_pursuits TO anon;
GRANT ALL ON public.user_pursuits TO service_role;
ALTER TABLE public.user_pursuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_pursuits_owner_all" ON public.user_pursuits
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_pursuits_public_read" ON public.user_pursuits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.profile_is_public)
  );
CREATE POLICY "user_pursuits_admin_all" ON public.user_pursuits
  FOR ALL TO authenticated
  USING (public.has_global_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_global_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_user_pursuits_updated
  BEFORE UPDATE ON public.user_pursuits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Certificate templates.
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  background_url text NOT NULL,
  background_mime text,
  width_px integer NOT NULL DEFAULT 1600,
  height_px integer NOT NULL DEFAULT 1131,
  placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS certificate_templates_event_idx ON public.certificate_templates (event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_templates TO authenticated;
GRANT ALL ON public.certificate_templates TO service_role;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_tpl_read_staff" ON public.certificate_templates
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_global_role(auth.uid(), 'faculty')
    OR public.has_role_in_event(auth.uid(), 'organizer', event_id)
    OR public.has_role_in_event(auth.uid(), 'coordinator', event_id)
  );
CREATE POLICY "cert_tpl_manage_staff" ON public.certificate_templates
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_global_role(auth.uid(), 'faculty')
    OR public.has_role_in_event(auth.uid(), 'organizer', event_id)
    OR public.has_role_in_event(auth.uid(), 'coordinator', event_id)
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR public.has_global_role(auth.uid(), 'faculty')
    OR public.has_role_in_event(auth.uid(), 'organizer', event_id)
    OR public.has_role_in_event(auth.uid(), 'coordinator', event_id)
  );
CREATE TRIGGER trg_cert_templates_updated
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend certificates.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS score numeric(6,2),
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL;

-- 6. Public profile RPC.
CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  vis jsonb;
  edu jsonb;
  pur jsonb;
  result jsonb;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE lower(username) = lower(_username) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'not_found', true,
      'redirect_to', (
        SELECT lower(p2.username)
        FROM public.username_history h
        JOIN public.profiles p2 ON p2.id = h.user_id
        WHERE lower(h.old_username) = lower(_username)
        ORDER BY h.changed_at DESC LIMIT 1
      )
    );
  END IF;
  IF NOT COALESCE(p.profile_is_public, true) THEN
    RETURN jsonb_build_object('not_found', false, 'private', true, 'username', p.username);
  END IF;
  vis := COALESCE(p.field_visibility, '{}'::jsonb);
  SELECT jsonb_agg(to_jsonb(e) ORDER BY e.sort_order, e.start_date DESC NULLS LAST)
    INTO edu FROM public.user_education e WHERE e.user_id = p.id;
  SELECT jsonb_agg(to_jsonb(u) ORDER BY u.sort_order, u.issue_date DESC NULLS LAST)
    INTO pur FROM public.user_pursuits u WHERE u.user_id = p.id;
  result := jsonb_build_object(
    'username', p.username,
    'full_name', p.full_name,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'cover_url', p.cover_url,
    'bio', p.bio,
    'college', p.college, 'campus', p.campus, 'department', p.department,
    'course', p.course, 'branch', p.branch, 'specialization', p.specialization,
    'current_year', p.current_year, 'semester', p.semester,
    'expected_graduation', p.expected_graduation, 'current_status', p.current_status,
    'current_position', p.current_position, 'organization_name', p.organization_name,
    'experience_years', p.experience_years,
    'technical_skills', p.technical_skills, 'soft_skills', p.soft_skills,
    'languages', p.languages, 'nationality', p.nationality,
    'linkedin_url', p.linkedin_url, 'github_url', p.github_url,
    'twitter_url', p.twitter_url, 'instagram_url', p.instagram_url,
    'facebook_url', p.facebook_url, 'discord_username', p.discord_username,
    'leetcode_username', p.leetcode_username, 'codeforces_username', p.codeforces_username,
    'codechef_username', p.codechef_username, 'hackerrank_username', p.hackerrank_username,
    'gfg_username', p.gfg_username, 'researchgate_url', p.researchgate_url, 'orcid', p.orcid,
    'portfolio_url', p.portfolio_url, 'personal_website', p.personal_website,
    'resume_url', CASE WHEN COALESCE(vis->>'resume_url','public') = 'public' THEN p.resume_url END,
    'email', CASE WHEN COALESCE(vis->>'email','private') = 'public' THEN p.email END,
    'phone', CASE WHEN COALESCE(vis->>'phone','private') = 'public' THEN p.phone END,
    'education', COALESCE(edu, '[]'::jsonb),
    'pursuits', COALESCE(pur, '[]'::jsonb),
    'joined_at', p.created_at
  );
  RETURN jsonb_build_object('not_found', false, 'private', false, 'profile', result);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

-- 7. Username-history trigger.
CREATE OR REPLACE FUNCTION public.profiles_track_username_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.username IS NOT NULL AND NEW.username IS DISTINCT FROM OLD.username THEN
    INSERT INTO public.username_history (user_id, old_username)
    VALUES (NEW.id, OLD.username)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_username_history ON public.profiles;
CREATE TRIGGER trg_profiles_username_history
  BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_track_username_change();

-- 8. Storage RLS for user-content (bucket already exists, private).
DROP POLICY IF EXISTS "user_content_read_own_or_staff" ON storage.objects;
CREATE POLICY "user_content_read_own_or_staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-content'
    AND (
      (auth.uid()::text = (storage.foldername(name))[1])
      OR public.is_platform_admin(auth.uid())
      OR public.has_global_role(auth.uid(), 'faculty')
    )
  );
DROP POLICY IF EXISTS "user_content_write_own" ON storage.objects;
CREATE POLICY "user_content_write_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-content' AND (auth.uid()::text = (storage.foldername(name))[1]));
DROP POLICY IF EXISTS "user_content_update_own" ON storage.objects;
CREATE POLICY "user_content_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-content' AND (auth.uid()::text = (storage.foldername(name))[1]));
DROP POLICY IF EXISTS "user_content_delete_own" ON storage.objects;
CREATE POLICY "user_content_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-content' AND (auth.uid()::text = (storage.foldername(name))[1]));
