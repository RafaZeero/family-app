import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  className?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, className, action }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {icon && (
        <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-4">
          <i className={`${icon} text-xl text-muted-foreground`} />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
