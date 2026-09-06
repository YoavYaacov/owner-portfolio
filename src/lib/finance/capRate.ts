import { type CalcResult, ok, insufficient } from './types'

/**
 * Cap Rate = annualized NOI / current market value (SRS §38). Requires a
 * strictly positive value — a missing or zero valuation is reported as
 * insufficient data rather than producing Infinity or a misleading 0%.
 */
export function computeCapRate(annualizedNoi: number, currentMarketValue: number | null): CalcResult<number> {
  if (currentMarketValue == null || currentMarketValue <= 0) {
    return insufficient('לא ניתן לחשב שיעור תשואה (Cap Rate) — חסר שווי עדכני לנכס.', ['current_market_value'])
  }
  return ok(annualizedNoi / currentMarketValue)
}
