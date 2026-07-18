
-- MEDIA bucket: private; uploader owns; managers on the event/org can access
CREATE POLICY "storage_media_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media');

CREATE POLICY "storage_media_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND owner = auth.uid());

CREATE POLICY "storage_media_update_own_or_admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (owner = auth.uid() OR public.has_global_role(auth.uid(),'admin')));

CREATE POLICY "storage_media_delete_own_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND (owner = auth.uid() OR public.has_global_role(auth.uid(),'admin')));

-- CERTIFICATES bucket: private; any authenticated read (for verification); managers write
CREATE POLICY "storage_certificates_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificates');

CREATE POLICY "storage_certificates_insert_manager"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND (
    public.has_global_role(auth.uid(),'admin')
    OR public.has_global_role(auth.uid(),'faculty')
  )
);

CREATE POLICY "storage_certificates_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'certificates' AND public.has_global_role(auth.uid(),'admin'));

-- EXPORTS bucket: private; uploader owns; admins can read all
CREATE POLICY "storage_exports_read_own_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exports' AND (owner = auth.uid() OR public.has_global_role(auth.uid(),'admin')));

CREATE POLICY "storage_exports_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exports' AND owner = auth.uid());

CREATE POLICY "storage_exports_delete_own_or_admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exports' AND (owner = auth.uid() OR public.has_global_role(auth.uid(),'admin')));
