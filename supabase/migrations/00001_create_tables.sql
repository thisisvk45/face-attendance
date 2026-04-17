-- Create departments table
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  head text
);

-- Create employees table
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  department text NOT NULL,
  role text,
  employee_code text UNIQUE NOT NULL,
  face_descriptor float8[],
  face_image_url text,
  registered_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create attendance_logs table
CREATE TABLE attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in timestamptz,
  check_out timestamptz,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'absent')),
  confidence_score float,
  method text NOT NULL DEFAULT 'face' CHECK (method IN ('face', 'manual'))
);

-- Create admins table
CREATE TABLE admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin'))
);

-- Create config table for settings
CREATE TABLE config (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Insert default config
INSERT INTO config (key, value) VALUES ('late_threshold', '09:30');

-- Create indexes
CREATE INDEX idx_attendance_employee_id ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_date ON attendance_logs(date);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_active ON employees(is_active);
