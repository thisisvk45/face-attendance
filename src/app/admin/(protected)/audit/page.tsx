'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDeletionLogs, type DeletionLogRow } from './actions'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { SkeletonTable } from '@/components/ui/skeleton-table'
import { EmptyState } from '@/components/ui/empty-state'
import { format } from 'date-fns'

export default function AuditPage() {
  const [search, setSearch] = useState('')

  const { data: logs = [], isLoading } = useQuery<DeletionLogRow[]>({
    queryKey: ['deletion-logs'],
    queryFn: () => getDeletionLogs(),
  })

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return logs
    return logs.filter(
      (l) =>
        l.employee_name.toLowerCase().includes(s) ||
        l.deleted_by_email.toLowerCase().includes(s) ||
        (l.reason || '').toLowerCase().includes(s)
    )
  }, [logs, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Biometric data deletion history — kept for compliance"
      />

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <Input
              placeholder="Search by employee, admin, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-[#E2E8F0]"
            />
          </div>
          <div className="text-xs text-[#64748B] mt-3 flex-1 min-w-[200px]">
            Each row represents a permanent deletion of biometric data (face descriptor + reference
            photo). Employee records and attendance history are preserved. Most recent 500 events
            shown.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching events' : 'No deletions yet'}
            description={
              search
                ? 'Try adjusting your search'
                : 'When an admin deletes an employee\u2019s biometric data, the event will appear here.'
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">
                  When
                </TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">
                  Employee
                </TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">
                  Deleted by
                </TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase">
                  Reason
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log, i) => (
                <TableRow
                  key={log.id}
                  className={`hover:bg-gray-50/80 transition-colors ${
                    i % 2 === 1 ? 'bg-gray-50/30' : ''
                  }`}
                >
                  <TableCell className="text-sm text-[#1E293B] whitespace-nowrap">
                    <div className="font-medium">
                      {format(new Date(log.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-[#94A3B8]">
                      {format(new Date(log.created_at), 'h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium text-[#1E293B]">{log.employee_name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {log.deleted_by_email}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B] max-w-md">
                    {log.reason ? (
                      <span>{log.reason}</span>
                    ) : (
                      <span className="text-[#94A3B8] italic">No reason provided</span>
                    )}
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
