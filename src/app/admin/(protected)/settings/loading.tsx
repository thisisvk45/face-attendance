export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="skeleton h-8 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-3 w-72" />
          <div className="skeleton h-10 w-64" />
        </div>
      ))}
    </div>
  )
}
