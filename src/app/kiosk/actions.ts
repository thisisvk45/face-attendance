'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { FaceData, AttendanceResult, Department, Employee, Office } from '@/lib/types'

export async function getOffices(): Promise<Office[]> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('offices').select('*').order('name')
  if (error) {
    console.error('[kiosk] getOffices error:', error)
    return []
  }
  return (data || []) as Office[]
}

export async function getOfficeBySlug(slug: string): Promise<Office | null> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('offices').select('*').eq('slug', slug).maybeSingle()
  if (error) {
    console.error('[kiosk] getOfficeBySlug error:', error)
    return null
  }
  return (data as Office) || null
}

export async function getDepartmentsForKiosk(): Promise<Department[]> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('departments').select('*').order('name')
  if (error) {
    console.error('[kiosk] getDepartmentsForKiosk error:', error)
    return []
  }
  return (data || []) as Department[]
}

export async function selfEnroll(input: {
  name: string
  employee_code: string
  department: string
  role?: string | null
  office_id: string
  face_descriptor: number[]
  face_image_base64: string | null
  consented_at: string // ISO timestamp of explicit consent
}): Promise<{ ok: true; employee: Employee } | { ok: false; error: string }> {
  const supabase = await createServiceRoleClient()

  const name = input.name.trim()
  const employee_code = input.employee_code.trim()
  const department = input.department.trim()
  const office_id = input.office_id

  if (!name || !employee_code || !department) {
    return { ok: false, error: 'Name, employee code, and department are required.' }
  }
  if (!office_id) {
    return { ok: false, error: 'Office is required.' }
  }
  if (!input.consented_at) {
    return { ok: false, error: 'Biometric consent is required to register.' }
  }
  if (!input.face_descriptor || input.face_descriptor.length !== 128) {
    return { ok: false, error: 'Face capture failed. Please try again.' }
  }

  // Auto-generate a placeholder email (email column is NOT NULL UNIQUE).
  const email = `${employee_code.toLowerCase()}@kiosk.local`

  // Check for existing employee_code or email
  const { data: existing } = await supabase
    .from('employees')
    .select('id, employee_code, email')
    .or(`employee_code.eq.${employee_code},email.eq.${email}`)
    .limit(1)

  if (existing && existing.length > 0) {
    return { ok: false, error: `Employee code "${employee_code}" is already registered.` }
  }

  // Upload face image to storage (non-fatal if it fails)
  let faceImageUrl: string | null = null
  if (input.face_image_base64) {
    const base64Data = input.face_image_base64.split(',')[1]
    if (base64Data) {
      const buffer = Buffer.from(base64Data, 'base64')
      const fileName = `${employee_code}_${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(fileName, buffer, { contentType: 'image/jpeg' })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('face-images').getPublicUrl(fileName)
        faceImageUrl = urlData.publicUrl
      } else {
        console.error('[kiosk] face image upload failed:', uploadError)
      }
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({
      name,
      email,
      department,
      role: input.role || null,
      employee_code,
      office_id,
      face_descriptor: input.face_descriptor,
      face_image_url: faceImageUrl,
      is_active: true,
      consented_at: input.consented_at,
    })
    .select()
    .single()

  if (error) {
    console.error('[kiosk] selfEnroll insert error:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true, employee: data as Employee }
}

/**
 * Face descriptors for ONE office's kiosk.
 * Scoping by office prevents a Bangalore employee from being recognised at the New York kiosk.
 */
export async function getFaceDescriptors(officeId: string): Promise<FaceData[]> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, face_descriptor, face_image_url')
    .eq('is_active', true)
    .eq('office_id', officeId)
    .not('face_descriptor', 'is', null)

  if (error) {
    console.error('Error fetching face descriptors:', error)
    return []
  }
  return data as FaceData[]
}

export interface KioskStats {
  checked_in_today: number
  currently_in_office: number
  avg_check_in_minutes: number | null // minutes-of-day in the office's local timezone
}

/**
 * Lightweight stats for the kiosk ticker, scoped to one office.
 * Times are computed in the office's local timezone.
 */
export async function getKioskStats(officeId: string, timezone: string): Promise<KioskStats> {
  const supabase = await createServiceRoleClient()

  // Today, in the office's local timezone (the RPC tags new logs with this date already)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // 'YYYY-MM-DD'

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('check_in, check_out')
    .eq('office_id', officeId)
    .eq('date', today)
    .not('check_in', 'is', null)

  if (error) {
    console.error('[kiosk] getKioskStats error:', error)
    return { checked_in_today: 0, currently_in_office: 0, avg_check_in_minutes: null }
  }

  const rows = data || []
  let inOffice = 0
  let totalMinutes = 0
  let timedRows = 0

  // Use Intl to extract hour/minute in the office's timezone (server runs UTC on Vercel)
  const tzFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })

  for (const row of rows) {
    if (row.check_in && !row.check_out) inOffice++
    if (row.check_in) {
      const d = new Date(row.check_in as string)
      if (!isNaN(d.getTime())) {
        const parts = tzFmt.formatToParts(d)
        const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
        const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
        if (!isNaN(h) && !isNaN(m)) {
          totalMinutes += h * 60 + m
          timedRows++
        }
      }
    }
  }

  return {
    checked_in_today: rows.length,
    currently_in_office: inOffice,
    avg_check_in_minutes: timedRows > 0 ? Math.round(totalMinutes / timedRows) : null,
  }
}

export async function recordAttendance(
  employeeId: string,
  confidenceScore: number
): Promise<AttendanceResult> {
  const supabase = await createServiceRoleClient()

  // Late threshold + timezone now live on the employee's office row, so the RPC
  // doesn't need them passed in.
  const { data, error } = await supabase.rpc('record_attendance', {
    p_employee_id: employeeId,
    p_confidence_score: confidenceScore,
  })

  if (error) {
    console.error('Error recording attendance:', error)
    return { action: 'already_complete', message: error.message }
  }

  return data as AttendanceResult
}
