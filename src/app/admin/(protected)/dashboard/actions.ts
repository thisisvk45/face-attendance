'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { backfillWeather, getCachedDayWeather, type DailyWeather } from '@/lib/weather'

export interface OfficeWeather {
  temperatureMax: number
  temperatureMin: number
  precipitation: number
  weatherCode: number
  description: string
}

export interface OfficeBreakdown {
  id: string
  name: string
  slug: string
  timezone: string
  late_threshold: string
  localDate: string
  localTime: string
  total: number
  present: number
  late: number
  notCheckedIn: number
  weather: OfficeWeather | null
}

function localDateInTz(tz: string, now: Date = new Date()) {
  // 'en-CA' yields YYYY-MM-DD which matches DB date format
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function localTimeInTz(tz: string, now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now)
}

export async function getDashboardStats() {
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: totalEmployees },
    { data: todayLogs },
    { data: last30DaysLogs },
    { data: offices },
    { data: employeesByOffice },
    { data: recentTwoDayLogs },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('attendance_logs').select('*, employee:employees(name, department)').eq('date', today),
    supabase
      .from('attendance_logs')
      .select('date, status')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    supabase.from('offices').select('id, name, slug, timezone, late_threshold').order('name'),
    supabase.from('employees').select('office_id').eq('is_active', true),
    supabase.from('attendance_logs').select('office_id, status, date').gte('date', yesterday),
  ])

  const presentCount = todayLogs?.filter((l) => l.status === 'present').length || 0
  const lateCount = todayLogs?.filter((l) => l.status === 'late').length || 0
  const absentCount = (totalEmployees || 0) - (todayLogs?.length || 0)

  // Per-office breakdown using each office's local "today"
  const empCountByOffice: Record<string, number> = {}
  employeesByOffice?.forEach((e: { office_id: string | null }) => {
    if (e.office_id) {
      empCountByOffice[e.office_id] = (empCountByOffice[e.office_id] || 0) + 1
    }
  })

  const now = new Date()

  // Backfill + read today's weather for all offices (DB-backed, best-effort)
  const weatherByOffice = new Map<string, DailyWeather>()
  if (offices?.length) {
    const weatherPromises = offices.map(
      async (o: { id: string; name: string; timezone: string }) => {
        const localToday = localDateInTz(o.timezone, now)
        await backfillWeather(o.id, o.name, localToday, localToday)
        const cached = await getCachedDayWeather(o.id, localToday)
        if (cached) weatherByOffice.set(o.id, cached)
      }
    )
    await Promise.allSettled(weatherPromises)
  }

  const officeBreakdown: OfficeBreakdown[] =
    offices?.map((o: { id: string; name: string; slug: string; timezone: string; late_threshold: string }) => {
      const localToday = localDateInTz(o.timezone, now)
      const todayOfficeLogs =
        recentTwoDayLogs?.filter((l) => l.office_id === o.id && l.date === localToday) || []
      const present = todayOfficeLogs.filter((l) => l.status === 'present').length
      const late = todayOfficeLogs.filter((l) => l.status === 'late').length
      const total = empCountByOffice[o.id] || 0
      const w = weatherByOffice.get(o.id)
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        timezone: o.timezone,
        late_threshold: o.late_threshold,
        localDate: localToday,
        localTime: localTimeInTz(o.timezone, now),
        total,
        present,
        late,
        notCheckedIn: Math.max(0, total - todayOfficeLogs.length),
        weather: w
          ? {
              temperatureMax: w.temperatureMax,
              temperatureMin: w.temperatureMin,
              precipitation: w.precipitation,
              weatherCode: w.weatherCode,
              description: w.description,
            }
          : null,
      }
    }) || []

  const deptMap: Record<string, number> = {}
  todayLogs?.forEach((log: any) => {
    const dept = log.employee?.department || 'Unknown'
    deptMap[dept] = (deptMap[dept] || 0) + 1
  })
  const departmentData = Object.entries(deptMap).map(([name, count]) => ({ name, count }))

  const trendMap: Record<string, number> = {}
  last30DaysLogs?.forEach((log) => {
    trendMap[log.date] = (trendMap[log.date] || 0) + 1
  })
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  return {
    totalEmployees: totalEmployees || 0,
    presentCount,
    lateCount,
    absentCount,
    recentLogs: todayLogs || [],
    departmentData,
    trendData,
    officeBreakdown,
  }
}
