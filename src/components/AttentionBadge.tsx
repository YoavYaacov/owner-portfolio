import type { AttentionStatus } from '../lib/finance'

const LABELS: Record<AttentionStatus, string> = {
  good: 'תקין',
  attention: 'דורש מעקב',
  critical: 'דורש טיפול',
  insufficient_data: 'חסר מידע',
}

const CLASS: Record<AttentionStatus, string> = {
  good: 'status-badge--good',
  attention: 'status-badge--attention',
  critical: 'status-badge--critical',
  insufficient_data: 'status-badge--neutral',
}

const ICON: Record<AttentionStatus, string> = {
  good: '●',
  attention: '▲',
  critical: '■',
  insufficient_data: '○',
}

/**
 * Status is always shown as icon + label + color together (Master Prompt
 * §5) — never color alone, so it reads correctly for colorblind users too.
 */
export default function AttentionBadge({ status }: { status: AttentionStatus }) {
  return (
    <span className={`status-badge ${CLASS[status]}`}>
      <span aria-hidden="true">{ICON[status]}</span>
      {LABELS[status]}
    </span>
  )
}
