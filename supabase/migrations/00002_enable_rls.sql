-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Admin policies (authenticated users who exist in admins table)
CREATE POLICY "Admins can do everything on departments" ON departments
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins));

CREATE POLICY "Admins can do everything on employees" ON employees
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins));

CREATE POLICY "Admins can do everything on attendance_logs" ON attendance_logs
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins));

CREATE POLICY "Admins can do everything on admins" ON admins
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins));

CREATE POLICY "Admins can do everything on config" ON config
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins));

-- Kiosk (anon) policies
CREATE POLICY "Anon can read active employee face data" ON employees
  FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

CREATE POLICY "Anon can insert attendance_logs" ON attendance_logs
  FOR INSERT WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Anon can read today attendance" ON attendance_logs
  FOR SELECT USING (auth.role() = 'anon' AND date = CURRENT_DATE);
