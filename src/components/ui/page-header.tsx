interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">{title}</h1>
        {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  )
}
