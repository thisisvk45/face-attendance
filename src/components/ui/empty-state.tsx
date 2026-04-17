import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon ? (
        <div className="mb-4 text-brand/30">{icon}</div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-brand hover:bg-brand-dark text-white">
          {action.label}
        </Button>
      )}
    </div>
  )
}
