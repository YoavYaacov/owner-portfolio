import type { Currency, FxRateRow } from '../../types/finance'
import { type CalcResult, ok, insufficient } from './types'

/**
 * Finds the most recent known rate for `from -> to` on or before `asOfDate`,
 * falling back to the inverse pair (`to -> from`) if that's what was
 * recorded. Never extrapolates forward from a future rate (SRS §39 —
 * FX source/date must be visible and honest, not guessed).
 */
export function findFxRate(
  rates: FxRateRow[],
  from: Currency,
  to: Currency,
  asOfDate: string
): { rate: number; rateDate: string; source: FxRateRow['source'] } | null {
  if (from === to) {
    return { rate: 1, rateDate: asOfDate, source: 'manual' }
  }

  const candidates = rates
    .filter((r) => r.from_currency === from && r.to_currency === to && r.rate_date <= asOfDate)
    .sort((a, b) => (a.rate_date < b.rate_date ? 1 : -1))

  if (candidates.length > 0) {
    const best = candidates[0]
    return { rate: best.rate, rateDate: best.rate_date, source: best.source }
  }

  const inverseCandidates = rates
    .filter((r) => r.from_currency === to && r.to_currency === from && r.rate_date <= asOfDate)
    .sort((a, b) => (a.rate_date < b.rate_date ? 1 : -1))

  if (inverseCandidates.length > 0) {
    const best = inverseCandidates[0]
    return { rate: 1 / best.rate, rateDate: best.rate_date, source: best.source }
  }

  return null
}

export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  asOfDate: string,
  rates: FxRateRow[]
): CalcResult<number> {
  const found = findFxRate(rates, from, to, asOfDate)
  if (!found) {
    return insufficient(
      `אין שער המרה ידוע מ-${from} ל-${to} לתאריך ${asOfDate} או לפני כן.`,
      [`fx_rate:${from}->${to}`]
    )
  }
  return ok(amount * found.rate)
}
