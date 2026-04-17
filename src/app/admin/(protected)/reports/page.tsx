'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMonthlyReport, getDepartmentReport } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/ui/page-header'
import { SkeletonTable } from '@/components/ui/skeleton-table'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'

function AttendanceRing({ percentage }: { percentage: number }) {
  const pct = parseFloat(String(percentage))
  const color = pct >= 90 ? '#2DD4BF' : pct >= 75 ? '#F59E0B' : '#EF4444'
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#E2E8F0" strokeWidth="3" />
        <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  )
}

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const { data: monthlyReport = [], isLoading } = useQuery({
    queryKey: ['monthly-report', month],
    queryFn: () => getMonthlyReport(month),
  })

  const { data: deptReport = [] } = useQuery({
    queryKey: ['dept-report', month],
    queryFn: () => getDepartmentReport(month),
  })

  function exportCSV() {
    const headers = ['Name', 'Code', 'Department', 'Present Days', 'Late Days', 'Absent Days', 'Working Days', 'Attendance %']
    const rows = monthlyReport.map((r: any) => [r.name, r.employee_code, r.department, r.presentDays, r.lateDays, r.absentDays, r.workingDays, r.percentage + '%'])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FaceAttend_report_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report exported')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Monthly attendance analytics"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-[#64748B]">Month:</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48 h-10 border-[#E2E8F0]" />
            </div>
            <Button variant="outline" onClick={exportCSV} className="border-[#E2E8F0]">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export CSV
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="employee">
        <TabsList className="bg-white shadow-sm border border-[#E2E8F0]">
          <TabsTrigger value="employee" className="data-[state=active]:bg-brand data-[state=active]:text-white">Employee Report</TabsTrigger>
          <TabsTrigger value="department" className="data-[state=active]:bg-brand data-[state=active]:text-white">Department Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="employee" className="mt-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {isLoading ? (
              <SkeletonTable rows={10} cols={8} />
            ) : monthlyReport.length === 0 ? (
              <EmptyState title="No data" description="No employee records for this month" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Employee</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Code</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Department</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Present</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Late</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Absent</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Working</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyReport.map((r: any, i: number) => (
                    <TableRow key={r.id} className={`hover:bg-gray-50/80 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                      <TableCell className="font-medium text-[#1E293B]">{r.name}</TableCell>
                      <TableCell className="font-mono text-sm text-[#64748B]">{r.employee_code}</TableCell>
                      <TableCell className="text-[#64748B]">{r.department}</TableCell>
                      <TableCell className="text-status-present font-medium">{r.presentDays}</TableCell>
                      <TableCell className="text-status-late font-medium">{r.lateDays}</TableCell>
                      <TableCell className="text-status-absent font-medium">{r.absentDays}</TableCell>
                      <TableCell className="text-[#64748B]">{r.workingDays}</TableCell>
                      <TableCell><AttendanceRing percentage={r.percentage} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="department" className="mt-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {deptReport.length === 0 ? (
              <EmptyState title="No data" description="No department records for this month" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Department</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Employees</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Present</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Late</TableHead>
                    <TableHead className="text-xs font-semibold text-[#64748B] uppercase">Total Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptReport.map((d: any, i: number) => (
                    <TableRow key={d.department} className={i % 2 === 1 ? 'bg-gray-50/30' : ''}>
                      <TableCell className="font-medium text-[#1E293B]">{d.department}</TableCell>
                      <TableCell className="text-[#64748B]">{d.totalEmployees}</TableCell>
                      <TableCell className="text-status-present font-medium">{d.totalPresent}</TableCell>
                      <TableCell className="text-status-late font-medium">{d.totalLate}</TableCell>
                      <TableCell className="text-[#64748B]">{d.totalRecords}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
