'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttendanceLogs, manualCheckIn, manualCheckOut, deleteAttendanceLog, getEmployeeOptions, getWeatherForDateRange, type AttendanceWeather } from './actions'
import { getDepartmentsList, getOfficesList } from '../employees/actions'
import type { Office } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton-table'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDept, setFilterDept] = useState('all')
  const [filterOffice, setFilterOffice] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchName, setSearchName] = useState('')
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')

  const filters = { startDate, endDate, department: filterDept, status: filterStatus, employeeName: searchName, officeId: filterOffice }

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['attendance-logs', filters], queryFn: () => getAttendanceLogs(filters) })
  const { data: departments = [] } = useQuery({ queryKey: ['departments-list'], queryFn: () => getDepartmentsList() })
  const { data: offices = [] } = useQuery<Office[]>({ queryKey: ['offices-list'], queryFn: () => getOfficesList() })
  const { data: employees = [] } = useQuery({ queryKey: ['employee-options'], queryFn: () => getEmployeeOptions() })
  const { data: weatherData = [] } = useQuery<AttendanceWeather[]>({
    queryKey: ['attendance-weather', startDate, endDate],
    queryFn: () => getWeatherForDateRange(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  })

  const checkInMutation = useMutation({
    mutationFn: manualCheckIn,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-logs'] }); setShowManualDialog(false); toast.success('Check-in recorded') },
    onError: (err: Error) => toast.error(err.message),
  })
  const checkOutMutation = useMutation({
    mutationFn: manualCheckOut,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-logs'] }); toast.success('Check-out recorded') },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAttendanceLog,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-logs'] }); toast.success('Record deleted') },
  })

  function exportCSV() {
    const headers = ['Date', 'Employee', 'Code', 'Department', 'Office', 'Status', 'Check In', 'Check Out', 'Method', 'Confidence']
    const rows = logs.map((log: any) => [
      log.date, log.employee?.name || '', log.employee?.employee_code || '', log.employee?.department || '',
      log.office?.name || '',
      log.status, log.check_in ? format(new Date(log.check_in), 'HH:mm:ss') : '',
      log.check_out ? format(new Date(log.check_out), 'HH:mm:ss') : '', log.method, log.confidence_score?.toFixed(2) || '',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FaceAttend_attendance_${startDate}_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Logs"
        description="View and manage attendance records"
        action={
          <div className="flex gap-2">
            <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
              <DialogTrigger asChild>
                <Button className="bg-brand hover:bg-brand-dark text-white">Manual Check-In</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Manual Check-In</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1E293B]">Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="border-[#E2E8F0]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp: any) => <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => selectedEmployee && checkInMutation.mutate(selectedEmployee)} disabled={!selectedEmployee || checkInMutation.isPending} className="w-full bg-brand hover:bg-brand-dark text-white">
                    {checkInMutation.isPending ? 'Recording...' : 'Record Check-In'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={exportCSV} className="border-[#E2E8F0]">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Sticky Filter Bar */}
      <div className="bg-white rounded-xl shadow-md p-4 sticky top-0 z-10">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 h-9 border-[#E2E8F0] text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40 h-9 border-[#E2E8F0] text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Department</Label>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-40 h-9 border-[#E2E8F0] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Office</Label>
            <Select value={filterOffice} onValueChange={setFilterOffice}>
              <SelectTrigger className="w-40 h-9 border-[#E2E8F0] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {offices.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9 border-[#E2E8F0] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Employee</Label>
            <Input placeholder="Search..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="w-44 h-9 border-[#E2E8F0] text-sm" />
          </div>
        </div>
      </div>

      {/* Weather Strip */}
      {weatherData.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
            </svg>
            <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Weather conditions</h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {weatherData.map((ow) =>
              ow.days.slice(0, 7).map((day) => (
                <div
                  key={`${ow.officeId}-${day.date}`}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-medium text-[#1E293B]">{ow.officeName}</span>
                    {startDate !== endDate && (
                      <span className="text-[#94A3B8] ml-1">{day.date.slice(5)}</span>
                    )}
                  </div>
                  <span className="text-[#64748B]">{day.description}</span>
                  <span className="text-[#1E293B] font-medium">
                    {Math.round(day.temperatureMax)}/{Math.round(day.temperatureMin)}°C
                  </span>
                  {day.precipitation > 0 && (
                    <span className="text-blue-600 font-medium">
                      {day.precipitation.toFixed(1)}mm
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={10} cols={10} />
        ) : logs.length === 0 ? (
          <EmptyState title="No records found" description="Adjust your filters or check back later" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Date</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Employee</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Department</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Office</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Check In</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Check Out</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Method</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Confidence</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any, i: number) => (
                <TableRow key={log.id} className={`hover:bg-gray-50/80 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  <TableCell className="text-sm">{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium text-[#1E293B] text-sm">{log.employee?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-[#64748B] text-sm">{log.employee?.department || '-'}</TableCell>
                  <TableCell className="text-[#64748B] text-sm">
                    {log.office?.name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                        {log.office.name}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] italic">—</span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={log.status} /></TableCell>
                  <TableCell className="text-sm text-[#64748B]">{log.check_in ? format(new Date(log.check_in), 'h:mm a') : '-'}</TableCell>
                  <TableCell className="text-sm text-[#64748B]">{log.check_out ? format(new Date(log.check_out), 'h:mm a') : '-'}</TableCell>
                  <TableCell><StatusBadge status={log.method} /></TableCell>
                  <TableCell className="text-sm text-[#64748B]">{log.confidence_score ? `${(log.confidence_score * 100).toFixed(1)}%` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {!log.check_out && log.check_in && (
                        <Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0]" onClick={() => checkOutMutation.mutate(log.id)}>Check Out</Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 text-xs border-[#E2E8F0] text-red-600 hover:bg-red-50" onClick={() => { if (confirm('Delete this record?')) deleteMutation.mutate(log.id) }}>Delete</Button>
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
