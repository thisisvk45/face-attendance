-- Function to get face descriptors for kiosk (limited data exposure)
CREATE OR REPLACE FUNCTION get_face_descriptors()
RETURNS TABLE (
  id uuid,
  name text,
  face_descriptor float8[],
  face_image_url text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, face_descriptor, face_image_url
  FROM employees
  WHERE is_active = true AND face_descriptor IS NOT NULL;
$$;

-- Function to record attendance from kiosk
CREATE OR REPLACE FUNCTION record_attendance(
  p_employee_id uuid,
  p_confidence_score float,
  p_late_threshold time DEFAULT '09:30'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing record;
  v_status text;
  v_result json;
BEGIN
  -- Check for existing attendance today
  SELECT * INTO v_existing
  FROM attendance_logs
  WHERE employee_id = p_employee_id AND date = CURRENT_DATE
  ORDER BY check_in DESC
  LIMIT 1;

  IF v_existing IS NULL THEN
    -- No record today: check in
    IF CURRENT_TIME > p_late_threshold THEN
      v_status := 'late';
    ELSE
      v_status := 'present';
    END IF;

    INSERT INTO attendance_logs (employee_id, check_in, date, status, confidence_score, method)
    VALUES (p_employee_id, now(), CURRENT_DATE, v_status, p_confidence_score, 'face')
    RETURNING json_build_object('action', 'check_in', 'status', status, 'time', check_in) INTO v_result;
  ELSIF v_existing.check_out IS NULL THEN
    -- Checked in but no check out: check out
    UPDATE attendance_logs
    SET check_out = now()
    WHERE id = v_existing.id
    RETURNING json_build_object('action', 'check_out', 'time', check_out) INTO v_result;
  ELSE
    -- Already checked in and out
    v_result := json_build_object('action', 'already_complete', 'message', 'Already checked in and out today');
  END IF;

  RETURN v_result;
END;
$$;
