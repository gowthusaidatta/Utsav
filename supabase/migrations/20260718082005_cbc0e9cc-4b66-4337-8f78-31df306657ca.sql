
-- 1) Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student_coordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guest';
