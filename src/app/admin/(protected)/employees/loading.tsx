import { SkeletonTable } from '@/components/ui/skeleton-table'

export default function EmployeesLoading() {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex justify-between items-center">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-10 w-36" />
      </div>
      <div className="flex gap-4">
        <div className="skeleton h-10 w-80" />
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-10 w-40" />
      </div>
      <div className="bg-white rounded-xl shadow-md">
        <SkeletonTable rows={8} cols={8} />
      </div>
    </div>
  )
}
