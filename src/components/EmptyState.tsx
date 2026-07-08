import type { ReactNode } from 'react'

export function EmptyState({
  mark = '☙',
  title,
  children,
  action,
}: {
  mark?: string
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        {mark}
      </div>
      <h3 className="empty-title">{title}</h3>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  )
}
