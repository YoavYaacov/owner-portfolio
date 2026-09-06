import type { LoanRow, PortfolioConfig, PropertyRow, TransactionRow } from '../../types/finance'

export type AttentionStatus = 'good' | 'attention' | 'critical' | 'insufficient_data'

export type AttentionImpact = 'critical' | 'attention' | 'missing_data'

export interface AttentionReason {
  type: 'missing_critical_data' | 'loan_maturity' | 'unusual_expense'
  impact: AttentionImpact
  title: string
  description: string
  dueDate?: string
}

export interface PropertyAttention {
  propertyId: string
  status: AttentionStatus
  reasons: AttentionReason[]
}

/**
 * Rules-based attention status (Master Prompt §15 / SRS §30-31). Every
 * reason is an explicit, named rule — there is no unexplained "AI score".
 * V1 rules, each config-driven where the SRS defines a threshold:
 *
 *  1. missing_critical_data — property has no current market value at all.
 *  2. loan_maturity — an active loan on the property matures within
 *     `loan_alert_days`, or has already passed maturity while still active.
 *  3. unusual_expense — a recent operating-expense transaction exceeds
 *     `anomaly_multiplier` × the trailing 12-month average for its own
 *     category, and exceeds `minimum_anomaly_amount` (SRS §31). Compared
 *     only within the same currency, to avoid silently mixing an FX
 *     assumption into a data-quality check.
 *
 * Alert types this deliberately does NOT cover yet (lease_expiration,
 * insurance_expiration, overdue_milestone, low_reserve, ...) have no data
 * source in the schema yet — see ADR-025. This function is meant to gain
 * more rules over time without changing its signature or callers.
 */
export function computePropertyAttention(
  property: PropertyRow,
  propertyLoans: LoanRow[],
  propertyTransactions: TransactionRow[],
  config: PortfolioConfig,
  today: string,
  recentWindowDays = 90,
  historyWindowDays = 365
): PropertyAttention {
  const reasons: AttentionReason[] = []

  if (property.current_market_value == null) {
    reasons.push({
      type: 'missing_critical_data',
      impact: 'missing_data',
      title: 'חסר שווי עדכני',
      description: `לא הוזן שווי שוק עדכני לנכס "${property.name}". לא ניתן לחשב Cap Rate, LTV או שווי פורטפוליו מדויק בלעדיו.`,
    })
  }

  const todayMs = Date.parse(today)

  for (const loan of propertyLoans) {
    if (!loan.active || !loan.maturity_date) continue
    const maturityMs = Date.parse(loan.maturity_date)
    const daysUntil = Math.round((maturityMs - todayMs) / 86_400_000)

    if (daysUntil <= 0) {
      reasons.push({
        type: 'loan_maturity',
        impact: 'critical',
        title: 'הלוואה עברה את מועד הפדיון',
        description: `ההלוואה מ-${loan.lender} על נכס "${property.name}" עברה את תאריך הפדיון (${loan.maturity_date}) והיא עדיין מסומנת כפעילה.`,
        dueDate: loan.maturity_date,
      })
    } else if (daysUntil <= config.loan_alert_days) {
      reasons.push({
        type: 'loan_maturity',
        impact: 'attention',
        title: 'הלוואה מתקרבת לפדיון',
        description: `ההלוואה מ-${loan.lender} על נכס "${property.name}" מגיעה לפדיון בעוד ${daysUntil} ימים (${loan.maturity_date}).`,
        dueDate: loan.maturity_date,
      })
    }
  }

  const recentCutoff = new Date(todayMs - recentWindowDays * 86_400_000).toISOString().slice(0, 10)
  const historyCutoff = new Date(todayMs - historyWindowDays * 86_400_000).toISOString().slice(0, 10)

  const recentOperating = propertyTransactions.filter(
    (t) => t.is_operating_expense && t.transaction_date >= recentCutoff && t.transaction_date <= today
  )

  const flaggedCategories = new Set<string>()
  for (const txn of recentOperating) {
    if (flaggedCategories.has(txn.category_id)) continue

    const historical = propertyTransactions.filter(
      (t) =>
        t.is_operating_expense &&
        t.category_id === txn.category_id &&
        t.currency === txn.currency &&
        t.transaction_date >= historyCutoff &&
        t.transaction_date < recentCutoff
    )

    if (historical.length < 3) continue // not enough history to call anything "unusual" yet

    const avg = historical.reduce((sum, t) => sum + t.amount, 0) / historical.length
    if (txn.amount > avg * config.anomaly_multiplier && txn.amount > config.minimum_anomaly_amount) {
      flaggedCategories.add(txn.category_id)
      reasons.push({
        type: 'unusual_expense',
        impact: 'attention',
        title: 'הוצאה חריגה זוהתה',
        description: `הוצאה בסך ${txn.amount.toLocaleString('he-IL')} ${txn.currency} בנכס "${property.name}" ב-${txn.transaction_date} חורגת משמעותית מהממוצע ההיסטורי (${avg.toLocaleString('he-IL', { maximumFractionDigits: 0 })} ${txn.currency}).`,
        dueDate: txn.transaction_date,
      })
    }
  }

  const status: AttentionStatus = reasons.some((r) => r.impact === 'critical')
    ? 'critical'
    : reasons.some((r) => r.impact === 'attention')
      ? 'attention'
      : reasons.some((r) => r.impact === 'missing_data')
        ? 'insufficient_data'
        : 'good'

  return { propertyId: property.id, status, reasons }
}
