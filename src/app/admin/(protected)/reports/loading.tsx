import { SkeletonTable } from '@/components/ui/skeleton-table'

export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex justify-between items-center">
        <div className="skeleton h-8 w-32" />
        <div className="flex gap-4">
          <div className="skeleton h-10 w-48" />
          <div className="skeleton h-10 w-28" />
        </div>
      </div>
      <div className="skeleton h-10 w-64" />
      <div className="bg-white rounded-xl shadow-md">
        <SkeletonTable rows={10} cols={8} />
      </div>
    </div>
  )
}
