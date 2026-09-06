import { describe, expect, it } from 'vitest'
import { convertAmount, findFxRate } from '../../lib/finance/fx'
import type { FxRateRow } from '../../types/finance'

const rates: FxRateRow[] = [
  { id: '1', rate_date: '2026-01-01', from_currency: 'USD', to_currency: 'ILS', rate: 3.6, source: 'manual' },
  { id: '2', rate_date: '2026-06-01', from_currency: 'USD', to_currency: 'ILS', rate: 3.7, source: 'manual' },
]

describe('findFxRate', () => {
  it('returns 1 for same-currency conversion without needing any rate row', () => {
    expect(findFxRate([], 'ILS', 'ILS', '2026-07-01')?.rate).toBe(1)
  })

  it('picks the most recent rate on or before the target date', () => {
    expect(findFxRate(rates, 'USD', 'ILS', '2026-07-01')?.rate).toBe(3.7)
    expect(findFxRate(rates, 'USD', 'ILS', '2026-03-01')?.rate).toBe(3.6)
  })

  it('never uses a future rate', () => {
    expect(findFxRate(rates, 'USD', 'ILS', '2025-12-01')).toBeNull()
  })

  it('falls back to the inverse pair when only that direction was recorded', () => {
    const found = findFxRate(rates, 'ILS', 'USD', '2026-07-01')
    expect(found?.rate).toBeCloseTo(1 / 3.7, 6)
  })

  it('returns null (not a guess) when nothing usable exists', () => {
    expect(findFxRate([], 'USD', 'ILS', '2026-07-01')).toBeNull()
  })
})

describe('convertAmount', () => {
  it('converts using the applicable rate', () => {
    const result = convertAmount(100, 'USD', 'ILS', '2026-07-01', rates)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(370, 6)
  })

  it('reports insufficient data instead of inventing a rate', () => {
    const result = convertAmount(100, 'USD', 'ILS', '2025-01-01', rates)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.missing).toContain('fx_rate:USD->ILS')
  })
})
