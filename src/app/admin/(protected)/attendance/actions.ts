'use server'

import { createServiceRoleClient, serialize } from '@/lib/supabase/server'
import { getWeatherForOffices, type DailyWeather, type OfficeWithWeather } from '@/lib/weather'

export type { DailyWeather }
export type AttendanceWeather = OfficeWithWeather

/**
 * Ensure weather is cached for the date range, then return from DB.
 * Backfills missing dates from Open-Meteo automatically.
 */
export async function getWeatherForDateRange(
  startDate: string,
  endDate: string
): Promise<AttendanceWeather[]> {
  const supabase = await createServiceRoleClient()
  const { data: offices } = await supabase
    .from('offices')
    .select('id, name')
    .order('name')
  if (!offices?.length) return []
  return getWeatherForOffices(offices, startDate, endDate)
}

export async function getAttendanceLogs(filters: {
  startDate?: string
  endDate?: string
  department?: string
  status?: string
  employeeName?: string
  officeId?: string
}) {
  const supabase = await createServiceRoleClient()
  let query = supabase
    .from('attendance_logs')
    .select(
      '*, employee:employees(name, email, department, employee_code), office:offices(id, name)'
    )
    .order('date', { ascending: false })
    .order('check_in', { ascending: false })
    .limit(200)

  if (filters.startDate) query = query.gte('date', filters.startDate)
  if (filters.endDate) query = query.lte('date', filters.endDate)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.officeId && filters.officeId !== 'all') query = query.eq('office_id', filters.officeId)

  const { data, error } = await query
  if (error) throw error

  let results = data || []

  if (filters.department && filters.department !== 'all') {
    results = results.filter((r: any) => r.employee?.department === filters.department)
  }
  if (filters.employeeName) {
    const search = filters.employeeName.toLowerCase()
    results = results.filter((r: any) => r.employee?.name?.toLowerCase().includes(search))
  }

  return serialize(results)
}

export async function manualCheckIn(employeeId: string) {
  const supabase = await createServiceRoleClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('Employee already has an attendance record today')
  }

  const { error } = await supabase.from('attendance_logs').insert({
    employee_id: employeeId,
    check_in: new Date().toISOString(),
    date: today,
    status: 'present',
    method: 'manual',
  })
  if (error) throw error
}

export async function manualCheckOut(logId: string) {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('attendance_logs')
    .update({ check_out: new Date().toISOString() })
    .eq('id', logId)
  if (error) throw error
}

export async function deleteAttendanceLog(logId: string) {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('attendance_logs').delete().eq('id', logId)
  if (error) throw error
}

export async function getEmployeeOptions() {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('employees')
    .select('id, name, employee_code')
    .eq('is_active', true)
    .order('name')
  return serialize(data || [])
}
