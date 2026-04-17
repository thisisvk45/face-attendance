'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getDepartmentAttendanceSummary } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import type { Department } from '@/lib/types'
import { toast } from 'sonner'

export default function DepartmentsPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [name, setName] = useState('')
  const [head, setHead] = useState('')

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => getDepartments() })
  const { data: summary = [] } = useQuery({ queryKey: ['dept-summary'], queryFn: () => getDepartmentAttendanceSummary() })

  const createMut = useMutation({
    mutationFn: () => createDepartment(name, head),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); setShowAdd(false); setName(''); setHead(''); toast.success('Department created') },
  })
  const updateMut = useMutation({
    mutationFn: () => updateDepartment(editing!.id, name, head),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); setEditing(null); toast.success('Department updated') },
  })
  const deleteMut = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department deleted') },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description={`${departments.length} departments`}
        action={
          <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (o) { setName(''); setHead('') } }}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-dark text-white">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-sm font-medium text-[#1E293B]">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="border-[#E2E8F0]" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium text-[#1E293B]">Head</Label><Input value={head} onChange={(e) => setHead(e.target.value)} className="border-[#E2E8F0]" /></div>
                <Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending} className="w-full bg-brand hover:bg-brand-dark text-white">{createMut.isPending ? 'Creating...' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {departments.length === 0 ? (
          <EmptyState title="No departments" description="Add a department to organize your employees" action={{ label: 'Add Department', onClick: () => setShowAdd(true) }} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Name</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Head</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept, i) => (
                <TableRow key={dept.id} className={`hover:bg-gray-50/80 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <TableCell className="font-medium text-[#1E293B]">{dept.name}</TableCell>
                  <TableCell className="text-[#64748B]">{dept.head || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Dialog open={editing?.id === dept.id} onOpenChange={(o) => { if (o) { setEditing(dept); setName(dept.name); setHead(dept.head || '') } else setEditing(null) }}>
                        <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0]">Edit</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2"><Label className="text-sm font-medium text-[#1E293B]">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="border-[#E2E8F0]" /></div>
                            <div className="space-y-2"><Label className="text-sm font-medium text-[#1E293B]">Head</Label><Input value={head} onChange={(e) => setHead(e.target.value)} className="border-[#E2E8F0]" /></div>
                            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending} className="w-full bg-brand hover:bg-brand-dark text-white">Update</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0] text-red-600 hover:bg-red-50" onClick={() => { if (confirm('Delete this department?')) deleteMut.mutate(dept.id) }}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Attendance Summary */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-base font-semibold text-[#1E293B]">Today&apos;s Attendance by Department</h3>
        </div>
        {summary.length > 0 ? (
          <div className="p-0 mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Department</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Total</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Present</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Late</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s: any, i: number) => (
                  <TableRow key={s.name} className={i % 2 === 1 ? 'bg-gray-50/30' : ''}>
                    <TableCell className="font-medium text-[#1E293B]">{s.name}</TableCell>
                    <TableCell className="text-[#64748B]">{s.totalEmployees}</TableCell>
                    <TableCell className="text-status-present font-medium">{s.present}</TableCell>
                    <TableCell className="text-status-late font-medium">{s.late}</TableCell>
                    <TableCell className="text-status-absent font-medium">{s.absent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center text-[#94A3B8]">No department data</div>
        )}
      </div>
    </div>
  )
}
