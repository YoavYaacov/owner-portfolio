import { supabase } from '../supabaseClient'
import type { TransactionCategoryRow, TransactionRow } from '../../types/finance'
import { toHumanError } from './errors'

const TRANSACTION_COLUMNS =
  'id, property_id, loan_id, transaction_date, category_id, description, amount, currency, is_income, is_operating_expense, is_capex, is_financing, vendor, created_at'

export async function listTransactionsInRange(
  periodStart: string,
  periodEnd: string
): Promise<{ data: TransactionRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }

  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_COLUMNS)
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd)
    .order('transaction_date', { ascending: false })

  if (error) {
    return { data: [], error: toHumanError(error, 'לא הצלחנו לטעון את נתוני התנועות הפיננסיות') }
  }
  return { data: (data as TransactionRow[]) ?? [], error: null }
}

/**
 * Wider window used to build the trailing-12-month baseline the attention
 * rules engine needs for anomaly detection (src/lib/finance/attention.ts) —
 * kept as a separate call so the dashboard's main period query stays small.
 */
export async function listTransactionsSince(
  sinceDate: string
): Promise<{ data: TransactionRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }

  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_COLUMNS)
    .gte('transaction_date', sinceDate)
    .order('transaction_date', { ascending: false })

  if (error) {
    return { data: [], error: toHumanError(error, 'לא הצלחנו לטעון את היסטוריית התנועות') }
  }
  return { data: (data as TransactionRow[]) ?? [], error: null }
}

export async function listTransactionCategories(): Promise<{ data: TransactionCategoryRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }

  const { data, error } = await supabase
    .from('transaction_categories')
    .select('id, category_key, category_group, label_he, active')
    .eq('active', true)
    .order('category_group', { ascending: true })

  if (error) {
    return { data: [], error: toHumanError(error, 'לא הצלחנו לטעון את רשימת קטגוריות התנועות') }
  }
  return { data: (data as TransactionCategoryRow[]) ?? [], error: null }
}

export interface NewTransactionInput {
  property_id: string
  loan_id?: string
  transaction_date: string
  category_id: string
  description?: string
  amount: number
  currency: TransactionRow['currency']
  vendor?: string
}

export async function createTransaction(input: NewTransactionInput): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'המערכת אינה מוגדרת כראוי.' }

  const { error } = await supabase.from('transactions').insert({
    property_id: input.property_id,
    loan_id: input.loan_id || null,
    transaction_date: input.transaction_date,
    category_id: input.category_id,
    description: input.description || null,
    amount: input.amount,
    currency: input.currency,
    vendor: input.vendor || null,
    source: 'manual',
  })

  if (error) {
    return { error: toHumanError(error, 'לא הצלחנו לשמור את התנועה') }
  }
  return { error: null }
}
