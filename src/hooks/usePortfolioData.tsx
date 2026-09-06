import { useCallback, useEffect, useMemo, useState } from 'react'
import { listActiveProperties } from '../lib/dataApi/properties'
import { listActiveLoans } from '../lib/dataApi/loans'
import { listTransactionsSince, listTransactionCategories } from '../lib/dataApi/transactions'
import { listFxRates } from '../lib/dataApi/fxRates'
import { getPortfolioConfig } from '../lib/dataApi/configuration'
import { aggregatePortfolio, computePropertyAttention, type PortfolioTotals, type PropertyAttention } from '../lib/finance'
import { daysAgoIso, firstOfCurrentMonthIso, todayIso } from '../lib/format'
import type { FxRateRow, LoanRow, PortfolioConfig, PropertyRow, TransactionCategoryRow, TransactionRow } from '../types/finance'

// 90-day recent window + 365-day historical baseline used by the attention
// rules engine (src/lib/finance/attention.ts) — fetch enough history to
// cover both, with a small safety margin.
const HISTORY_LOOKBACK_DAYS = 470

export interface PortfolioData {
  loading: boolean
  error: string | null
  properties: PropertyRow[]
  loans: LoanRow[]
  categories: TransactionCategoryRow[]
  fxRates: FxRateRow[]
  config: PortfolioConfig
  totals: PortfolioTotals
  attentionByProperty: Map<string, PropertyAttention>
  periodStart: string
  periodEnd: string
  refresh: () => void
}

const EMPTY_TOTAL = { total: 0, currency: 'ILS' as const, excluded: [] }
const EMPTY_TOTALS: PortfolioTotals = {
  totalValue: EMPTY_TOTAL,
  totalDebt: EMPTY_TOTAL,
  equity: null,
  income: EMPTY_TOTAL,
  operatingExpenses: EMPTY_TOTAL,
  noi: EMPTY_TOTAL,
  cashFlow: EMPTY_TOTAL,
}

const DEFAULT_CONFIG: PortfolioConfig = {
  lease_alert_days: 30,
  insurance_alert_days: 30,
  loan_alert_days: 60,
  anomaly_multiplier: 2,
  minimum_anomaly_amount: 500,
  low_reserve_threshold: 5000,
  default_reporting_period: 'monthly',
}

/**
 * Single place that loads everything the Dashboard needs and runs it
 * through the finance engine (src/lib/finance/**) — pages never call
 * supabase or the calculation functions directly, so there is exactly one
 * definition of "how the dashboard's numbers are produced" (Master Prompt §13).
 */
export function usePortfolioData(baseCurrency: 'ILS' | 'USD' = 'ILS'): PortfolioData {
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [categories, setCategories] = useState<TransactionCategoryRow[]>([])
  const [fxRates, setFxRates] = useState<FxRateRow[]>([])
  const [config, setConfig] = useState<PortfolioConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const today = todayIso()
  const periodStart = firstOfCurrentMonthIso()
  const periodEnd = today

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [propertiesRes, loansRes, txnsRes, categoriesRes, fxRes, configRes] = await Promise.all([
      listActiveProperties(),
      listActiveLoans(),
      listTransactionsSince(daysAgoIso(HISTORY_LOOKBACK_DAYS)),
      listTransactionCategories(),
      listFxRates(),
      getPortfolioConfig(),
    ])

    setProperties(propertiesRes.data)
    setLoans(loansRes.data)
    setTransactions(txnsRes.data)
    setCategories(categoriesRes.data)
    setFxRates(fxRes.data)
    setConfig(configRes.data ?? DEFAULT_CONFIG)

    const firstError = [propertiesRes.error, loansRes.error, txnsRes.error, categoriesRes.error, fxRes.error, configRes.error].find(
      (e) => e != null
    )
    setError(firstError ?? null)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo<PortfolioTotals>(() => {
    if (properties.length === 0) return EMPTY_TOTALS
    return aggregatePortfolio({
      properties,
      loans,
      transactions,
      fxRates,
      periodStart,
      periodEnd,
      today,
      baseCurrency,
    })
  }, [properties, loans, transactions, fxRates, periodStart, periodEnd, today, baseCurrency])

  const attentionByProperty = useMemo(() => {
    const map = new Map<string, PropertyAttention>()
    for (const property of properties) {
      const propertyLoans = loans.filter((l) => l.property_id === property.id)
      const propertyTxns = transactions.filter((t) => t.property_id === property.id)
      map.set(property.id, computePropertyAttention(property, propertyLoans, propertyTxns, config, today))
    }
    return map
  }, [properties, loans, transactions, config, today])

  return {
    loading,
    error,
    properties,
    loans,
    categories,
    fxRates,
    config,
    totals,
    attentionByProperty,
    periodStart,
    periodEnd,
    refresh: () => setNonce((n) => n + 1),
  }
}
