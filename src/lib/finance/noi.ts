import type { Currency, FxRateRow, TransactionRow } from '../../types/finance'
import { type CalcResult, ok, insufficient } from './types'
import { convertAmount } from './fx'

export interface NoiBreakdown {
  income: number
  operatingExpenses: number
  noi: number
  currency: Currency
}

/**
 * NOI = Operating Income - Operating Expenses (SRS §15). CapEx and
 * financing transactions are excluded by construction — is_capex/
 * is_financing transactions never enter this sum, per Master Prompt §13's
 * requirement to never conflate the two with operating results.
 */
export function computeNOI(
  transactions: TransactionRow[],
  periodStart: string,
  periodEnd: string,
  targetCurrency: Currency,
  fxRates: FxRateRow[]
): CalcResult<NoiBreakdown> {
  const inPeriod = transactions.filter(
    (t) => t.transaction_date >= periodStart && t.transaction_date <= periodEnd && (t.is_income || t.is_operating_expense)
  )

  let income = 0
  let operatingExpenses = 0
  const missing: string[] = []

  for (const t of inPeriod) {
    const converted = convertAmount(t.amount, t.currency, targetCurrency, t.transaction_date, fxRates)
    if (!converted.ok) {
      missing.push(...converted.missing)
      continue
    }
    if (t.is_income) income += converted.value
    else operatingExpenses += converted.value
  }

  if (missing.length > 0) {
    return insufficient(
      `לא ניתן לחשב NOI במלואו — חסרים שערי המרה עבור ${[...new Set(missing)].join(', ')}.`,
      [...new Set(missing)]
    )
  }

  return ok({ income, operatingExpenses, noi: income - operatingExpenses, currency: targetCurrency })
}
