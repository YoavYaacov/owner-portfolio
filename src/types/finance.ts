// Row types mirroring the Phase 3 schema (supabase/migrations/0011-0015).
// Hand-written for now, same documented tradeoff as src/types/auth.ts —
// will be replaced/merged with `supabase gen types` once the schema is less
// actively changing (Master Project Document, Deferred Features).

export type Currency = 'ILS' | 'USD'

export type PropertyType =
  | 'apartment'
  | 'single_family_home'
  | 'private_house'
  | 'vacant_land'
  | 'commercial'
  | 'other'

export type PropertyStage =
  | 'planned'
  | 'under_construction'
  | 'operating'
  | 'vacant'
  | 'urban_renewal'
  | 'renovation'
  | 'sold'
  | 'inactive'

export interface PropertyRow {
  id: string
  name: string
  address: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string
  default_currency: Currency
  property_type: PropertyType
  property_stage: PropertyStage
  acquisition_date: string | null
  acquisition_cost: number | null
  current_market_value: number | null
  management_company: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type CategoryGroup = 'income' | 'operating' | 'capital' | 'financing'

export interface TransactionCategoryRow {
  id: string
  category_key: string
  category_group: CategoryGroup
  label_he: string
  active: boolean
}

export interface TransactionRow {
  id: string
  property_id: string
  loan_id: string | null
  transaction_date: string
  category_id: string
  description: string | null
  amount: number
  currency: Currency
  is_income: boolean
  is_operating_expense: boolean
  is_capex: boolean
  is_financing: boolean
  vendor: string | null
  created_at: string
}

export type InterestType = 'fixed' | 'variable' | 'mixed' | 'unknown'
export type IndexationType = 'none' | 'CPI' | 'prime' | 'other' | 'unknown'

export interface LoanRow {
  id: string
  property_id: string
  lender: string
  loan_type: string | null
  original_principal: number
  current_balance: number
  balance_as_of: string
  currency: Currency
  interest_rate: number | null
  interest_type: InterestType
  indexation_type: IndexationType
  start_date: string | null
  maturity_date: string | null
  monthly_payment: number | null
  payment_frequency: 'monthly' | 'quarterly' | 'annual' | 'other'
  active: boolean
  notes: string | null
}

export interface FxRateRow {
  id: string
  rate_date: string
  from_currency: Currency
  to_currency: Currency
  rate: number
  source: 'manual' | 'api'
}

// configuration table is a plain key/value store (config_key text pk,
// config_value jsonb) — decoded into this shape by src/lib/dataApi/configuration.ts.
export interface PortfolioConfig {
  lease_alert_days: number
  insurance_alert_days: number
  loan_alert_days: number
  anomaly_multiplier: number
  minimum_anomaly_amount: number
  low_reserve_threshold: number
  default_reporting_period: string
}
