import { supabase } from '../supabaseClient'
import type { LoanRow } from '../../types/finance'
import { toHumanError } from './errors'

const LOAN_COLUMNS =
  'id, property_id, lender, loan_type, original_principal, current_balance, balance_as_of, currency, interest_rate, interest_type, indexation_type, start_date, maturity_date, monthly_payment, payment_frequency, active, notes'

export async function listActiveLoans(): Promise<{ data: LoanRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }

  const { data, error } = await supabase.from('loans').select(LOAN_COLUMNS).eq('active', true)
  if (error) {
    return { data: [], error: toHumanError(error, 'לא הצלחנו לטעון את נתוני ההלוואות') }
  }
  return { data: (data as LoanRow[]) ?? [], error: null }
}

export interface NewLoanInput {
  property_id: string
  lender: string
  original_principal: number
  current_balance: number
  balance_as_of: string
  currency: LoanRow['currency']
  maturity_date?: string
  monthly_payment?: number
}

export async function createLoan(input: NewLoanInput): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'המערכת אינה מוגדרת כראוי.' }

  const { error } = await supabase.from('loans').insert({
    property_id: input.property_id,
    lender: input.lender,
    original_principal: input.original_principal,
    current_balance: input.current_balance,
    balance_as_of: input.balance_as_of,
    currency: input.currency,
    maturity_date: input.maturity_date || null,
    monthly_payment: input.monthly_payment ?? null,
  })

  if (error) {
    return { error: toHumanError(error, 'לא הצלחנו לשמור את ההלוואה') }
  }
  return { error: null }
}
