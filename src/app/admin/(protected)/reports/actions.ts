'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getMonthlyReport(month: string) {
  const supabase = await createServerSupabaseClient()
  const startDate = `${month}-01`
  const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1) - 1)
    .toISOString()
    .split('T')[0]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, department, employee_code')
    .eq('is_active', true)
    .order('name')
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('employee_id, status, date')
    .gte('date', startDate)
    .lte('date', endDate)

  // Calculate working days (weekdays)
  const start = new Date(startDate)
  const end = new Date(endDate)
  let workingDays = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++
  }

  return (employees || []).map((emp) => {
    const empLogs = (logs || []).filter((l) => l.employee_id === emp.id)
    const presentDays = empLogs.filter((l) => l.status === 'present').length
    const lateDays = empLogs.filter((l) => l.status === 'late').length
    const absentDays = Math.max(0, workingDays - presentDays - lateDays)
    const percentage = workingDays > 0 ? ((presentDays + lateDays) / workingDays) * 100 : 0

    return { ...emp, presentDays, lateDays, absentDays, workingDays, percentage: percentage.toFixed(1) }
  })
}

export async function getDepartmentReport(month: string) {
  const supabase = await createServerSupabaseClient()
  const startDate = `${month}-01`
  const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1) - 1)
    .toISOString()
    .split('T')[0]

  const { data: departments } = await supabase.from('departments').select('name')
  const { data: employees } = await supabase.from('employees').select('id, department').eq('is_active', true)
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('employee_id, status')
    .gte('date', startDate)
    .lte('date', endDate)

  return (departments || []).map((dept) => {
    const deptEmps = (employees || []).filter((e) => e.department === dept.name)
    const deptEmpIds = new Set(deptEmps.map((e) => e.id))
    const deptLogs = (logs || []).filter((l) => deptEmpIds.has(l.employee_id))

    return {
      department: dept.name,
      totalEmployees: deptEmps.length,
      totalPresent: deptLogs.filter((l) => l.status === 'present').length,
      totalLate: deptLogs.filter((l) => l.status === 'late').length,
      totalRecords: deptLogs.length,
    }
  })
}
