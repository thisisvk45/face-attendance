'use server'

import { createServerSupabaseClient, createServiceRoleClient, serialize } from '@/lib/supabase/server'
// createServerSupabaseClient is only used for auth.getUser() in deleteEmployeeBiometric
import type { Employee, Office } from '@/lib/types'

export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('employees').select('*').order('name')
  if (error) {
    console.error('[employees] getEmployees error:', error)
    throw new Error(error.message)
  }
  return serialize((data || []) as Employee[])
}

export async function getOfficesList(): Promise<Office[]> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('offices').select('*').order('name')
  if (error) throw error
  return serialize((data || []) as Office[])
}

export async function createEmployee(formData: {
  name: string
  email: string
  department: string
  role: string
  employee_code: string
  office_id: string
  face_descriptor: number[] | null
  face_image_base64: string | null
}): Promise<Employee> {
  const supabase = await createServiceRoleClient()

  if (!formData.office_id) {
    throw new Error('Office is required.')
  }

  let faceImageUrl: string | null = null

  if (formData.face_image_base64) {
    const base64Data = formData.face_image_base64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `${formData.employee_code}_${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('face-images')
      .upload(fileName, buffer, { contentType: 'image/jpeg' })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('face-images').getPublicUrl(fileName)
      faceImageUrl = urlData.publicUrl
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: formData.name,
      email: formData.email,
      department: formData.department,
      role: formData.role,
      employee_code: formData.employee_code,
      office_id: formData.office_id,
      face_descriptor: formData.face_descriptor,
      face_image_url: faceImageUrl,
    })
    .select()
    .single()

  if (error) throw error
  return serialize(data as Employee)
}

export async function updateEmployee(
  id: string,
  formData: {
    name: string
    email: string
    department: string
    role: string
    employee_code: string
    office_id: string
    face_descriptor?: number[] | null
    face_image_base64?: string | null
  }
): Promise<Employee> {
  const supabase = await createServiceRoleClient()

  const updateData: Record<string, unknown> = {
    name: formData.name,
    email: formData.email,
    department: formData.department,
    role: formData.role,
    employee_code: formData.employee_code,
    office_id: formData.office_id,
  }

  if (formData.face_descriptor) {
    updateData.face_descriptor = formData.face_descriptor
  }

  if (formData.face_image_base64) {
    const base64Data = formData.face_image_base64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `${formData.employee_code}_${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('face-images')
      .upload(fileName, buffer, { contentType: 'image/jpeg' })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('face-images').getPublicUrl(fileName)
      updateData.face_image_url = urlData.publicUrl
    }
  }

  const { data, error } = await supabase.from('employees').update(updateData).eq('id', id).select().single()
  if (error) throw error
  return serialize(data as Employee)
}

export async function toggleEmployeeActive(id: string, isActive: boolean) {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('employees').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

export async function getEmployeeAttendance(employeeId: string) {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .limit(50)
  if (error) throw error
  return serialize(data)
}

export async function getDepartmentsList(): Promise<string[]> {
  const supabase = await createServiceRoleClient()
  // Try the departments table first, fall back to deriving from employees
  const { data } = await supabase.from('departments').select('name').order('name')
  if (data && data.length > 0) return data.map((d) => d.name)
  // Fallback: get unique departments from employees
  const { data: emps } = await supabase.from('employees').select('department')
  const deptSet = new Set<string>()
  ;(emps || []).forEach((e) => { if (e.department) deptSet.add(e.department) })
  const depts = Array.from(deptSet)
  return depts.sort()
}

/**
 * Permanently delete biometric data for an employee (right-to-delete).
 * Wipes face_descriptor, removes face_image_url, deletes the storage object,
 * stamps biometrics_deleted_at, and writes an audit row to deletion_log.
 * The employee row itself (name, code, attendance history) is preserved.
 */
export async function deleteEmployeeBiometric(
  employeeId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const serviceClient = await createServiceRoleClient()

  // Identify the calling admin (must be authenticated)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Not authenticated.' }
  }

  // Look up the employee
  const { data: employee, error: fetchError } = await serviceClient
    .from('employees')
    .select('id, name, face_image_url')
    .eq('id', employeeId)
    .single()

  if (fetchError || !employee) {
    return { ok: false, error: 'Employee not found.' }
  }

  // Best-effort: remove the storage object if we have a URL we recognise
  if (employee.face_image_url) {
    try {
      const url = new URL(employee.face_image_url)
      // public URL shape: /storage/v1/object/public/face-images/<filename>
      const marker = '/face-images/'
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        const fileName = url.pathname.substring(idx + marker.length)
        if (fileName) {
          const { error: storageError } = await serviceClient.storage
            .from('face-images')
            .remove([fileName])
          if (storageError) {
            console.error('[admin] face image storage delete failed:', storageError)
          }
        }
      }
    } catch (e) {
      console.error('[admin] could not parse face_image_url for deletion:', e)
    }
  }

  // Wipe biometric fields, deactivate face login, stamp deletion time
  const { error: updateError } = await serviceClient
    .from('employees')
    .update({
      face_descriptor: null,
      face_image_url: null,
      biometrics_deleted_at: new Date().toISOString(),
    })
    .eq('id', employeeId)

  if (updateError) {
    console.error('[admin] biometric wipe failed:', updateError)
    return { ok: false, error: updateError.message }
  }

  // Audit log
  const { error: logError } = await serviceClient.from('deletion_log').insert({
    employee_id: employeeId,
    employee_name: employee.name,
    deleted_by: user.id,
    deleted_by_email: user.email ?? 'unknown',
    reason: reason?.trim() || null,
  })

  if (logError) {
    // Non-fatal — biometric data is already gone — but surface it.
    console.error('[admin] deletion_log insert failed:', logError)
  }

  return { ok: true }
}
