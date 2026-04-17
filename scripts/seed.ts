/**
 * Seed script for FaceAttend demo data
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
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

const departments = [
  { name: 'Engineering', head: 'Alice Chen' },
  { name: 'Marketing', head: 'Bob Rivera' },
  { name: 'Operations', head: 'Carol Nguyen' },
]

const employees = [
  { name: 'Alice Chen', email: 'alice@demo.com', employee_code: 'ENG-001', department: 'Engineering', role: 'Lead Engineer' },
  { name: 'David Park', email: 'david@demo.com', employee_code: 'ENG-002', department: 'Engineering', role: 'Frontend Developer' },
  { name: 'Emily Zhang', email: 'emily@demo.com', employee_code: 'ENG-003', department: 'Engineering', role: 'Backend Developer' },
  { name: 'Frank Miller', email: 'frank@demo.com', employee_code: 'ENG-004', department: 'Engineering', role: 'DevOps Engineer' },
  { name: 'Bob Rivera', email: 'bob@demo.com', employee_code: 'MKT-001', department: 'Marketing', role: 'Marketing Director' },
  { name: 'Grace Lee', email: 'grace@demo.com', employee_code: 'MKT-002', department: 'Marketing', role: 'Content Strategist' },
  { name: 'Henry Wilson', email: 'henry@demo.com', employee_code: 'MKT-003', department: 'Marketing', role: 'Designer' },
  { name: 'Carol Nguyen', email: 'carol@demo.com', employee_code: 'OPS-001', department: 'Operations', role: 'Operations Manager' },
  { name: 'Ivy Thompson', email: 'ivy@demo.com', employee_code: 'OPS-002', department: 'Operations', role: 'HR Specialist' },
  { name: 'Jack Brown', email: 'jack@demo.com', employee_code: 'OPS-003', department: 'Operations', role: 'Office Coordinator' },
]

function randomTime(baseHour: number, baseMin: number, variance: number): string {
  const totalMinutes = baseHour * 60 + baseMin + Math.floor(Math.random() * variance * 2) - variance
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

async function seed() {
  console.log('🌱 Seeding FaceAttend demo data...\n')

  // 1. Create departments
  console.log('Creating departments...')
  const { error: deptError } = await supabase.from('departments').upsert(
    departments.map((d) => ({ name: d.name, head: d.head })),
    { onConflict: 'name' }
  )
  if (deptError) console.error('  Departments error:', deptError.message)
  else console.log(`  ✓ ${departments.length} departments`)

  // 2. Create employees
  console.log('Creating employees...')
  const { data: insertedEmployees, error: empError } = await supabase
    .from('employees')
    .upsert(
      employees.map((e) => ({ ...e, is_active: true })),
      { onConflict: 'employee_code' }
    )
    .select()
  if (empError) console.error('  Employees error:', empError.message)

  // Fetch all employees to get IDs
  const { data: allEmployees } = await supabase.from('employees').select('id, name, employee_code')
  if (!allEmployees || allEmployees.length === 0) {
    console.error('No employees found after insert. Aborting.')
    process.exit(1)
  }
  console.log(`  ✓ ${allEmployees.length} employees`)

  // 3. Create 30 days of attendance logs
  console.log('Creating attendance logs (30 days)...')
  const today = new Date()
  const logs: any[] = []

  for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)

    // Skip weekends
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue

    const dateStr = date.toISOString().split('T')[0]

    for (const emp of allEmployees) {
      // 85% chance of showing up
      if (Math.random() > 0.85) continue

      const isLate = Math.random() < 0.15
      const checkInTime = isLate
        ? randomTime(9, 45, 30) // late: 9:15 - 10:15
        : randomTime(8, 50, 20) // on time: 8:30 - 9:10

      const checkOutTime = randomTime(17, 30, 30) // 17:00 - 18:00

      logs.push({
        employee_id: emp.id,
        date: dateStr,
        status: isLate ? 'late' : 'present',
        check_in: `${dateStr}T${checkInTime}`,
        check_out: `${dateStr}T${checkOutTime}`,
        method: Math.random() < 0.8 ? 'face' : 'manual',
        confidence_score: Math.random() < 0.8 ? 0.85 + Math.random() * 0.14 : null,
      })
    }
  }

  // Insert in batches of 100
  for (let i = 0; i < logs.length; i += 100) {
    const batch = logs.slice(i, i + 100)
    const { error: logError } = await supabase.from('attendance_logs').insert(batch)
    if (logError) {
      console.error(`  Batch ${i}-${i + batch.length} error:`, logError.message)
    }
  }
  console.log(`  ✓ ${logs.length} attendance logs`)

  // 4. Create default admin user
  console.log('Creating admin user...')
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@demo.com',
    password: 'Demo@1234',
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('  ℹ Admin user already exists')
      // Get existing user
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existing = users?.find((u) => u.email === 'admin@demo.com')
      if (existing) {
        await supabase.from('admins').upsert({ user_id: existing.id, name: 'Demo Admin', email: 'admin@demo.com', role: 'superadmin' }, { onConflict: 'user_id' })
      }
    } else {
      console.error('  Auth error:', authError.message)
    }
  } else if (authUser.user) {
    await supabase.from('admins').upsert({ user_id: authUser.user.id, name: 'Demo Admin', email: 'admin@demo.com', role: 'superadmin' }, { onConflict: 'user_id' })
    console.log('  ✓ Admin: admin@demo.com / Demo@1234')
  }

  // 5. Set default config
  console.log('Setting default config...')
  await supabase.from('config').upsert([
    { key: 'late_threshold', value: '09:30' },
  ], { onConflict: 'key' })
  console.log('  ✓ Late threshold: 09:30')

  console.log('\n✅ Seed complete! You can now log in at /admin/login with admin@demo.com / Demo@1234')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
