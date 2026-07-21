-- Tighten registrations UPDATE policy so attendees cannot promote themselves off waitlist or self-check-in.
DROP POLICY IF EXISTS "reg_update_self_or_staff" ON public.registrations;

-- Self can only self-cancel their own registration.
CREATE POLICY "reg_update_self_cancel" ON public.registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- Staff (event managers / check-in staff) can perform any transition.
CREATE POLICY "reg_update_staff" ON public.registrations FOR UPDATE TO authenticated
  USING (public.can(auth.uid(), 'manage_teams', event_id) OR public.can(auth.uid(), 'check_in', event_id))
  WITH CHECK (public.can(auth.uid(), 'manage_teams', event_id) OR public.can(auth.uid(), 'check_in', event_id));

-- Defense-in-depth trigger: block non-staff from touching checked_in_at or moving to a privileged status.
CREATE OR REPLACE FUNCTION public.registrations_guard_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  is_staff boolean;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;
  is_staff := public.can(actor, 'manage_teams', NEW.event_id) OR public.can(actor, 'check_in', NEW.event_id);
  IF is_staff THEN
    RETURN NEW;
  END IF;
  -- Non-staff acting on their own row: allow only cancellation, forbid check-in fields.
  IF NEW.user_id <> actor THEN
    RAISE EXCEPTION 'Not allowed to modify another user''s registration';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'You can only cancel your own registration';
  END IF;
  IF NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
     OR NEW.checked_out_at IS DISTINCT FROM OLD.checked_out_at THEN
    RAISE EXCEPTION 'Only staff can change check-in state';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registrations_guard_status ON public.registrations;
CREATE TRIGGER registrations_guard_status
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.registrations_guard_status();