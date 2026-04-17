'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  getDepartmentsList,
  getEmployeeAttendance,
  deleteEmployeeBiometric,
  getOfficesList,
} from './actions'
import type { Office } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FaceCapture } from '@/components/face-capture'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton-table'
import type { Employee } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState<string>('all')
  const [filterOffice, setFilterOffice] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [viewingHistory, setViewingHistory] = useState<string | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>()
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(setTimeout(() => setDebouncedSearch(val), 300))
  }

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: getDepartmentsList,
  })

  const { data: offices = [] } = useQuery<Office[]>({
    queryKey: ['offices-list'],
    queryFn: getOfficesList,
  })

  const officesById = useMemo(() => new Map(offices.map((o) => [o.id, o])), [offices])

  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['employee-attendance', viewingHistory],
    queryFn: () => getEmployeeAttendance(viewingHistory!),
    enabled: !!viewingHistory,
  })

  const filtered = useMemo(() => employees.filter((e) => {
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase()
      if (!e.name.toLowerCase().includes(s) && !e.email.toLowerCase().includes(s) && !e.employee_code.toLowerCase().includes(s)) return false
    }
    if (filterDept !== 'all' && e.department !== filterDept) return false
    if (filterOffice !== 'all' && e.office_id !== filterOffice) return false
    if (filterActive === 'active' && !e.is_active) return false
    if (filterActive === 'inactive' && e.is_active) return false
    return true
  }), [employees, debouncedSearch, filterDept, filterOffice, filterActive])

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleEmployeeActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee status updated')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={`${employees.length} total employees`}
        action={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-brand hover:bg-brand-dark text-white">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <EmployeeForm
                departments={departments}
                offices={offices}
                onSubmit={async (data) => {
                  await createEmployee(data)
                  queryClient.invalidateQueries({ queryKey: ['employees'] })
                  setShowAddDialog(false)
                  toast.success('Employee added successfully')
                }}
                onCancel={() => setShowAddDialog(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <Input
            placeholder="Search by name, email, or code..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-10 border-[#E2E8F0]"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-48 h-10 border-[#E2E8F0]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOffice} onValueChange={setFilterOffice}>
          <SelectTrigger className="w-48 h-10 border-[#E2E8F0]"><SelectValue placeholder="Office" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Offices</SelectItem>
            {offices.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-36 h-10 border-[#E2E8F0]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={9} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No employees found"
            description={search ? 'Try adjusting your search or filters' : 'Add your first employee to get started'}
            action={!search ? { label: 'Add Employee', onClick: () => setShowAddDialog(true) } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Name</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Email</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Code</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Office</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Department</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Role</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Face</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp, i) => (
                <TableRow key={emp.id} className={`hover:bg-gray-50/80 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center ring-2 ring-brand/20 text-brand font-semibold text-xs">
                        {emp.name[0]}
                      </div>
                      <span className="font-medium text-[#1E293B]">{emp.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[#64748B]">{emp.email}</TableCell>
                  <TableCell className="font-mono text-sm text-[#64748B]">{emp.employee_code}</TableCell>
                  <TableCell className="text-[#64748B]">
                    {emp.office_id && officesById.get(emp.office_id) ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                        {officesById.get(emp.office_id)!.name}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[#64748B]">{emp.department}</TableCell>
                  <TableCell className="text-[#64748B]">{emp.role}</TableCell>
                  <TableCell><StatusBadge status={emp.face_descriptor ? 'registered' : 'not-set'} /></TableCell>
                  <TableCell><StatusBadge status={emp.is_active ? 'active' : 'inactive'} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0]">Edit</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
                          <EmployeeForm
                            employee={emp}
                            departments={departments}
                            offices={offices}
                            onSubmit={async (data) => {
                              await updateEmployee(emp.id, data)
                              queryClient.invalidateQueries({ queryKey: ['employees'] })
                              toast.success('Employee updated')
                            }}
                            onCancel={() => {}}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-[#E2E8F0]"
                        onClick={() => toggleMutation.mutate({ id: emp.id, isActive: !emp.is_active })}
                      >
                        {emp.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0]" onClick={() => setViewingHistory(emp.id)}>
                            History
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>{emp.name} - Attendance History</DialogTitle></DialogHeader>
                          <div className="space-y-2">
                            {attendanceHistory.length > 0 ? attendanceHistory.map((log: any) => (
                              <div key={log.id} className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                                <span className="text-sm">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                                <StatusBadge status={log.status} />
                                <span className="text-sm text-[#64748B]">
                                  {log.check_in ? format(new Date(log.check_in), 'h:mm a') : '-'}
                                </span>
                              </div>
                            )) : (
                              <p className="text-[#94A3B8] text-center py-4">No attendance records</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      {emp.face_descriptor && (
                        <DeleteBiometricButton
                          employeeId={emp.id}
                          employeeName={emp.name}
                          onDeleted={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function EmployeeForm({ employee, departments, offices, onSubmit, onCancel }: {
  employee?: Employee; departments: string[]; offices: Office[]; onSubmit: (data: any) => Promise<void>; onCancel: () => void
}) {
  const [name, setName] = useState(employee?.name || '')
  const [email, setEmail] = useState(employee?.email || '')
  const [department, setDepartment] = useState(employee?.department || '')
  const [role, setRole] = useState(employee?.role || '')
  const [employeeCode, setEmployeeCode] = useState(employee?.employee_code || '')
  const [officeId, setOfficeId] = useState<string>(employee?.office_id || '')
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!officeId) {
      toast.error('Please select an office')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name, email, department, role,
        employee_code: employeeCode,
        office_id: officeId,
        face_descriptor: faceDescriptor,
        face_image_base64: faceImage,
      })
    } catch (err: any) {
      toast.error(err.message || 'Error saving employee')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1E293B]">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="border-[#E2E8F0]" required />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1E293B]">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-[#E2E8F0]" required />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1E293B]">Office</Label>
          <Select value={officeId} onValueChange={setOfficeId}>
            <SelectTrigger className="border-[#E2E8F0]"><SelectValue placeholder="Select office" /></SelectTrigger>
            <SelectContent>
              {offices.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name} <span className="text-[#94A3B8] text-xs">· {o.timezone}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1E293B]">Department</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="border-[#E2E8F0]"><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1E293B]">Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} className="border-[#E2E8F0]" required />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1E293B]">Employee Code</Label>
          <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="border-[#E2E8F0]" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1E293B]">Face Registration</Label>
        {employee?.face_descriptor && !faceDescriptor && (
          <p className="text-sm text-brand flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Face already registered
          </p>
        )}
        {faceDescriptor && <p className="text-sm text-brand">New face captured successfully</p>}
        {showCapture ? (
          <FaceCapture
            onCapture={(descriptor, image) => { setFaceDescriptor(descriptor); setFaceImage(image); setShowCapture(false) }}
            onCancel={() => setShowCapture(false)}
          />
        ) : (
          <Button type="button" variant="outline" onClick={() => setShowCapture(true)} className="border-[#E2E8F0]">
            {employee?.face_descriptor ? 'Re-register Face' : 'Register Face'}
          </Button>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={submitting} className="flex-1 bg-brand hover:bg-brand-dark text-white">
          {submitting ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="border-[#E2E8F0]">Cancel</Button>
      </div>
    </form>
  )
}

function DeleteBiometricButton({
  employeeId,
  employeeName,
  onDeleted,
}: {
  employeeId: string
  employeeName: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleDelete() {
    setSubmitting(true)
    try {
      const result = await deleteEmployeeBiometric(employeeId, reason)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Biometric data deleted for ${employeeName}`)
      setOpen(false)
      setReason('')
      setConfirmText('')
      onDeleted()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete biometric data')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setReason('')
          setConfirmText('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          Delete biometric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete biometric data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-2">
            <p className="font-semibold">This action is irreversible.</p>
            <p>
              The face descriptor and reference photo for{' '}
              <span className="font-semibold">{employeeName}</span> will be permanently deleted.
              They will no longer be able to use face login. Their employee record and attendance
              history are preserved.
            </p>
            <p>This action will be recorded in the deletion audit log.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E293B]">
              Reason (optional, recorded in audit log)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Employee requested deletion under DPDP Act"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E293B]">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Deleting…' : 'Permanently delete'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="border-[#E2E8F0]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
