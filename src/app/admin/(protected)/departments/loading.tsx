import { SkeletonTable } from '@/components/ui/skeleton-table'

export default function DepartmentsLoading() {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex justify-between items-center">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-10 w-40" />
      </div>
      <div className="bg-white rounded-xl shadow-md">
        <SkeletonTable rows={5} cols={3} />
      </div>
      <div className="bg-white rounded-xl shadow-md">
        <div className="skeleton h-5 w-64 m-6" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    </div>
  )
}
