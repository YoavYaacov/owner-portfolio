import { describe, expect, it } from 'vitest'
import { aggregatePortfolio } from '../../lib/finance/portfolioAggregate'
import type { FxRateRow, LoanRow, PropertyRow, TransactionRow } from '../../types/finance'

function property(overrides: Partial<PropertyRow>): PropertyRow {
  return {
    id: overrides.id ?? 'p1',
    name: overrides.name ?? 'נכס',
    address: null,
    city: null,
    state_province: null,
    postal_code: null,
    country: 'IL',
    default_currency: 'ILS',
    property_type: 'apartment',
    property_stage: 'operating',
    acquisition_date: null,
    acquisition_cost: null,
    current_market_value: 1000000,
    management_company: null,
    active: true,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function income(propertyId: string, amount: number, date: string, currency: 'ILS' | 'USD' = 'ILS'): TransactionRow {
  return {
    id: Math.random().toString(36),
    property_id: propertyId,
    loan_id: null,
    transaction_date: date,
    category_id: 'rent',
    description: null,
    amount,
    currency,
    is_income: true,
    is_operating_expense: false,
    is_capex: false,
    is_financing: false,
    vendor: null,
    created_at: date,
  }
}

describe('aggregatePortfolio', () => {
  it('sums value and NOI across properties with complete data', () => {
    const properties = [property({ id: 'p1', current_market_value: 1000000 }), property({ id: 'p2', current_market_value: 2000000 })]
    const transactions = [income('p1', 5000, '2026-03-10'), income('p2', 8000, '2026-03-12')]

    const totals = aggregatePortfolio({
      properties,
      loans: [],
      transactions,
      fxRates: [],
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      today: '2026-03-31',
      baseCurrency: 'ILS',
    })

    expect(totals.totalValue.total).toBe(3000000)
    expect(totals.totalValue.excluded).toHaveLength(0)
    expect(totals.noi.total).toBe(13000)
    expect(totals.equity).toEqual({ value: 3000000, currency: 'ILS' })
  })

  it('excludes a property missing its value from the total and names it, instead of showing a silently-wrong number', () => {
    const properties = [property({ id: 'p1', current_market_value: 1000000 }), property({ id: 'p2', name: 'נכס חסר שווי', current_market_value: null })]

    const totals = aggregatePortfolio({
      properties,
      loans: [],
      transactions: [],
      fxRates: [],
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      today: '2026-03-31',
      baseCurrency: 'ILS',
    })

    expect(totals.totalValue.total).toBe(1000000)
    expect(totals.totalValue.excluded).toEqual([{ propertyId: 'p2', propertyName: 'נכס חסר שווי', reason: 'חסר שווי עדכני' }])
    // Equity requires BOTH value and debt to be fully known — must not be
    // silently computed from a partial total.
    expect(totals.equity).toBeNull()
  })

  it('excludes a USD property from an ILS total when no FX rate is available, rather than mixing currencies', () => {
    const properties = [property({ id: 'p1', default_currency: 'USD', current_market_value: 500000 })]

    const totals = aggregatePortfolio({
      properties,
      loans: [],
      transactions: [],
      fxRates: [],
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      today: '2026-03-31',
      baseCurrency: 'ILS',
    })

    expect(totals.totalValue.total).toBe(0)
    expect(totals.totalValue.excluded).toHaveLength(1)
  })

  it('converts a USD property into an ILS total when a usable FX rate exists', () => {
    const properties = [property({ id: 'p1', default_currency: 'USD', current_market_value: 500000 })]
    const fxRates: FxRateRow[] = [{ id: 'fx1', rate_date: '2026-01-01', from_currency: 'USD', to_currency: 'ILS', rate: 3.7, source: 'manual' }]

    const totals = aggregatePortfolio({
      properties,
      loans: [],
      transactions: [],
      fxRates,
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      today: '2026-03-31',
      baseCurrency: 'ILS',
    })

    expect(totals.totalValue.total).toBeCloseTo(1_850_000, 6)
    expect(totals.totalValue.excluded).toHaveLength(0)
  })

  it('sums active loan balances as debt, per property', () => {
    const properties = [property({ id: 'p1' })]
    const loans: LoanRow[] = [
      {
        id: 'l1',
        property_id: 'p1',
        lender: 'בנק',
        loan_type: null,
        original_principal: 900000,
        current_balance: 600000,
        balance_as_of: '2026-03-01',
        currency: 'ILS',
        interest_rate: null,
        interest_type: 'unknown',
        indexation_type: 'unknown',
        start_date: null,
        maturity_date: null,
        monthly_payment: null,
        payment_frequency: 'monthly',
        active: true,
        notes: null,
      },
    ]

    const totals = aggregatePortfolio({
      properties,
      loans,
      transactions: [],
      fxRates: [],
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      today: '2026-03-31',
      baseCurrency: 'ILS',
    })

    expect(totals.totalDebt.total).toBe(600000)
    expect(totals.equity).toEqual({ value: 400000, currency: 'ILS' })
  })
})
