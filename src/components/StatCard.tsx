import type { ReactNode } from 'react'
import Tooltip from './Tooltip'

interface StatCardProps {
  label: string
  explanation?: string
  value: ReactNode
  note?: ReactNode
  tone?: 'neutral' | 'good' | 'attention' | 'critical'
}

/**
 * One dashboard number, one clear question answered (Master Prompt §20).
 * `note` is used for the honest "partial data" / "as of" disclosures
 * (SRS §38/§39) rather than hiding them in a tooltip.
 */
export default function StatCard({ label, explanation, value, note, tone = 'neutral' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__label">
        {explanation ? <Tooltip label={label} explanation={explanation} /> : label}
      </div>
      <div className="stat-card__value">{value}</div>
      {note ? <div className="stat-card__note">{note}</div> : null}
    </div>
  )
}
