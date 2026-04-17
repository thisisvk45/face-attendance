-- =============================================================
-- Multi-office + timezone support
-- Adds an offices table, links employees and attendance_logs to
-- an office, and rewrites record_attendance() so date and lateness
-- are computed in the office's local timezone.
-- =============================================================

-- 1. Offices table
CREATE TABLE IF NOT EXISTS offices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  timezone        text NOT NULL,        -- IANA, e.g. 'Asia/Kolkata'
  late_threshold  text NOT NULL DEFAULT '09:30', -- HH:MM in local time
  address         text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read offices" ON offices;
CREATE POLICY "anyone can read offices" ON offices FOR SELECT USING (true);

-- 2. Seed three offices (idempotent on slug)
INSERT INTO offices (name, slug, timezone, late_threshold) VALUES
  ('Bangalore HQ', 'bangalore', 'Asia/Kolkata',     '09:30'),
  ('New York',     'new-york',  'America/New_York', '09:00'),
  ('London',       'london',    'Europe/London',    '09:00')
ON CONFLICT (slug) DO NOTHING;

-- 3. Add office_id to employees + attendance_logs (nullable, then backfill, then NOT NULL on employees)
ALTER TABLE employees       ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices(id);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices(id);

UPDATE employees
   SET office_id = (SELECT id FROM offices WHERE slug = 'bangalore')
 WHERE office_id IS NULL;

UPDATE attendance_logs
   SET office_id = (SELECT id FROM offices WHERE slug = 'bangalore')
 WHERE office_id IS NULL;

-- Make required going forward (employees only — historical logs from before
-- multi-office can stay nullable as a safety net).
ALTER TABLE employees ALTER COLUMN office_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_office       ON employees(office_id);
CREATE INDEX IF NOT EXISTS idx_attendance_office_date ON attendance_logs(office_id, date);

-- 4. Replace record_attendance() so date + lateness are computed in office tz.
--    Drop both the old 3-arg and any prior 2-arg version first.
DROP FUNCTION IF EXISTS record_attendance(uuid, float, time);
DROP FUNCTION IF EXISTS record_attendance(uuid, float);

CREATE OR REPLACE FUNCTION record_attendance(
  p_employee_id      uuid,
  p_confidence_score float
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_office_id        uuid;
  v_tz               text;
  v_late_threshold   time;
  v_today            date;
  v_now_local        time;
  v_min_work_minutes int;
  v_existing         record;
  v_status           text;
  v_minutes_so_far   int;
  v_result           json;
BEGIN
  -- Resolve the employee's office and its settings
  SELECT e.office_id, o.timezone, o.late_threshold::time
    INTO v_office_id, v_tz, v_late_threshold
    FROM employees e
    JOIN offices  o ON o.id = e.office_id
   WHERE e.id = p_employee_id;

  -- Defensive defaults if an employee row somehow lacks an office
  IF v_tz IS NULL THEN
    v_tz             := 'UTC';
    v_late_threshold := '09:30'::time;
  END IF;

  v_today     := (now() AT TIME ZONE v_tz)::date;
  v_now_local := (now() AT TIME ZONE v_tz)::time;

  -- min_work_minutes is a global config row; default 1 if missing
  SELECT COALESCE((value)::int, 1)
    INTO v_min_work_minutes
    FROM config
   WHERE key = 'min_work_minutes';
  IF v_min_work_minutes IS NULL THEN v_min_work_minutes := 1; END IF;

  -- Most recent log for this employee on the OFFICE'S local date
  SELECT *
    INTO v_existing
    FROM attendance_logs
   WHERE employee_id = p_employee_id
     AND date        = v_today
   ORDER BY check_in DESC
   LIMIT 1;

  IF v_existing IS NULL THEN
    -- First check-in of the day (in office time)
    IF v_now_local > v_late_threshold THEN
      v_status := 'late';
    ELSE
      v_status := 'present';
    END IF;

    INSERT INTO attendance_logs
      (employee_id, check_in, date, status, confidence_score, method, office_id)
    VALUES
      (p_employee_id, now(), v_today, v_status, p_confidence_score, 'face', v_office_id)
    RETURNING json_build_object(
      'action', 'check_in',
      'status', status,
      'time',   check_in
    ) INTO v_result;

  ELSIF v_existing.check_out IS NULL THEN
    -- Checked in but not out — enforce min work minutes gap
    v_minutes_so_far := FLOOR(EXTRACT(EPOCH FROM (now() - v_existing.check_in)) / 60);

    IF v_minutes_so_far < v_min_work_minutes THEN
      v_result := json_build_object(
        'action',           'still_checked_in',
        'check_in_time',    v_existing.check_in,
        'min_work_minutes', v_min_work_minutes,
        'minutes_so_far',   v_minutes_so_far
      );
    ELSE
      UPDATE attendance_logs
         SET check_out = now()
       WHERE id = v_existing.id
       RETURNING json_build_object(
         'action',        'check_out',
         'time',          check_out,
         'check_in_time', check_in
       ) INTO v_result;
    END IF;

  ELSE
    -- Already checked in AND out
    v_result := json_build_object(
      'action',           'all_done_today',
      'check_in_time',    v_existing.check_in,
      'check_out_time',   v_existing.check_out
    );
  END IF;

  RETURN v_result;
END;
$$;
