'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCachedDayWeather, type DailyWeather } from '@/lib/weather'

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
  try {
    const supabase = await createServiceRoleClient()
    const now = new Date()

    // Fetch offices first — we need timezones to determine each office's "today"
    const { data: offices } = await supabase
      .from('offices')
      .select('id, name, slug, timezone, late_threshold')
      .order('name')

    // Collect all distinct local-today dates across offices for querying attendance
    const localTodayByOffice = new Map<string, string>()
    const allLocalDates = new Set<string>()
    offices?.forEach((o: { id: string; timezone: string }) => {
      const ld = localDateInTz(o.timezone, now)
      localTodayByOffice.set(o.id, ld)
      allLocalDates.add(ld)
    })
    // Fallback: UTC today
    const utcToday = now.toISOString().split('T')[0]
    allLocalDates.add(utcToday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      { count: totalEmployees },
      { data: recentLogs },
      { data: last30DaysLogs },
      { data: employeesByOffice },
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('attendance_logs')
        .select('*, employee:employees(name, department), office:offices(id, name)')
        .gte('date', yesterday)
        .order('check_in', { ascending: false }),
      supabase
        .from('attendance_logs')
        .select('date, status')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      supabase.from('employees').select('office_id').eq('is_active', true),
    ])

    // Filter today's logs: include a log if its date matches the local today for its office
    const todayLogs = recentLogs?.filter((l: any) => {
      const officeToday = l.office_id ? localTodayByOffice.get(l.office_id) : utcToday
      return l.date === (officeToday || utcToday)
    }) || []

    const presentCount = todayLogs.filter((l: any) => l.status === 'present').length
    const lateCount = todayLogs.filter((l: any) => l.status === 'late').length
    const absentCount = Math.max(0, (totalEmployees || 0) - todayLogs.length)

    // Per-office employee count
    const empCountByOffice: Record<string, number> = {}
    employeesByOffice?.forEach((e: { office_id: string | null }) => {
      if (e.office_id) {
        empCountByOffice[e.office_id] = (empCountByOffice[e.office_id] || 0) + 1
      }
    })

    // Read cached weather (best-effort, no backfill on dashboard load to keep it fast)
    const weatherByOffice = new Map<string, DailyWeather>()
    if (offices?.length) {
      const weatherReads = offices.map(async (o: { id: string; timezone: string }) => {
        try {
          const localToday = localTodayByOffice.get(o.id) || utcToday
          const cached = await getCachedDayWeather(o.id, localToday)
          if (cached) weatherByOffice.set(o.id, cached)
        } catch { /* ignore weather read errors */ }
      })
      await Promise.allSettled(weatherReads)
    }

    const officeBreakdown: OfficeBreakdown[] =
      offices?.map((o: { id: string; name: string; slug: string; timezone: string; late_threshold: string }) => {
        const localToday = localTodayByOffice.get(o.id) || utcToday
        const todayOfficeLogs =
          recentLogs?.filter((l: any) => l.office_id === o.id && l.date === localToday) || []
        const present = todayOfficeLogs.filter((l: any) => l.status === 'present').length
        const late = todayOfficeLogs.filter((l: any) => l.status === 'late').length
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
    todayLogs.forEach((log: any) => {
      const dept = log.employee?.department || 'Unknown'
      deptMap[dept] = (deptMap[dept] || 0) + 1
    })
    const departmentData = Object.entries(deptMap).map(([name, count]) => ({ name, count }))

    const trendMap: Record<string, number> = {}
    last30DaysLogs?.forEach((log: any) => {
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
      recentLogs: todayLogs,
      departmentData,
      trendData,
      officeBreakdown,
    }
  } catch (err) {
    console.error('[dashboard] getDashboardStats failed:', err)
    return {
      totalEmployees: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      recentLogs: [],
      departmentData: [],
      trendData: [],
      officeBreakdown: [],
    }
  }
}
