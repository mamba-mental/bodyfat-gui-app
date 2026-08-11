import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface WorkspacePageHeaderProps {
  eyebrow: string
  title: string
  description: string
  icon?: LucideIcon
  actions?: ReactNode
}

export function WorkspacePageHeader({ eyebrow, title, description, icon: Icon, actions }: WorkspacePageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
