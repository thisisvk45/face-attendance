'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConfig, updateConfig, getAdmins } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'sonner'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [lateThreshold, setLateThreshold] = useState('')
  const [copied, setCopied] = useState(false)

  const { data: config = {} } = useQuery({ queryKey: ['config'], queryFn: () => getConfig() })
  const { data: admins = [] } = useQuery({ queryKey: ['admins'], queryFn: () => getAdmins() })

  useEffect(() => {
    if (config.late_threshold && !lateThreshold) {
      setLateThreshold(config.late_threshold)
    }
  }, [config, lateThreshold])

  const configMutation = useMutation({
    mutationFn: () => updateConfig('late_threshold', lateThreshold),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config'] }); toast.success('Late threshold saved') },
    onError: () => toast.error('Failed to save'),
  })

  const kioskUrl = typeof window !== 'undefined' ? `${window.location.origin}/kiosk` : '/kiosk'

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration" />

      {/* Attendance Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-[#1E293B]">Attendance Settings</h3>
          <p className="text-sm text-[#64748B] mt-1">Configure when an employee is marked as &quot;late&quot;</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E293B]">Late Threshold Time</Label>
            <Input
              type="time"
              value={lateThreshold || '09:30'}
              onChange={(e) => setLateThreshold(e.target.value)}
              className="w-48 h-10 border-[#E2E8F0]"
            />
          </div>
          <Button onClick={() => configMutation.mutate()} disabled={configMutation.isPending} className="bg-brand hover:bg-brand-dark text-white h-10">
            {configMutation.isPending ? 'Saving...' : 'Save Threshold'}
          </Button>
        </div>
      </div>

      {/* Kiosk URL */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-[#1E293B]">Kiosk URL</h3>
          <p className="text-sm text-[#64748B] mt-1">Share this URL with employees or display on a kiosk tablet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.054a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" /></svg>
            </div>
            <Input value={kioskUrl} readOnly className="font-mono text-sm pl-10 h-10 border-[#E2E8F0] bg-gray-50/50" />
          </div>
          <Button
            variant="outline"
            className="border-[#E2E8F0] h-10"
            onClick={() => {
              navigator.clipboard.writeText(kioskUrl)
              setCopied(true)
              toast.success('URL copied to clipboard')
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? (
              <><svg className="w-4 h-4 mr-2 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Copied!</>
            ) : (
              <><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>Copy URL</>
            )}
          </Button>
        </div>
      </div>

      {/* Admin Accounts */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-base font-semibold text-[#1E293B]">Admin Accounts</h3>
          <p className="text-sm text-[#64748B] mt-1">To add a new admin: create user in Supabase Auth, then INSERT into admins table</p>
        </div>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Name</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Email</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-[#94A3B8]">
                    No admins found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin: any, i: number) => (
                  <TableRow key={admin.id} className={`hover:bg-gray-50/80 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                    <TableCell className="font-medium text-[#1E293B]">{admin.name}</TableCell>
                    <TableCell className="text-[#64748B]">{admin.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${admin.role === 'superadmin' ? 'bg-brand/10 text-brand-dark' : 'bg-gray-100 text-[#64748B]'}`}>
                        {admin.role}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
