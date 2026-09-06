import { describe, expect, it } from 'vitest'
import { computePropertyAttention } from '../../lib/finance/attention'
import type { LoanRow, PortfolioConfig, PropertyRow, TransactionRow } from '../../types/finance'

const config: PortfolioConfig = {
  lease_alert_days: 30,
  insurance_alert_days: 30,
  loan_alert_days: 60,
  anomaly_multiplier: 2,
  minimum_anomaly_amount: 500,
  low_reserve_threshold: 5000,
  default_reporting_period: 'monthly',
}

function property(overrides: Partial<PropertyRow>): PropertyRow {
  return {
    id: 'p1',
    name: 'דירה בתל אביב',
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
    current_market_value: 2000000,
    management_company: null,
    active: true,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function loan(overrides: Partial<LoanRow>): LoanRow {
  return {
    id: 'l1',
    property_id: 'p1',
    lender: 'בנק',
    loan_type: null,
    original_principal: 1000000,
    current_balance: 800000,
    balance_as_of: '2026-06-01',
    currency: 'ILS',
    interest_rate: null,
    interest_type: 'unknown',
    indexation_type: 'unknown',
    start_date: null,
    maturity_date: null,
    monthly_payment: 4000,
    payment_frequency: 'monthly',
    active: true,
    notes: null,
    ...overrides,
  }
}

describe('computePropertyAttention', () => {
  it('is "good" with no reasons when nothing is wrong', () => {
    const result = computePropertyAttention(property({}), [], [], config, '2026-06-15')
    expect(result.status).toBe('good')
    expect(result.reasons).toHaveLength(0)
  })

  it('flags insufficient_data when current_market_value is missing', () => {
    const result = computePropertyAttention(property({ current_market_value: null }), [], [], config, '2026-06-15')
    expect(result.status).toBe('insufficient_data')
    expect(result.reasons[0].type).toBe('missing_critical_data')
  })

  it('flags attention when a loan matures within loan_alert_days', () => {
    const result = computePropertyAttention(
      property({}),
      [loan({ maturity_date: '2026-07-10' })], // 25 days after 2026-06-15
      [],
      config,
      '2026-06-15'
    )
    expect(result.status).toBe('attention')
    expect(result.reasons[0].type).toBe('loan_maturity')
  })

  it('flags critical when an active loan is already past its maturity date', () => {
    const result = computePropertyAttention(
      property({}),
      [loan({ maturity_date: '2026-01-01' })],
      [],
      config,
      '2026-06-15'
    )
    expect(result.status).toBe('critical')
  })

  it('does not flag a loan maturing well beyond the alert window', () => {
    const result = computePropertyAttention(
      property({}),
      [loan({ maturity_date: '2027-06-15' })],
      [],
      config,
      '2026-06-15'
    )
    expect(result.status).toBe('good')
  })

  it('flags an unusual expense that exceeds the historical average by the configured multiplier', () => {
    const historical: TransactionRow[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `h${i}`,
      property_id: 'p1',
      loan_id: null,
      transaction_date: `2025-${String(i + 7).padStart(2, '0')}-10`,
      category_id: 'repairs',
      description: null,
      amount: 400,
      currency: 'ILS',
      is_income: false,
      is_operating_expense: true,
      is_capex: false,
      is_financing: false,
      vendor: null,
      created_at: '2025-01-10T00:00:00Z',
    }))
    const spike: TransactionRow = {
      id: 'spike',
      property_id: 'p1',
      loan_id: null,
      transaction_date: '2026-06-01',
      category_id: 'repairs',
      description: null,
      amount: 2000, // > 400 * 2 and > 500 minimum
      currency: 'ILS',
      is_income: false,
      is_operating_expense: true,
      is_capex: false,
      is_financing: false,
      vendor: null,
      created_at: '2026-06-01T00:00:00Z',
    }
    const result = computePropertyAttention(property({}), [], [...historical, spike], config, '2026-06-15')
    expect(result.status).toBe('attention')
    expect(result.reasons.some((r) => r.type === 'unusual_expense')).toBe(true)
  })

  it('worst-of-all-reasons wins: critical beats a simultaneous missing-data flag', () => {
    const result = computePropertyAttention(
      property({ current_market_value: null }),
      [loan({ maturity_date: '2026-01-01' })],
      [],
      config,
      '2026-06-15'
    )
    expect(result.status).toBe('critical')
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })
})
