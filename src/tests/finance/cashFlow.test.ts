import { describe, expect, it } from 'vitest'
import { computeCashFlowAfterDebtService } from '../../lib/finance/cashFlow'
import type { LoanRow, TransactionRow } from '../../types/finance'

function loan(overrides: Partial<LoanRow>): LoanRow {
  return {
    id: 'l1',
    property_id: 'p1',
    lender: 'Bank',
    loan_type: null,
    original_principal: 100000,
    current_balance: 90000,
    balance_as_of: '2026-06-01',
    currency: 'ILS',
    interest_rate: null,
    interest_type: 'unknown',
    indexation_type: 'unknown',
    start_date: null,
    maturity_date: null,
    monthly_payment: 3000,
    payment_frequency: 'monthly',
    active: true,
    notes: null,
    ...overrides,
  }
}

function financingTxn(amount: number, date: string): TransactionRow {
  return {
    id: Math.random().toString(36),
    property_id: 'p1',
    loan_id: 'l1',
    transaction_date: date,
    category_id: 'mortgage_payment',
    description: null,
    amount,
    currency: 'ILS',
    is_income: false,
    is_operating_expense: false,
    is_capex: false,
    is_financing: true,
    vendor: null,
    created_at: date,
  }
}

describe('computeCashFlowAfterDebtService', () => {
  it('returns cashFlow = NOI with zero debt service when there is no active loan', () => {
    const result = computeCashFlowAfterDebtService(4000, [], [], '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.debtService).toBe(0)
      expect(result.value.cashFlow).toBe(4000)
      expect(result.value.debtServiceSource).toBe('none')
    }
  })

  it('sums real financing transactions in the period as debt service', () => {
    const txns = [financingTxn(2000, '2026-03-05'), financingTxn(1000, '2026-03-20')]
    const result = computeCashFlowAfterDebtService(4000, txns, [loan({})], '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.debtService).toBe(3000)
      expect(result.value.cashFlow).toBe(1000)
      expect(result.value.debtServiceSource).toBe('transactions')
    }
  })

  it('refuses to guess from loans.monthly_payment when an active loan has no recorded financing transactions', () => {
    const result = computeCashFlowAfterDebtService(4000, [], [loan({})], '2026-03-01', '2026-03-31', 'ILS', [])
    expect(result.ok).toBe(false)
  })
})
