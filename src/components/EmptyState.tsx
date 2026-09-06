import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  message: string
  actionLabel?: string
  actionTo?: string
  children?: ReactNode
}

/** SRS §45: every empty screen must explain what to do next, not just show nothing. */
export default function EmptyState({ message, actionLabel, actionTo, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Link className="btn btn-primary btn-inline" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  )
}
