import { supabase } from '../supabaseClient'
import type { FxRateRow } from '../../types/finance'
import { toHumanError } from './errors'

export async function listFxRates(): Promise<{ data: FxRateRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }

  const { data, error } = await supabase
    .from('fx_rates')
    .select('id, rate_date, from_currency, to_currency, rate, source')
    .order('rate_date', { ascending: false })

  if (error) {
    return { data: [], error: toHumanError(error, 'לא הצלחנו לטעון את שערי ההמרה') }
  }
  return { data: (data as FxRateRow[]) ?? [], error: null }
}

export interface NewFxRateInput {
  rate_date: string
  from_currency: FxRateRow['from_currency']
  to_currency: FxRateRow['to_currency']
  rate: number
}

/**
 * Manual FX entry (ADR-024). Kept as a real screen rather than "ask the
 * user to run SQL" — Master Prompt §58 expects the owner to update data
 * without technical guidance, and a portfolio that genuinely holds both
 * ILS and USD needs this to be at least as easy as adding a transaction.
 */
export async function createFxRate(input: NewFxRateInput): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'המערכת אינה מוגדרת כראוי.' }

  const { error } = await supabase.from('fx_rates').upsert(
    {
      rate_date: input.rate_date,
      from_currency: input.from_currency,
      to_currency: input.to_currency,
      rate: input.rate,
      source: 'manual',
    },
    { onConflict: 'rate_date,from_currency,to_currency' }
  )

  if (error) {
    return { error: toHumanError(error, 'לא הצלחנו לשמור את שער ההמרה') }
  }
  return { error: null }
}
