export interface Office {
  id: string
  name: string
  slug: string
  timezone: string // IANA, e.g. 'Asia/Kolkata'
  late_threshold: string // 'HH:MM' in office local time
  address: string | null
  created_at?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  department: string
  role: string
  employee_code: string
  office_id: string | null
  face_descriptor: number[] | null
  face_image_url: string | null
  registered_at: string
  is_active: boolean
}

export interface AttendanceLog {
  id: string
  employee_id: string
  check_in: string | null
  check_out: string | null
  date: string
  status: 'present' | 'late' | 'absent'
  confidence_score: number | null
  method: 'face' | 'manual'
  employee?: Employee
}

export interface Department {
  id: string
  name: string
  head: string | null
}

export interface Admin {
  id: string
  email: string
  name: string
  role: 'superadmin' | 'admin'
}

export interface Config {
  key: string
  value: string
}

export interface FaceData {
  id: string
  name: string
  face_descriptor: number[]
  face_image_url: string | null
}

export interface AttendanceResult {
  action:
    | 'check_in'
    | 'check_out'
    | 'still_checked_in'
    | 'all_done_today'
    | 'already_complete' // legacy, kept for backwards compat
  status?: string
  time?: string
  check_in_time?: string
  check_out_time?: string
  min_work_minutes?: number
  minutes_so_far?: number
  message?: string
}
