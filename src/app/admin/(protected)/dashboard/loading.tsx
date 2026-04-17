import { SkeletonCards } from '@/components/ui/skeleton-table'
import { SkeletonTable } from '@/components/ui/skeleton-table'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="skeleton h-8 w-40" />
      <SkeletonCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="skeleton h-5 w-48 mb-4" />
          <div className="skeleton h-[300px] w-full" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="skeleton h-5 w-48 mb-4" />
          <div className="skeleton h-[300px] w-full" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="skeleton h-5 w-40 mb-4" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    </div>
  )
}
