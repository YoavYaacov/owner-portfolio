import { describe, expect, it } from 'vitest'
import { computeCapRate } from '../../lib/finance/capRate'
import { computeLTV } from '../../lib/finance/ltv'

describe('computeCapRate', () => {
  it('computes NOI / value', () => {
    const result = computeCapRate(50000, 1000000)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(0.05, 6)
  })

  it('reports insufficient data instead of Infinity when value is missing or zero', () => {
    expect(computeCapRate(50000, null).ok).toBe(false)
    expect(computeCapRate(50000, 0).ok).toBe(false)
  })
})

describe('computeLTV', () => {
  it('computes balance / value', () => {
    const result = computeLTV(600000, 1000000)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeCloseTo(0.6, 6)
  })

  it('reports insufficient data when value is missing', () => {
    expect(computeLTV(600000, null).ok).toBe(false)
  })
})
