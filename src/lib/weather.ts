/**
 * Weather utility — DB-first with on-demand backfill from Open-Meteo.
 *
 * Read path:  daily_weather table → instant, works for any historical date.
 * Write path: Open-Meteo fetch → upsert into daily_weather (service role).
 * Cron:       /api/cron/weather runs daily to pre-fetch today's weather.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyWeather {
  date: string
  temperatureMax: number
  temperatureMin: number
  precipitation: number
  weatherCode: number
  description: string
}

export interface OfficeWithWeather {
  officeId: string
  officeName: string
  days: DailyWeather[]
}

interface GeoCache {
  latitude: number
  longitude: number
}

// ---------------------------------------------------------------------------
// WMO weather code → human description
// ---------------------------------------------------------------------------

const WMO: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + hail',
  99: 'Severe thunderstorm',
}

export function weatherDescription(code: number): string {
  return WMO[code] || 'Unknown'
}

// ---------------------------------------------------------------------------
// Geocoding (Open-Meteo, free, no key)
// ---------------------------------------------------------------------------

const geoCache = new Map<string, GeoCache>()

export async function geocode(name: string): Promise<GeoCache | null> {
  const key = name.toLowerCase().trim()
  if (geoCache.has(key)) return geoCache.get(key)!

  const searchName = name
    .replace(/\b(hq|office|headquarters|branch)\b/gi, '')
    .trim()

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&language=en&format=json`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.results?.length) return null
    const { latitude, longitude } = data.results[0]
    const result = { latitude, longitude }
    geoCache.set(key, result)
    return result
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Open-Meteo fetch (raw — used internally for backfill)
// ---------------------------------------------------------------------------

function fetchFromOpenMeteo(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  const daysDiff = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const baseUrl =
    daysDiff > 90
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast'

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    timezone: 'auto',
  })

  return fetch(`${baseUrl}?${params}`, { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const d = data?.daily
      if (!d?.time?.length) return []
      return d.time.map((date: string, i: number) => ({
        date,
        temperatureMax: d.temperature_2m_max[i],
        temperatureMin: d.temperature_2m_min[i],
        precipitation: d.precipitation_sum[i] ?? 0,
        weatherCode: d.weather_code[i] ?? 0,
        description: weatherDescription(d.weather_code[i] ?? 0),
      }))
    })
    .catch(() => [])
}

// ---------------------------------------------------------------------------
// DB read: get cached weather rows for an office + date range
// ---------------------------------------------------------------------------

export async function getCachedWeather(
  officeId: string,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('daily_weather')
    .select('date, temperature_max, temperature_min, precipitation, weather_code, description')
    .eq('office_id', officeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  return (
    data?.map((r) => ({
      date: r.date,
      temperatureMax: r.temperature_max,
      temperatureMin: r.temperature_min,
      precipitation: r.precipitation ?? 0,
      weatherCode: r.weather_code ?? 0,
      description: r.description || weatherDescription(r.weather_code ?? 0),
    })) || []
  )
}

// ---------------------------------------------------------------------------
// Backfill: fetch missing dates from Open-Meteo and save to DB
// ---------------------------------------------------------------------------

/**
 * Generate all YYYY-MM-DD strings between start and end (inclusive).
 */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (d <= last) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

export async function backfillWeather(
  officeId: string,
  officeName: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const supabase = await createServiceRoleClient()

  // 1. Find which dates are already cached
  const { data: existing } = await supabase
    .from('daily_weather')
    .select('date')
    .eq('office_id', officeId)
    .gte('date', startDate)
    .lte('date', endDate)

  const cachedSet = new Set(existing?.map((r) => r.date) || [])
  const allDates = dateRange(startDate, endDate)
  const missing = allDates.filter((d) => !cachedSet.has(d))

  if (missing.length === 0) return 0

  // 2. Geocode the office
  const geo = await geocode(officeName)
  if (!geo) return 0

  // 3. Fetch from Open-Meteo (batch: min date → max date)
  const minDate = missing[0]
  const maxDate = missing[missing.length - 1]
  const fetched = await fetchFromOpenMeteo(geo.latitude, geo.longitude, minDate, maxDate)
  if (fetched.length === 0) return 0

  // 4. Filter to only the missing dates and upsert
  const missingSet = new Set(missing)
  const toInsert = fetched
    .filter((w) => missingSet.has(w.date))
    .map((w) => ({
      office_id: officeId,
      date: w.date,
      temperature_max: w.temperatureMax,
      temperature_min: w.temperatureMin,
      precipitation: w.precipitation,
      weather_code: w.weatherCode,
      description: w.description,
    }))

  if (toInsert.length === 0) return 0

  const { error } = await supabase
    .from('daily_weather')
    .upsert(toInsert, { onConflict: 'office_id,date' })

  if (error) {
    console.error('[weather] backfill upsert failed:', error)
    return 0
  }

  return toInsert.length
}

// ---------------------------------------------------------------------------
// High-level: ensure weather is cached, then return from DB
// ---------------------------------------------------------------------------

/**
 * For each office, ensure weather is cached for the date range,
 * backfilling from Open-Meteo as needed, then return from DB.
 */
export async function getWeatherForOffices(
  offices: { id: string; name: string }[],
  startDate: string,
  endDate: string
): Promise<OfficeWithWeather[]> {
  // Backfill all offices in parallel (best-effort)
  await Promise.allSettled(
    offices.map((o) => backfillWeather(o.id, o.name, startDate, endDate))
  )

  // Read from DB
  const results = await Promise.all(
    offices.map(async (o) => {
      const days = await getCachedWeather(o.id, startDate, endDate)
      return { officeId: o.id, officeName: o.name, days }
    })
  )

  return results.filter((r) => r.days.length > 0)
}

/**
 * Convenience: get a single day's weather for one office from cache.
 * Returns null if not cached (caller should backfill first).
 */
export async function getCachedDayWeather(
  officeId: string,
  date: string
): Promise<DailyWeather | null> {
  const rows = await getCachedWeather(officeId, date, date)
  return rows.length > 0 ? rows[0] : null
}
