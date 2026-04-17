export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      <div className="border-b border-border">
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-4 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-4 py-4 border-b border-border/50">
          {Array.from({ length: cols }).map((_, col) => (
            <div key={col} className="skeleton h-4 flex-1" style={{ animationDelay: `${(row * cols + col) * 50}ms` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-3">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-8 w-16" />
      <div className="skeleton h-3 w-32" />
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
