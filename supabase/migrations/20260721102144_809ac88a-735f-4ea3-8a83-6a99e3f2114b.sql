
CREATE TABLE IF NOT EXISTS public.role_permissions (
  action text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  global_roles text[] NOT NULL DEFAULT '{}',
  event_roles  text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  is_self_service boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_permissions TO anon, authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_read_all ON public.role_permissions;
CREATE POLICY role_permissions_read_all ON public.role_permissions FOR SELECT USING (true);

INSERT INTO public.role_permissions (action, category, label, global_roles, event_roles, is_public, is_self_service) VALUES
('view_event','events','View events','{}','{}',true,false),
('create_event','events','Create events','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{}',false,false),
('edit_event','events','Edit event','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('edit_own_event','events','Edit own event','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('edit_any_event','events','Edit any event','{faculty,org_admin,college_admin,dept_admin}','{}',false,false),
('delete_own_event','events','Delete own event','{faculty,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('delete_any_event','events','Delete any event','{faculty,org_admin,college_admin,dept_admin}','{}',false,false),
('archive_event','events','Archive event','{faculty,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('restore_event','events','Restore event','{faculty,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('publish_event','events','Publish event','{faculty,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('cancel_event','events','Cancel event','{faculty,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('duplicate_event','events','Duplicate event','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('clone_event','events','Clone event','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_event_schedule','events','Manage event schedule','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_event_tracks','events','Manage event tracks','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_event_sessions','events','Manage event sessions','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_speakers','events','Manage speakers','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_sponsors','events','Manage sponsors','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_faqs','events','Manage FAQs','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_gallery','events','Manage gallery','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('manage_resources','events','Manage resources','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator,mentor}',false,false),
('manage_venue','events','Manage venue','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_announcements','events','Manage announcements','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('export_event_data','events','Export event data','{finance,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('import_event_data','events','Import event data','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{}',false,false),
('view_event_analytics','events','View event analytics','{sponsor,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{sponsor,organizer,coordinator}',false,false),
('register','registration','Register for event','{student}','{}',false,false),
('cancel_registration','registration','Cancel own registration','{}','{}',false,true),
('approve_registration','registration','Approve registration','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('reject_registration','registration','Reject registration','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_registrations','registration','Manage registrations','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('export_registrations','registration','Export registrations','{finance,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('waitlist_management','registration','Waitlist management','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('attendance_management','registration','Attendance management','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin,volunteer}','{volunteer,organizer,coordinator}',false,false),
('generate_qr_tickets','registration','Generate QR tickets','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('create_team','teams','Create team','{student}','{}',false,false),
('edit_team','teams','Edit team','{student}','{}',false,false),
('delete_team','teams','Delete team','{student}','{}',false,false),
('invite_members','teams','Invite team members','{student}','{}',false,false),
('remove_members','teams','Remove team members','{student}','{}',false,false),
('transfer_ownership','teams','Transfer team ownership','{student}','{}',false,false),
('manage_team_roles','teams','Manage team roles','{student}','{}',false,false),
('approve_team_requests','teams','Approve team requests','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('view_team_analytics','teams','View team analytics','{student,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('submit_project','projects','Submit project','{student}','{}',false,false),
('edit_submission','projects','Edit submission','{student}','{}',false,false),
('delete_submission','projects','Delete submission','{student}','{}',false,false),
('view_submissions','projects','View submissions','{student,judge,faculty,organizer,coordinator,mentor,org_admin,college_admin,dept_admin}','{judge,mentor,organizer,coordinator}',false,false),
('evaluate_submission','projects','Evaluate submission','{}','{judge}',false,false),
('score_submission','projects','Score submission','{}','{judge}',false,false),
('score_submissions','projects','Score submissions (legacy)','{}','{judge}',false,false),
('publish_results','projects','Publish results','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('check_in','attendance','Check attendees in (legacy)','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin,volunteer}','{volunteer,organizer,coordinator}',false,false),
('qr_check_in','attendance','QR check-in','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin,volunteer}','{volunteer,organizer,coordinator}',false,false),
('qr_check_out','attendance','QR check-out','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin,volunteer}','{volunteer,organizer,coordinator}',false,false),
('manual_check_in','attendance','Manual check-in','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin,volunteer}','{volunteer,organizer,coordinator}',false,false),
('bulk_check_in','attendance','Bulk check-in','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('attendance_reports','attendance','Attendance reports','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('attendance_analytics','attendance','Attendance analytics','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('generate_certificates','certificates','Generate certificates','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('bulk_generate_certificates','certificates','Bulk generate certificates','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('approve_certificates','certificates','Approve certificates','{faculty,org_admin,college_admin,dept_admin}','{}',false,false),
('issue_certificates','certificates','Issue certificates (legacy)','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('download_certificates','certificates','Download own certificate','{}','{}',false,true),
('verify_certificates','certificates','Verify certificate','{}','{}',true,false),
('view_users','users','View users','{org_admin,college_admin,dept_admin}','{}',false,false),
('create_users','users','Create users','{}','{}',false,false),
('edit_users','users','Edit users','{}','{}',false,false),
('suspend_users','users','Suspend users','{}','{}',false,false),
('delete_users','users','Delete users','{}','{}',false,false),
('assign_roles','users','Assign roles','{}','{}',false,false),
('approve_accounts','users','Approve accounts','{faculty,org_admin,college_admin,dept_admin}','{}',false,false),
('reset_passwords','users','Reset own password','{}','{}',false,true),
('view_user_activity','users','View user activity','{org_admin,college_admin,dept_admin}','{}',false,false),
('manage_users','users','Manage users (legacy)','{}','{}',false,false),
('create_organization','organizations','Create organization','{}','{}',false,false),
('edit_organization','organizations','Edit organization','{org_admin,college_admin}','{}',false,false),
('delete_organization','organizations','Delete organization','{}','{}',false,false),
('manage_departments','organizations','Manage departments','{college_admin,org_admin}','{}',false,false),
('invite_org_members','organizations','Invite organization members','{org_admin,college_admin,dept_admin}','{}',false,false),
('manage_branding','organizations','Manage branding','{org_admin,college_admin}','{}',false,false),
('organization_analytics','organizations','Organization analytics','{org_admin,college_admin,dept_admin}','{}',false,false),
('manage_organizations','organizations','Manage organizations (legacy)','{org_admin,college_admin}','{}',false,false),
('view_revenue','finance','View revenue','{finance,org_admin}','{}',false,false),
('manage_payments','finance','Manage payments','{finance,org_admin}','{}',false,false),
('manage_refunds','finance','Manage refunds','{finance,org_admin}','{}',false,false),
('manage_invoices','finance','Manage invoices','{finance,org_admin}','{}',false,false),
('manage_taxes','finance','Manage taxes','{finance,org_admin}','{}',false,false),
('financial_reports','finance','Financial reports','{finance,org_admin}','{}',false,false),
('export_financial_reports','finance','Export financial reports','{finance,org_admin}','{}',false,false),
('view_finance','finance','View finance (legacy)','{finance,org_admin}','{}',false,false),
('upload_media','media','Upload media','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('replace_media','media','Replace media','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('delete_media','media','Delete media','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('approve_media','media','Approve media','{media,faculty,org_admin,college_admin,dept_admin}','{media}',false,false),
('manage_documents','media','Manage documents','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('manage_videos','media','Manage videos','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('manage_images','media','Manage images','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('manage_media','media','Manage media library (legacy)','{media,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{media,organizer,coordinator}',false,false),
('create_notifications','notifications','Create notifications','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('broadcast_notifications','notifications','Broadcast notifications','{faculty,org_admin,college_admin,dept_admin}','{coordinator}',false,false),
('send_emails','notifications','Send emails','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('send_sms','notifications','Send SMS','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_templates','notifications','Manage notification templates','{org_admin,college_admin,dept_admin}','{}',false,false),
('manage_notification_preferences','notifications','Manage own notification prefs','{}','{}',false,true),
('view_reports','reports','View reports','{finance,sponsor,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator,sponsor}',false,false),
('generate_reports','reports','Generate reports','{finance,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('export_reports','reports','Export reports','{finance,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('analytics_dashboard','reports','Analytics dashboard','{finance,sponsor,faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator,sponsor}',false,false),
('custom_reports','reports','Custom reports','{finance,org_admin,college_admin,dept_admin}','{}',false,false),
('view_audit_logs','audit','View audit logs','{faculty,org_admin,college_admin,dept_admin}','{}',false,false),
('export_audit_logs','audit','Export audit logs','{org_admin,college_admin,dept_admin}','{}',false,false),
('view_system_logs','audit','View system logs','{}','{}',false,false),
('manage_platform_settings','settings','Manage platform settings','{}','{}',false,false),
('manage_event_settings','settings','Manage event settings','{faculty,organizer,coordinator,org_admin,college_admin,dept_admin}','{organizer,coordinator}',false,false),
('manage_organization_settings','settings','Manage organization settings','{org_admin,college_admin}','{}',false,false),
('manage_profile_settings','settings','Manage own profile','{}','{}',false,true),
('feature_flags','settings','Feature flags','{}','{}',false,false),
('system_configuration','settings','System configuration','{}','{}',false,false),
('mentor_teams','projects','Mentor teams','{}','{mentor}',false,false),
('sponsor_view','reports','Sponsor dashboard','{sponsor}','{sponsor}',false,false)
ON CONFLICT (action) DO UPDATE
  SET category = EXCLUDED.category,
      label = EXCLUDED.label,
      global_roles = EXCLUDED.global_roles,
      event_roles = EXCLUDED.event_roles,
      is_public = EXCLUDED.is_public,
      is_self_service = EXCLUDED.is_self_service,
      updated_at = now();

CREATE OR REPLACE FUNCTION public.can(_uid uuid, _action text, _event uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perm RECORD;
BEGIN
  SELECT category, global_roles, event_roles, is_public, is_self_service
    INTO perm FROM public.role_permissions WHERE action = _action;
  IF NOT FOUND THEN RETURN false; END IF;
  IF perm.is_public THEN RETURN true; END IF;
  IF _uid IS NOT NULL AND public.is_platform_admin(_uid) THEN RETURN true; END IF;
  IF _uid IS NULL THEN RETURN false; END IF;
  IF perm.is_self_service THEN RETURN true; END IF;
  IF array_length(perm.global_roles, 1) IS NOT NULL
     AND public.has_any_global_role(_uid, perm.global_roles) THEN
    RETURN true;
  END IF;
  IF _event IS NOT NULL
     AND array_length(perm.event_roles, 1) IS NOT NULL
     AND public.has_any_role_in_event(_uid, perm.event_roles, _event) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can(uuid, text, uuid) TO authenticated;
