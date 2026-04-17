'use server'

import { createServiceRoleClient, serialize } from '@/lib/supabase/server'

export interface DeletionLogRow {
  id: string
  employee_id: string | null
  employee_name: string
  deleted_by: string | null
  deleted_by_email: string
  reason: string | null
  created_at: string
}

export async function getDeletionLogs(): Promise<DeletionLogRow[]> {
  const serviceClient = await createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('deletion_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return serialize((data || []) as DeletionLogRow[])
}
