import { SkeletonTable } from '@/components/ui/skeleton-table'

export default function AttendanceLoading() {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex justify-between items-center">
        <div className="skeleton h-8 w-48" />
        <div className="flex gap-2">
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-28" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-40" />
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-md">
        <SkeletonTable rows={10} cols={9} />
      </div>
    </div>
  )
}
