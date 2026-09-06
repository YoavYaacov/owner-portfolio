import type { Currency, FxRateRow, LoanRow, PropertyRow, TransactionRow } from '../../types/finance'
import { convertAmount } from './fx'
import { computeNOI } from './noi'
import { computeCashFlowAfterDebtService } from './cashFlow'

export interface ExcludedProperty {
  propertyId: string
  propertyName: string
  reason: string
}

/**
 * A portfolio-level total that is honest about partial data (Master Prompt
 * §6 / SRS §39): `total` sums only the properties that had everything
 * needed (a value/figure + a usable FX rate). Any property that could not
 * be included is named explicitly in `excluded`, so the UI can show
 * "₪X (לא כולל 1 נכס שחסר בו מידע)" instead of either a silently-wrong
 * total or refusing to show anything at all.
 */
export interface AggregateTotal {
  total: number
  currency: Currency
  excluded: ExcludedProperty[]
}

export interface PortfolioTotals {
  totalValue: AggregateTotal
  totalDebt: AggregateTotal
  equity: { value: number; currency: Currency } | null
  income: AggregateTotal
  operatingExpenses: AggregateTotal
  noi: AggregateTotal
  cashFlow: AggregateTotal
}

function emptyTotal(currency: Currency): AggregateTotal {
  return { total: 0, currency, excluded: [] }
}

export interface AggregatePortfolioInput {
  properties: PropertyRow[]
  loans: LoanRow[]
  transactions: TransactionRow[]
  fxRates: FxRateRow[]
  periodStart: string
  periodEnd: string
  today: string
  baseCurrency: Currency
}

export function aggregatePortfolio(input: AggregatePortfolioInput): PortfolioTotals {
  const { properties, loans, transactions, fxRates, periodStart, periodEnd, today, baseCurrency } = input
  const activeProperties = properties.filter((p) => p.active)

  const totalValue = emptyTotal(baseCurrency)
  const totalDebt = emptyTotal(baseCurrency)
  const income = emptyTotal(baseCurrency)
  const operatingExpenses = emptyTotal(baseCurrency)
  const noiTotal = emptyTotal(baseCurrency)
  const cashFlowTotal = emptyTotal(baseCurrency)

  for (const property of activeProperties) {
    // --- Value ---
    if (property.current_market_value == null) {
      totalValue.excluded.push({
        propertyId: property.id,
        propertyName: property.name,
        reason: 'חסר שווי עדכני',
      })
    } else {
      const converted = convertAmount(property.current_market_value, property.default_currency, baseCurrency, today, fxRates)
      if (converted.ok) totalValue.total += converted.value
      else
        totalValue.excluded.push({
          propertyId: property.id,
          propertyName: property.name,
          reason: converted.reason,
        })
    }

    // --- Debt (sum of active loan current_balance for this property) ---
    const propertyLoans = loans.filter((l) => l.property_id === property.id && l.active)
    if (propertyLoans.length === 0) {
      // Legitimately zero debt — not excluded, nothing to convert.
    } else {
      let propertyDebt = 0
      let allConverted = true
      for (const loan of propertyLoans) {
        const converted = convertAmount(loan.current_balance, loan.currency, baseCurrency, loan.balance_as_of, fxRates)
        if (!converted.ok) {
          allConverted = false
          totalDebt.excluded.push({ propertyId: property.id, propertyName: property.name, reason: converted.reason })
          break
        }
        propertyDebt += converted.value
      }
      if (allConverted) totalDebt.total += propertyDebt
    }

    // --- Income / operating expenses / NOI for the period ---
    const propertyTxns = transactions.filter((t) => t.property_id === property.id)
    const noiResult = computeNOI(propertyTxns, periodStart, periodEnd, baseCurrency, fxRates)
    if (noiResult.ok) {
      income.total += noiResult.value.income
      operatingExpenses.total += noiResult.value.operatingExpenses
      noiTotal.total += noiResult.value.noi

      const cashFlowResult = computeCashFlowAfterDebtService(
        noiResult.value.noi,
        propertyTxns,
        propertyLoans,
        periodStart,
        periodEnd,
        baseCurrency,
        fxRates
      )
      if (cashFlowResult.ok) {
        cashFlowTotal.total += cashFlowResult.value.cashFlow
      } else {
        cashFlowTotal.excluded.push({ propertyId: property.id, propertyName: property.name, reason: cashFlowResult.reason })
      }
    } else {
      income.excluded.push({ propertyId: property.id, propertyName: property.name, reason: noiResult.reason })
      operatingExpenses.excluded.push({ propertyId: property.id, propertyName: property.name, reason: noiResult.reason })
      noiTotal.excluded.push({ propertyId: property.id, propertyName: property.name, reason: noiResult.reason })
      cashFlowTotal.excluded.push({ propertyId: property.id, propertyName: property.name, reason: noiResult.reason })
    }
  }

  const equity =
    totalValue.excluded.length === 0 && totalDebt.excluded.length === 0
      ? { value: totalValue.total - totalDebt.total, currency: baseCurrency }
      : null

  return {
    totalValue,
    totalDebt,
    equity,
    income,
    operatingExpenses,
    noi: noiTotal,
    cashFlow: cashFlowTotal,
  }
}
