
-- Utsav v1.0 — Enterprise RBAC Permission Assignment
-- Upserts role_permissions catalog with correct role-to-action mappings.

-- Helper: standard admin bundle
-- ADMIN = org_admin,college_admin,dept_admin
-- SENIOR = faculty + ADMIN
-- STAFF = coordinator,organizer + SENIOR

INSERT INTO public.role_permissions (action, category, label, global_roles, event_roles, is_public, is_self_service) VALUES
-- ============ EVENTS ============
('archive_event','events','Archive event',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('cancel_event','events','Cancel event',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('clone_event','events','Clone event',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('create_event','events','Create events',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY[]::text[],false,false),
('delete_any_event','events','Delete any event',ARRAY['faculty','org_admin','college_admin','dept_admin'],ARRAY[]::text[],false,false),
('delete_own_event','events','Delete own event',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('duplicate_event','events','Duplicate event',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('edit_any_event','events','Edit any event',ARRAY['faculty','org_admin','college_admin','dept_admin'],ARRAY[]::text[],false,false),
('edit_event','events','Edit event',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('edit_own_event','events','Edit own event',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('export_event_data','events','Export event data',ARRAY['faculty','coordinator','organizer','finance','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('import_event_data','events','Import event data',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('manage_announcements','events','Manage announcements',ARRAY['faculty','coordinator','organizer','student_coordinator','media','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','student_coordinator','media'],false,false),
('manage_event_schedule','events','Manage event schedule',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('manage_event_sessions','events','Manage event sessions',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('manage_event_tracks','events','Manage event tracks',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('manage_faqs','events','Manage FAQs',ARRAY['faculty','coordinator','organizer','student_coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','student_coordinator'],false,false),
('manage_gallery','events','Manage gallery',ARRAY['faculty','coordinator','organizer','media','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','media'],false,false),
('manage_resources','events','Manage resources',ARRAY['faculty','coordinator','organizer','mentor','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','mentor'],false,false),
('manage_speakers','events','Manage speakers',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('manage_sponsors','events','Manage sponsors',ARRAY['faculty','coordinator','organizer','finance','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('manage_venue','events','Manage venue',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('publish_event','events','Publish event',ARRAY['faculty','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('restore_event','events','Restore event',ARRAY['faculty','org_admin','college_admin','dept_admin'],ARRAY[]::text[],false,false),
('view_event','events','View events',ARRAY[]::text[],ARRAY[]::text[],true,false),
('view_event_analytics','events','View event analytics',ARRAY['faculty','coordinator','organizer','sponsor','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','sponsor'],false,false),

-- ============ REGISTRATION ============
('approve_registration','registration','Approve registration',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('attendance_management','registration','Attendance management',ARRAY['faculty','coordinator','organizer','volunteer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','volunteer'],false,false),
('cancel_registration','registration','Cancel own registration',ARRAY[]::text[],ARRAY[]::text[],false,true),
('export_registrations','registration','Export registrations',ARRAY['faculty','coordinator','organizer','finance','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('generate_qr_tickets','registration','Generate QR tickets',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('manage_registrations','registration','Manage registrations',ARRAY['faculty','coordinator','organizer','student_coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','student_coordinator'],false,false),
('register','registration','Register for event',ARRAY[]::text[],ARRAY[]::text[],false,true),
('reject_registration','registration','Reject registration',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('waitlist_management','registration','Waitlist management',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),

-- ============ TEAMS ============
('approve_team_requests','teams','Approve team requests',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('create_team','teams','Create team',ARRAY[]::text[],ARRAY[]::text[],false,true),
('delete_team','teams','Delete team',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,true),
('edit_team','teams','Edit team',ARRAY[]::text[],ARRAY[]::text[],false,true),
('invite_members','teams','Invite team members',ARRAY[]::text[],ARRAY[]::text[],false,true),
('manage_team_roles','teams','Manage team roles',ARRAY[]::text[],ARRAY[]::text[],false,true),
('remove_members','teams','Remove team members',ARRAY[]::text[],ARRAY[]::text[],false,true),
('transfer_ownership','teams','Transfer team ownership',ARRAY[]::text[],ARRAY[]::text[],false,true),
('view_team_analytics','teams','View team analytics',ARRAY['faculty','coordinator','organizer','mentor','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','mentor'],false,false),

-- ============ PROJECTS & SUBMISSIONS ============
('delete_submission','projects','Delete submission',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('edit_submission','projects','Edit submission',ARRAY[]::text[],ARRAY[]::text[],false,true),
('evaluate_submission','projects','Evaluate submission',ARRAY['judge','faculty','coordinator'],ARRAY['judge'],false,false),
('mentor_teams','projects','Mentor teams',ARRAY['mentor','faculty','coordinator'],ARRAY['mentor'],false,false),
('publish_results','projects','Publish results',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('score_submission','projects','Score submission',ARRAY['judge','faculty','coordinator'],ARRAY['judge'],false,false),
('score_submissions','projects','Score submissions (legacy)',ARRAY['judge','faculty','coordinator'],ARRAY['judge'],false,false),
('submit_project','projects','Submit project',ARRAY[]::text[],ARRAY[]::text[],false,true),
('view_submissions','projects','View submissions',ARRAY['judge','mentor','faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['judge','mentor','coordinator','organizer'],false,false),

-- ============ ATTENDANCE ============
('attendance_analytics','attendance','Attendance analytics',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('attendance_reports','attendance','Attendance reports',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('bulk_check_in','attendance','Bulk check-in',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('check_in','attendance','Check attendees in (legacy)',ARRAY['faculty','coordinator','organizer','volunteer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','volunteer'],false,false),
('manual_check_in','attendance','Manual check-in',ARRAY['faculty','coordinator','organizer','volunteer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','volunteer'],false,false),
('qr_check_in','attendance','QR check-in',ARRAY['faculty','coordinator','organizer','volunteer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','volunteer'],false,false),
('qr_check_out','attendance','QR check-out',ARRAY['faculty','coordinator','organizer','volunteer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer','volunteer'],false,false),

-- ============ CERTIFICATES ============
('approve_certificates','certificates','Approve certificates',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('bulk_generate_certificates','certificates','Bulk generate certificates',ARRAY['faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['coordinator'],false,false),
('download_certificates','certificates','Download own certificate',ARRAY[]::text[],ARRAY[]::text[],false,true),
('generate_certificates','certificates','Generate certificates',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('issue_certificates','certificates','Issue certificates (legacy)',ARRAY['faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['coordinator','organizer'],false,false),
('verify_certificates','certificates','Verify certificate',ARRAY[]::text[],ARRAY[]::text[],true,false),

-- ============ MEDIA ============
('approve_media','media','Approve media',ARRAY['media','faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator'],false,false),
('delete_media','media','Delete media',ARRAY['media','faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator'],false,false),
('manage_documents','media','Manage documents',ARRAY['media','faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator','organizer'],false,false),
('manage_images','media','Manage images',ARRAY['media','faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator','organizer'],false,false),
('manage_media','media','Manage media library (legacy)',ARRAY['media','faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator','organizer'],false,false),
('manage_videos','media','Manage videos',ARRAY['media','faculty','coordinator','organizer','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator','organizer'],false,false),
('replace_media','media','Replace media',ARRAY['media','faculty','coordinator','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator'],false,false),
('upload_media','media','Upload media',ARRAY['media','faculty','coordinator','organizer','student_coordinator','org_admin','college_admin','dept_admin'],ARRAY['media','coordinator','organizer','student_coordinator'],false,false)

ON CONFLICT (action) DO UPDATE SET
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  global_roles = EXCLUDED.global_roles,
  event_roles = EXCLUDED.event_roles,
  is_public = EXCLUDED.is_public,
  is_self_service = EXCLUDED.is_self_service,
  updated_at = now();
