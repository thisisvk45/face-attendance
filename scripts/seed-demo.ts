/**
 * Comprehensive demo seed for FaceAttend (US-only, 6 venues)
 *
 * Creates:
 *   - 8 departments
 *   - 42 employees across 6 US offices with manager hierarchy
 *   - Synthetic face descriptors (128-float arrays) for all employees
 *   - 7 admin accounts (1 superadmin + 1 per office)
 *   - 90 days of realistic attendance
 *   - Leave records (vacation, sick, WFH)
 *   - 2 audit/deletion_log entries
 *   - Weather backfill for all 90 days
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  { name: 'Engineering', head: 'Jason Miller' },
  { name: 'Design', head: 'Rachel Kim' },
  { name: 'Product', head: 'Marcus Johnson' },
  { name: 'Human Resources', head: 'Patricia Hernandez' },
  { name: 'Sales', head: 'Brian O\'Connor' },
  { name: 'Marketing', head: 'Samantha Lee' },
  { name: 'Finance', head: 'Thomas Wright' },
  { name: 'Operations', head: 'Diana Cruz' },
]

interface EmpDef {
  name: string
  email: string
  code: string
  department: string
  role: string
  office: string       // slug
  punctuality: number  // 0–1, higher = more punctual
  attendance: number   // 0–1, probability of showing up
  isManager?: boolean  // heads a team
  managerCode?: string // reports to this employee_code
}

const EMPLOYEES: EmpDef[] = [
  // ── New York (10) ─────────────────────────────────────────
  { name: 'Jason Miller', email: 'jason.miller@nagarro.com', code: 'NYC-001', department: 'Engineering', role: 'VP Engineering', office: 'new-york', punctuality: 0.93, attendance: 0.97, isManager: true },
  { name: 'Patricia Hernandez', email: 'patricia.hernandez@nagarro.com', code: 'NYC-002', department: 'Human Resources', role: 'HR Director', office: 'new-york', punctuality: 0.91, attendance: 0.96, isManager: true },
  { name: 'Thomas Wright', email: 'thomas.wright@nagarro.com', code: 'NYC-003', department: 'Finance', role: 'CFO', office: 'new-york', punctuality: 0.95, attendance: 0.98, isManager: true },
  { name: 'Kevin Chen', email: 'kevin.chen@nagarro.com', code: 'NYC-004', department: 'Engineering', role: 'Senior Developer', office: 'new-york', punctuality: 0.82, attendance: 0.93, managerCode: 'NYC-001' },
  { name: 'Ashley Williams', email: 'ashley.williams@nagarro.com', code: 'NYC-005', department: 'Engineering', role: 'Frontend Developer', office: 'new-york', punctuality: 0.58, attendance: 0.87, managerCode: 'NYC-001' },
  { name: 'Ryan Thompson', email: 'ryan.thompson@nagarro.com', code: 'NYC-006', department: 'Finance', role: 'Financial Analyst', office: 'new-york', punctuality: 0.88, attendance: 0.94, managerCode: 'NYC-003' },
  { name: 'Jennifer Davis', email: 'jennifer.davis@nagarro.com', code: 'NYC-007', department: 'Human Resources', role: 'HR Coordinator', office: 'new-york', punctuality: 0.85, attendance: 0.95, managerCode: 'NYC-002' },
  { name: 'Daniel Garcia', email: 'daniel.garcia@nagarro.com', code: 'NYC-008', department: 'Engineering', role: 'Backend Developer', office: 'new-york', punctuality: 0.72, attendance: 0.9, managerCode: 'NYC-001' },
  { name: 'Michelle Robinson', email: 'michelle.robinson@nagarro.com', code: 'NYC-009', department: 'Finance', role: 'Accountant', office: 'new-york', punctuality: 0.9, attendance: 0.96, managerCode: 'NYC-003' },
  { name: 'Christopher Lee', email: 'christopher.lee@nagarro.com', code: 'NYC-010', department: 'Engineering', role: 'QA Lead', office: 'new-york', punctuality: 0.46, attendance: 0.84, managerCode: 'NYC-001' },

  // ── San Francisco (8) ─────────────────────────────────────
  { name: 'Rachel Kim', email: 'rachel.kim@nagarro.com', code: 'SFO-001', department: 'Design', role: 'Design Director', office: 'san-francisco', punctuality: 0.87, attendance: 0.95, isManager: true },
  { name: 'Marcus Johnson', email: 'marcus.johnson@nagarro.com', code: 'SFO-002', department: 'Product', role: 'Head of Product', office: 'san-francisco', punctuality: 0.78, attendance: 0.93, isManager: true },
  { name: 'Nicole Brown', email: 'nicole.brown@nagarro.com', code: 'SFO-003', department: 'Design', role: 'Senior Designer', office: 'san-francisco', punctuality: 0.81, attendance: 0.92, managerCode: 'SFO-001' },
  { name: 'Andrew Martinez', email: 'andrew.martinez@nagarro.com', code: 'SFO-004', department: 'Product', role: 'Product Manager', office: 'san-francisco', punctuality: 0.73, attendance: 0.9, managerCode: 'SFO-002' },
  { name: 'Laura Taylor', email: 'laura.taylor@nagarro.com', code: 'SFO-005', department: 'Design', role: 'UX Researcher', office: 'san-francisco', punctuality: 0.66, attendance: 0.88, managerCode: 'SFO-001' },
  { name: 'Justin Anderson', email: 'justin.anderson@nagarro.com', code: 'SFO-006', department: 'Engineering', role: 'iOS Developer', office: 'san-francisco', punctuality: 0.84, attendance: 0.94, managerCode: 'NYC-001' },
  { name: 'Stephanie White', email: 'stephanie.white@nagarro.com', code: 'SFO-007', department: 'Product', role: 'Business Analyst', office: 'san-francisco', punctuality: 0.76, attendance: 0.91, managerCode: 'SFO-002' },
  { name: 'Brandon Harris', email: 'brandon.harris@nagarro.com', code: 'SFO-008', department: 'Engineering', role: 'Android Developer', office: 'san-francisco', punctuality: 0.52, attendance: 0.85, managerCode: 'NYC-001' },

  // ── Chicago (7) ───────────────────────────────────────────
  { name: 'Brian O\'Connor', email: 'brian.oconnor@nagarro.com', code: 'CHI-001', department: 'Sales', role: 'VP Sales', office: 'chicago', punctuality: 0.89, attendance: 0.96, isManager: true },
  { name: 'Samantha Lee', email: 'samantha.lee@nagarro.com', code: 'CHI-002', department: 'Marketing', role: 'Marketing Director', office: 'chicago', punctuality: 0.83, attendance: 0.94, isManager: true },
  { name: 'Tyler Jackson', email: 'tyler.jackson@nagarro.com', code: 'CHI-003', department: 'Sales', role: 'Account Executive', office: 'chicago', punctuality: 0.64, attendance: 0.88, managerCode: 'CHI-001' },
  { name: 'Megan Clark', email: 'megan.clark@nagarro.com', code: 'CHI-004', department: 'Marketing', role: 'Content Manager', office: 'chicago', punctuality: 0.79, attendance: 0.92, managerCode: 'CHI-002' },
  { name: 'Nathan Lewis', email: 'nathan.lewis@nagarro.com', code: 'CHI-005', department: 'Sales', role: 'Sales Rep', office: 'chicago', punctuality: 0.48, attendance: 0.83, managerCode: 'CHI-001' },
  { name: 'Amanda Walker', email: 'amanda.walker@nagarro.com', code: 'CHI-006', department: 'Marketing', role: 'Social Media Manager', office: 'chicago', punctuality: 0.71, attendance: 0.9, managerCode: 'CHI-002' },
  { name: 'Joshua Hall', email: 'joshua.hall@nagarro.com', code: 'CHI-007', department: 'Sales', role: 'BDR', office: 'chicago', punctuality: 0.56, attendance: 0.86, managerCode: 'CHI-001' },

  // ── Austin (6) ────────────────────────────────────────────
  { name: 'Diana Cruz', email: 'diana.cruz@nagarro.com', code: 'ATX-001', department: 'Operations', role: 'Operations Director', office: 'austin', punctuality: 0.92, attendance: 0.97, isManager: true },
  { name: 'Eric Young', email: 'eric.young@nagarro.com', code: 'ATX-002', department: 'Engineering', role: 'Tech Lead', office: 'austin', punctuality: 0.86, attendance: 0.95, isManager: true },
  { name: 'Heather King', email: 'heather.king@nagarro.com', code: 'ATX-003', department: 'Operations', role: 'Facilities Manager', office: 'austin', punctuality: 0.94, attendance: 0.98, managerCode: 'ATX-001' },
  { name: 'Derek Scott', email: 'derek.scott@nagarro.com', code: 'ATX-004', department: 'Engineering', role: 'Cloud Engineer', office: 'austin', punctuality: 0.77, attendance: 0.91, managerCode: 'ATX-002' },
  { name: 'Christina Green', email: 'christina.green@nagarro.com', code: 'ATX-005', department: 'Operations', role: 'Office Coordinator', office: 'austin', punctuality: 0.88, attendance: 0.95, managerCode: 'ATX-001' },
  { name: 'Patrick Adams', email: 'patrick.adams@nagarro.com', code: 'ATX-006', department: 'Engineering', role: 'Data Engineer', office: 'austin', punctuality: 0.55, attendance: 0.86, managerCode: 'ATX-002' },

  // ── Miami (5) ─────────────────────────────────────────────
  { name: 'Vanessa Torres', email: 'vanessa.torres@nagarro.com', code: 'MIA-001', department: 'Sales', role: 'Regional Sales Manager', office: 'miami', punctuality: 0.85, attendance: 0.94, isManager: true },
  { name: 'Robert Nelson', email: 'robert.nelson@nagarro.com', code: 'MIA-002', department: 'Marketing', role: 'Events Manager', office: 'miami', punctuality: 0.74, attendance: 0.91, managerCode: 'CHI-002' },
  { name: 'Sarah Mitchell', email: 'sarah.mitchell@nagarro.com', code: 'MIA-003', department: 'Sales', role: 'Account Manager', office: 'miami', punctuality: 0.68, attendance: 0.89, managerCode: 'MIA-001' },
  { name: 'David Perez', email: 'david.perez@nagarro.com', code: 'MIA-004', department: 'Human Resources', role: 'People Partner', office: 'miami', punctuality: 0.87, attendance: 0.95, managerCode: 'NYC-002' },
  { name: 'Amy Carter', email: 'amy.carter@nagarro.com', code: 'MIA-005', department: 'Sales', role: 'SDR', office: 'miami', punctuality: 0.42, attendance: 0.82, managerCode: 'MIA-001' },

  // ── Seattle (6) ───────────────────────────────────────────
  { name: 'James Parker', email: 'james.parker@nagarro.com', code: 'SEA-001', department: 'Engineering', role: 'Engineering Manager', office: 'seattle', punctuality: 0.9, attendance: 0.96, isManager: true },
  { name: 'Katherine Evans', email: 'katherine.evans@nagarro.com', code: 'SEA-002', department: 'Design', role: 'Lead Designer', office: 'seattle', punctuality: 0.84, attendance: 0.94, isManager: true },
  { name: 'Michael Reed', email: 'michael.reed@nagarro.com', code: 'SEA-003', department: 'Engineering', role: 'Full Stack Developer', office: 'seattle', punctuality: 0.75, attendance: 0.91, managerCode: 'SEA-001' },
  { name: 'Lisa Campbell', email: 'lisa.campbell@nagarro.com', code: 'SEA-004', department: 'Design', role: 'Motion Designer', office: 'seattle', punctuality: 0.69, attendance: 0.89, managerCode: 'SEA-002' },
  { name: 'Steven Phillips', email: 'steven.phillips@nagarro.com', code: 'SEA-005', department: 'Engineering', role: 'DevOps Engineer', office: 'seattle', punctuality: 0.88, attendance: 0.95, managerCode: 'SEA-001' },
  { name: 'Rebecca Turner', email: 'rebecca.turner@nagarro.com', code: 'SEA-006', department: 'Engineering', role: 'ML Engineer', office: 'seattle', punctuality: 0.61, attendance: 0.87, managerCode: 'SEA-001' },
]

// Admin accounts: 1 superadmin + 1 per office
const ADMIN_ACCOUNTS = [
  { email: 'admin@nagarro.com', password: 'Admin@2024', name: 'Vikas Kumar', role: 'superadmin', office: null },
  { email: 'admin.nyc@nagarro.com', password: 'Admin@NYC2024', name: 'Patricia Hernandez', role: 'admin', office: 'new-york' },
  { email: 'admin.sfo@nagarro.com', password: 'Admin@SFO2024', name: 'Rachel Kim', role: 'admin', office: 'san-francisco' },
  { email: 'admin.chi@nagarro.com', password: 'Admin@CHI2024', name: 'Brian O\'Connor', role: 'admin', office: 'chicago' },
  { email: 'admin.atx@nagarro.com', password: 'Admin@ATX2024', name: 'Diana Cruz', role: 'admin', office: 'austin' },
  { email: 'admin.mia@nagarro.com', password: 'Admin@MIA2024', name: 'Vanessa Torres', role: 'admin', office: 'miami' },
  { email: 'admin.sea@nagarro.com', password: 'Admin@SEA2024', name: 'James Parker', role: 'admin', office: 'seattle' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Generate a synthetic 128-float face descriptor */
function syntheticDescriptor(): number[] {
  const arr: number[] = []
  for (let i = 0; i < 128; i++) {
    arr.push(parseFloat((Math.random() * 0.4 - 0.2).toFixed(6)))
  }
  return arr
}

/** Build UTC ISO string from a local time in a given IANA tz */
function localToUtc(dateStr: string, hours: number, minutes: number, tz: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const localStr = `${dateStr}T${pad(hours)}:${pad(minutes)}:00`
  const d = new Date(localStr + 'Z')
  const inTz = new Date(d.toLocaleString('en-US', { timeZone: tz }))
  const offset = d.getTime() - inTz.getTime()
  return new Date(d.getTime() + offset).toISOString()
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

function dateRange(start: Date, end: Date): string[] {
  const dates: string[] = []
  const d = new Date(start)
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
  55: 'Dense drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
}

async function geocode(name: string): Promise<{ latitude: number; longitude: number } | null> {
  const searchName = name.replace(/\b(hq|office|headquarters|branch)\b/gi, '').trim()
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&language=en&format=json`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.results?.length) return null
    return { latitude: data.results[0].latitude, longitude: data.results[0].longitude }
  } catch { return null }
}

async function fetchAndSaveWeather(officeId: string, officeName: string, startDate: string, endDate: string): Promise<number> {
  const geo = await geocode(officeName)
  if (!geo) { console.log(`    Could not geocode "${officeName}"`); return 0 }

  const daysDiff = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
  const baseUrl = daysDiff > 90
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'

  const params = new URLSearchParams({
    latitude: String(geo.latitude), longitude: String(geo.longitude),
    start_date: startDate, end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
    timezone: 'auto',
  })

  try {
    const res = await fetch(`${baseUrl}?${params}`)
    if (!res.ok) return 0
    const data = await res.json()
    const d = data.daily
    if (!d?.time?.length) return 0

    const rows = d.time.map((date: string, i: number) => ({
      office_id: officeId,
      date,
      temperature_max: d.temperature_2m_max[i],
      temperature_min: d.temperature_2m_min[i],
      precipitation: d.precipitation_sum[i] ?? 0,
      weather_code: d.weather_code[i] ?? 0,
      description: WMO[d.weather_code[i]] || 'Unknown',
    }))

    const { error } = await supabase.from('daily_weather').upsert(rows, { onConflict: 'office_id,date' })
    if (error) { console.log(`    Weather upsert error: ${error.message}`); return 0 }
    return rows.length
  } catch { return 0 }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log('\n========================================')
  console.log('  FaceAttend Demo Seed (US, 6 venues)')
  console.log('========================================\n')

  // 0. Offices
  const { data: offices, error: offErr } = await supabase.from('offices').select('id, name, slug, timezone, late_threshold')
  if (offErr || !offices?.length) { console.error('No offices found — run the migration first.'); process.exit(1) }
  const officeMap = new Map(offices.map((o) => [o.slug, o]))
  console.log(`Offices: ${offices.map((o) => o.name).join(', ')}\n`)

  // 1. Departments
  console.log('1. Departments')
  await supabase.from('departments').upsert(DEPARTMENTS.map((d) => ({ name: d.name, head: d.head })), { onConflict: 'name' })
  console.log(`   ${DEPARTMENTS.length} departments\n`)

  // 2. Employees (with synthetic face descriptors)
  console.log('2. Employees')
  const empRows = EMPLOYEES.map((e) => ({
    name: e.name,
    email: e.email,
    employee_code: e.code,
    department: e.department,
    role: e.role,
    office_id: officeMap.get(e.office)?.id,
    is_active: true,
    face_descriptor: syntheticDescriptor(),
  }))

  const { error: empErr } = await supabase.from('employees').upsert(empRows, { onConflict: 'employee_code' })
  if (empErr) console.error('   Error:', empErr.message)

  const { data: allEmps } = await supabase.from('employees').select('id, name, employee_code, office_id')
  if (!allEmps?.length) { console.error('   No employees!'); process.exit(1) }
  const empByCode = new Map(allEmps.map((e) => [e.employee_code, e]))
  console.log(`   ${allEmps.length} employees with face descriptors\n`)

  // 3. Manager hierarchy
  console.log('3. Manager hierarchy')
  let managerLinks = 0
  for (const def of EMPLOYEES) {
    if (def.managerCode) {
      const emp = empByCode.get(def.code)
      const mgr = empByCode.get(def.managerCode)
      if (emp && mgr) {
        await supabase.from('employees').update({ manager_id: mgr.id }).eq('id', emp.id)
        managerLinks++
      }
    }
  }
  console.log(`   ${managerLinks} reporting relationships\n`)

  // 4. Admin accounts
  console.log('4. Admin accounts')
  for (const admin of ADMIN_ACCOUNTS) {
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    })

    let userId: string | null = null
    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        userId = users?.find((u) => u.email === admin.email)?.id || null
      } else {
        console.error(`   Auth error for ${admin.email}:`, authErr.message)
        continue
      }
    } else {
      userId = authData.user?.id || null
    }

    if (userId) {
      const officeId = admin.office ? officeMap.get(admin.office)?.id || null : null
      await supabase.from('admins').upsert({
        user_id: userId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        office_id: officeId,
      }, { onConflict: 'user_id' })
      const scope = admin.office ? `(${admin.office})` : '(superadmin - all offices)'
      console.log(`   ${admin.email} / ${admin.password} ${scope}`)
    }
  }
  console.log('')

  // 5. Attendance logs — 90 days
  console.log('5. Attendance logs (90 days)')
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 89)
  const dates = dateRange(startDate, endDate)

  // Clear old logs for idempotency
  await supabase.from('attendance_logs').delete().gte('date', dates[0])

  const logs: any[] = []
  let absentCount = 0

  for (const dateStr of dates) {
    if (isWeekend(dateStr)) continue

    for (const def of EMPLOYEES) {
      const emp = empByCode.get(def.code)
      const office = officeMap.get(def.office)
      if (!emp || !office) continue

      if (Math.random() > def.attendance) { absentCount++; continue }

      const isOnTime = Math.random() < def.punctuality
      const thParts = office.late_threshold.split(':').map(Number)
      const threshMins = thParts[0] * 60 + thParts[1]

      const checkInMins = isOnTime
        ? threshMins - randInt(5, 30)
        : threshMins + randInt(1, 45)

      const workMins = randInt(450, 570) // 7.5–9.5 hrs
      const checkOutMins = checkInMins + workMins

      const checkIn = localToUtc(dateStr, Math.floor(checkInMins / 60), checkInMins % 60, office.timezone)
      const checkOut = localToUtc(dateStr, Math.floor(checkOutMins / 60), checkOutMins % 60, office.timezone)

      const isFace = Math.random() < 0.85
      logs.push({
        employee_id: emp.id,
        office_id: office.id,
        date: dateStr,
        status: isOnTime ? 'present' : 'late',
        check_in: checkIn,
        check_out: checkOut,
        method: isFace ? 'face' : 'manual',
        confidence_score: isFace ? parseFloat((0.82 + Math.random() * 0.17).toFixed(4)) : null,
      })
    }
  }

  // Batch insert
  const BATCH = 200
  for (let i = 0; i < logs.length; i += BATCH) {
    const batch = logs.slice(i, i + BATCH)
    const { error } = await supabase.from('attendance_logs').insert(batch)
    if (error) console.error(`   Batch ${i} error:`, error.message)
  }
  console.log(`   ${logs.length} records, ${absentCount} absences\n`)

  // 6. Leave records
  console.log('6. Leave records')
  const { data: leaveTypes } = await supabase.from('leave_types').select('id, name')
  const ltMap = new Map(leaveTypes?.map((lt) => [lt.name, lt.id]) || [])

  const leaveRecords: any[] = []
  const allEmpsList = Array.from(empByCode.values())

  // Generate ~60 leave records spread across 90 days
  for (let i = 0; i < 60; i++) {
    const emp = EMPLOYEES[randInt(0, EMPLOYEES.length - 1)]
    const empRow = empByCode.get(emp.code)
    if (!empRow) continue

    const daysAgo = randInt(2, 85)
    const start = new Date()
    start.setDate(start.getDate() - daysAgo)
    const startStr = start.toISOString().split('T')[0]

    // Duration: 1–5 days
    const duration = Math.random() < 0.6 ? 1 : randInt(2, 5)
    const end = new Date(start)
    end.setDate(end.getDate() + duration - 1)
    const endStr = end.toISOString().split('T')[0]

    // Pick leave type weighted: 40% vacation, 25% sick, 25% WFH, 10% personal
    const r = Math.random()
    const typeName = r < 0.4 ? 'Vacation' : r < 0.65 ? 'Sick Leave' : r < 0.9 ? 'Work From Home' : 'Personal Leave'
    const typeId = ltMap.get(typeName)
    if (!typeId) continue

    // Find a manager to approve
    const managerDef = EMPLOYEES.find((e) => e.code === emp.managerCode)
    const managerRow = managerDef ? empByCode.get(managerDef.code) : null

    const status = Math.random() < 0.85 ? 'approved' : Math.random() < 0.5 ? 'pending' : 'rejected'

    leaveRecords.push({
      employee_id: empRow.id,
      leave_type_id: typeId,
      start_date: startStr,
      end_date: endStr,
      status,
      approved_by: status === 'approved' && managerRow ? managerRow.id : null,
      reason: typeName === 'Vacation' ? 'Family trip'
        : typeName === 'Sick Leave' ? 'Not feeling well'
        : typeName === 'Work From Home' ? 'Remote day'
        : 'Personal matters',
    })
  }

  const { error: leaveErr } = await supabase.from('leaves').insert(leaveRecords)
  if (leaveErr) console.error('   Error:', leaveErr.message)
  else console.log(`   ${leaveRecords.length} leave records\n`)

  // 7. Audit log entries
  console.log('7. Audit log entries')
  const superAdminAccount = ADMIN_ACCOUNTS[0]
  const { data: { users: allUsers } } = await supabase.auth.admin.listUsers()
  const superUser = allUsers?.find((u) => u.email === superAdminAccount.email)
  if (superUser) {
    const emp1 = allEmpsList[randInt(0, allEmpsList.length - 1)]
    const emp2 = allEmpsList[randInt(0, allEmpsList.length - 1)]
    await supabase.from('deletion_log').insert([
      {
        employee_id: emp1.id,
        employee_name: emp1.name,
        deleted_by: superUser.id,
        deleted_by_email: superUser.email,
        reason: 'Employee requested biometric data deletion — compliance with company privacy policy.',
      },
      {
        employee_id: emp2.id,
        employee_name: emp2.name,
        deleted_by: superUser.id,
        deleted_by_email: superUser.email,
        reason: 'Employee offboarded — biometric data purged per retention policy.',
      },
    ])
    console.log('   2 audit entries\n')
  } else {
    console.log('   Skipped (no superadmin user)\n')
  }

  // 8. Weather backfill
  console.log('8. Weather backfill (90 days x 6 offices)')
  const weatherStart = dates[0]
  const weatherEnd = dates[dates.length - 1]

  for (const office of offices) {
    process.stdout.write(`   ${office.name}: `)
    // Split at ~88 days ago for API boundary
    const mid = new Date()
    mid.setDate(mid.getDate() - 88)
    const midStr = mid.toISOString().split('T')[0]

    let total = 0
    if (weatherStart < midStr) {
      total += await fetchAndSaveWeather(office.id, office.name, weatherStart, midStr)
    }
    const recentStart = weatherStart >= midStr ? weatherStart : midStr
    total += await fetchAndSaveWeather(office.id, office.name, recentStart, weatherEnd)
    console.log(`${total} days`)
  }

  // Summary
  console.log('\n========================================')
  console.log('  Seed Complete!')
  console.log('========================================')
  console.log(`  ${DEPARTMENTS.length} departments`)
  console.log(`  ${allEmps.length} employees (all with face descriptors)`)
  console.log(`  ${managerLinks} manager relationships`)
  console.log(`  ${ADMIN_ACCOUNTS.length} admin accounts`)
  console.log(`  ${logs.length} attendance records`)
  console.log(`  ${leaveRecords.length} leave records`)
  console.log(`  Weather cached for all offices`)
  console.log('')
  console.log('  Superadmin login:')
  console.log(`    ${ADMIN_ACCOUNTS[0].email} / ${ADMIN_ACCOUNTS[0].password}`)
  console.log('')
}

seed().catch((err) => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})
