CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  p public.profiles%ROWTYPE;
  vis jsonb;
  edu jsonb;
  pur jsonb;
  certs jsonb;
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
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id, 'code', c.code, 'title', c.title,
      'template_key', c.template_key, 'issued_at', c.issued_at,
      'position', c.position, 'rank', c.rank, 'score', c.score, 'role', c.role,
      'event_id', c.event_id,
      'event_title', ev.title, 'event_slug', ev.slug
    )
    ORDER BY c.issued_at DESC
  ) INTO certs
  FROM public.certificates c
  LEFT JOIN public.events ev ON ev.id = c.event_id
  WHERE c.user_id = p.id AND c.revoked_at IS NULL;

  result := jsonb_build_object(
    'id', p.id,
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
    'certificates', COALESCE(certs, '[]'::jsonb),
    'joined_at', p.created_at
  );
  RETURN jsonb_build_object('not_found', false, 'private', false, 'profile', result);
END;
$function$;