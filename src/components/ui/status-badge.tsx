import { cn } from '@/lib/utils'

const statusConfig = {
  present: { label: 'Present', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  late: { label: 'Late', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  absent: { label: 'Absent', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'checked-out': { label: 'Checked Out', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  registered: { label: 'Registered', bg: 'bg-brand-light', text: 'text-brand-dark', dot: 'bg-brand' },
  'not-set': { label: 'Not Set', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  face: { label: 'Face', bg: 'bg-brand-light', text: 'text-brand-dark', dot: 'bg-brand' },
  manual: { label: 'Manual', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
} as const

type StatusType = keyof typeof statusConfig

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  const config = statusConfig[status] || statusConfig.absent
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.text, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
