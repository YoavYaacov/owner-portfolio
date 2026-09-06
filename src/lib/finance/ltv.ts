import { type CalcResult, ok, insufficient } from './types'

/**
 * LTV = total loan balance / current market value (SRS §16/§38). Same
 * "no value, no ratio" rule as computeCapRate.
 */
export function computeLTV(totalLoanBalance: number, currentMarketValue: number | null): CalcResult<number> {
  if (currentMarketValue == null || currentMarketValue <= 0) {
    return insufficient('לא ניתן לחשב יחס מימון (LTV) — חסר שווי עדכני לנכס.', ['current_market_value'])
  }
  return ok(totalLoanBalance / currentMarketValue)
}
