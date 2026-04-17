'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function getConfig() {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('config').select('*')
  const config: Record<string, string> = {}
  data?.forEach((c) => {
    config[c.key] = c.value
  })
  return config
}

export async function updateConfig(key: string, value: string) {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('config').upsert({ key, value })
  if (error) throw error
}

export async function getAdmins() {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('admins').select('*').order('name')
  if (error) throw error
  return data || []
}
