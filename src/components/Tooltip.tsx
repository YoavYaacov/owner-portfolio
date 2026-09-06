import { useId, useState, type ReactNode } from 'react'

interface TooltipProps {
  label: ReactNode
  explanation: string
}

/**
 * Financial-term explainer required by Master Prompt §3/§19 and SRS §35:
 * every meaningful professional term gets a clear Hebrew label plus a short,
 * non-academic explanation — never assume the user knows what NOI/Cap
 * Rate/LTV mean. Keyboard-accessible (focus shows the tooltip too, not only
 * hover) per Master Prompt §25.
 */
export default function Tooltip({ label, explanation }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()

  return (
    <span className="tooltip-wrap">
      <button
        type="button"
        className="tooltip-trigger"
        aria-describedby={tooltipId}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span className="tooltip-icon" aria-hidden="true">
          ?
        </span>
      </button>
      {open ? (
        <span role="tooltip" id={tooltipId} className="tooltip-bubble">
          {explanation}
        </span>
      ) : null}
    </span>
  )
}
