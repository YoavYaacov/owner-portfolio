import type { Currency, FxRateRow, LoanRow, TransactionRow } from '../../types/finance'
import { type CalcResult, ok, insufficient } from './types'
import { convertAmount } from './fx'

export interface CashFlowResult {
  debtService: number
  cashFlow: number
  currency: Currency
  /** 'transactions' = computed from real financing transactions in the
   *  period (accurate); 'none' = there is no active debt at all, so 0 is a
   *  legitimate answer, not a placeholder. There is deliberately no third
   *  "estimated from loans.monthly_payment" source — see ADR-023: a
   *  contractual monthly_payment can silently go stale, so it is shown to
   *  the user as a separate estimate field, never substituted into this
   *  calculation. */
  debtServiceSource: 'transactions' | 'none'
}

/**
 * Cash Flow After Debt Service = NOI - Debt Service (SRS §15). Debt service
 * is read from actual 'financing' transactions in the period, not
 * `loans.monthly_payment` — a contractual figure can go stale or be
 * mid-renegotiation, and Master Prompt §6 forbids treating an assumption as
 * a fact. If active loans exist but no financing transactions were recorded
 * for the period, that is reported as insufficient data rather than
 * silently using 0 or the contractual estimate.
 */
export function computeCashFlowAfterDebtService(
  noi: number,
  transactions: TransactionRow[],
  loans: LoanRow[],
  periodStart: string,
  periodEnd: string,
  targetCurrency: Currency,
  fxRates: FxRateRow[]
): CalcResult<CashFlowResult> {
  const activeLoans = loans.filter((l) => l.active)

  if (activeLoans.length === 0) {
    return ok({ debtService: 0, cashFlow: noi, currency: targetCurrency, debtServiceSource: 'none' })
  }

  const financingTxns = transactions.filter(
    (t) => t.is_financing && t.transaction_date >= periodStart && t.transaction_date <= periodEnd
  )

  if (financingTxns.length === 0) {
    return insufficient(
      'יש הלוואות פעילות אך לא נרשמו תשלומי מימון בתקופה זו — לא ניתן לחשב תזרים לאחר מימון באמינות.',
      ['financing_transactions']
    )
  }

  let debtService = 0
  const missing: string[] = []
  for (const t of financingTxns) {
    const converted = convertAmount(t.amount, t.currency, targetCurrency, t.transaction_date, fxRates)
    if (!converted.ok) {
      missing.push(...converted.missing)
      continue
    }
    debtService += converted.value
  }

  if (missing.length > 0) {
    return insufficient(
      `לא ניתן לחשב תזרים לאחר מימון במלואו — חסרים שערי המרה עבור ${[...new Set(missing)].join(', ')}.`,
      [...new Set(missing)]
    )
  }

  return ok({ debtService, cashFlow: noi - debtService, currency: targetCurrency, debtServiceSource: 'transactions' })
}
