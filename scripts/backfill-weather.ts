import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env'); process.exit(1) }

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const WMO: Record<number, string> = { 0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Light showers',81:'Showers',82:'Heavy showers',95:'Thunderstorm',96:'Thunderstorm + hail',99:'Severe thunderstorm' }

const CITIES = [
  { slug: 'miami', lat: 25.77427, lon: -80.19366 },
  { slug: 'seattle', lat: 47.60621, lon: -122.33207 },
]

async function go() {
  const end = new Date().toISOString().split('T')[0]
  const start = new Date(Date.now() - 89 * 86400000).toISOString().split('T')[0]
  const mid = new Date(Date.now() - 88 * 86400000).toISOString().split('T')[0]

  for (const city of CITIES) {
    const { data: office } = await supabase.from('offices').select('id').eq('slug', city.slug).single()
    if (!office) { console.log(city.slug + ': not found'); continue }

    let total = 0
    const ranges: [string, string, string][] = [
      ['https://archive-api.open-meteo.com/v1/archive', start, mid],
      ['https://api.open-meteo.com/v1/forecast', mid, end],
    ]

    for (const [api, sd, ed] of ranges) {
      const params = `?latitude=${city.lat}&longitude=${city.lon}&start_date=${sd}&end_date=${ed}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`
      const res = await fetch(api + params)
      if (!res.ok) { console.log(`  ${city.slug} API ${res.status}`); continue }
      const data = await res.json()
      const d = data.daily
      if (!d?.time?.length) continue

      const rows = d.time.map((date: string, i: number) => ({
        office_id: office.id,
        date,
        temperature_max: d.temperature_2m_max[i],
        temperature_min: d.temperature_2m_min[i],
        precipitation: d.precipitation_sum[i] ?? 0,
        weather_code: d.weather_code[i] ?? 0,
        description: WMO[d.weather_code[i]] || 'Unknown',
      }))

      const { error } = await supabase.from('daily_weather').upsert(rows, { onConflict: 'office_id,date' })
      if (error) console.log(`  upsert error: ${error.message}`)
      total += rows.length
    }
    console.log(`${city.slug}: ${total} days`)
  }
}

go().catch(console.error)
