'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Department } from '@/lib/types'

export async function getDepartments(): Promise<Department[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('departments').select('*').order('name')
  if (error) throw error
  return data as Department[]
}

export async function createDepartment(name: string, head: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('departments').insert({ name, head })
  if (error) throw error
}

export async function updateDepartment(id: string, name: string, head: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('departments').update({ name, head }).eq('id', id)
  if (error) throw error
}

export async function deleteDepartment(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

export async function getDepartmentAttendanceSummary() {
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: departments } = await supabase.from('departments').select('name')
  const { data: employees } = await supabase.from('employees').select('department').eq('is_active', true)
  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*, employee:employees(department)')
    .eq('date', today)

  return (departments || []).map((dept) => {
    const totalEmployees = employees?.filter((e) => e.department === dept.name).length || 0
    const deptLogs = (logs || []).filter((l: any) => l.employee?.department === dept.name)
    const present = deptLogs.filter((l: any) => l.status === 'present').length
    const late = deptLogs.filter((l: any) => l.status === 'late').length
    return { name: dept.name, totalEmployees, present, late, absent: totalEmployees - deptLogs.length }
  })
}
