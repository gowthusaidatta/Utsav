-- Public read policy for certificates on public profiles.
-- Only non-revoked rows for users whose profile_is_public = true.
GRANT SELECT ON public.certificates TO anon;

CREATE POLICY "certificates_public_read"
ON public.certificates
FOR SELECT
TO anon, authenticated
USING (
  revoked_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = certificates.user_id AND p.profile_is_public = true
  )
);

-- Ensure user_pursuits + user_education anon SELECT grant (RLS policies already exist)
GRANT SELECT ON public.user_pursuits TO anon;
GRANT SELECT ON public.user_education TO anon;
GRANT SELECT ON public.events TO anon;