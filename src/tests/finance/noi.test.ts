import { describe, expect, it } from 'vitest'
import { computeNOI } from '../../lib/finance/noi'
import type { TransactionRow } from '../../types/finance'

function txn(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    id: overrides.id ?? Math.random().toString(36),
    property_id: 'p1',
    loan_id: null,
    transaction_date: '2026-03-15',
    category_id: 'cat',
    description: null,
    amount: 0,
    currency: 'ILS',
    is_income: false,
    is_operating_expense: false,
    is_capex: false,
    is_financing: false,
    vendor: null,
    created_at: '2026-03-15T00:00:00Z',
    ...overrides,
  }
}

describe('computeNOI', () => {
  it('subtracts operating expenses from income within the period', () => {
    const txns = [
      txn({ amount: 5000, is_income: true }),
      txn({ amount: 800, is_operating_expense: true }),
      txn({ amount: 200, is_operating_expense: true }),
    ]
    const result = computeNOI(txns, '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.income).toBe(5000)
      expect(result.value.operatingExpenses).toBe(1000)
      expect(result.value.noi).toBe(4000)
    }
  })

  it('excludes CapEx and financing transactions from NOI', () => {
    const txns = [
      txn({ amount: 5000, is_income: true }),
      txn({ amount: 100000, is_capex: true }),
      txn({ amount: 3000, is_financing: true }),
    ]
    const result = computeNOI(txns, '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.noi).toBe(5000)
  })

  it('ignores transactions outside the requested period', () => {
    const txns = [txn({ amount: 5000, is_income: true, transaction_date: '2026-01-01' })]
    const result = computeNOI(txns, '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.income).toBe(0)
  })

  it('reports insufficient data instead of a wrong total when a currency cannot be converted', () => {
    const txns = [txn({ amount: 1000, is_income: true, currency: 'USD' })]
    const result = computeNOI(txns, '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(false)
  })
})
