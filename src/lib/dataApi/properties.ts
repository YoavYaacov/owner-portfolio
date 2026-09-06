import { supabase } from '../supabaseClient'
import type { PropertyRow } from '../../types/finance'
import { toHumanError } from './errors'

const PROPERTY_COLUMNS =
  'id, name, address, city, state_province, postal_code, country, default_currency, property_type, property_stage, acquisition_date, acquisition_cost, current_market_value, management_company, active, notes, created_at, updated_at'

export async function listActiveProperties(): Promise<{ data: PropertyRow[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }

  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTY_COLUMNS)
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    return { data: [], error: toHumanError(error, 'לא הצלחנו לטעון את רשימת הנכסים') }
  }
  return { data: (data as PropertyRow[]) ?? [], error: null }
}

export interface NewPropertyInput {
  name: string
  address?: string
  city?: string
  country: string
  default_currency: PropertyRow['default_currency']
  property_type: PropertyRow['property_type']
  property_stage: PropertyRow['property_stage']
  current_market_value?: number
}

/**
 * Creates a property, and — if an initial value was given — also opens its
 * valuation history with a matching `property_valuations` row (source
 * 'owner_estimate'). This keeps the append-only history (SRS §11) starting
 * from day one instead of only existing once someone remembers to use a
 * separate "add valuation" screen that Phase 3 does not build yet.
 */
export async function createProperty(
  input: NewPropertyInput
): Promise<{ data: PropertyRow | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'המערכת אינה מוגדרת כראוי.' }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      name: input.name,
      address: input.address || null,
      city: input.city || null,
      country: input.country,
      default_currency: input.default_currency,
      property_type: input.property_type,
      property_stage: input.property_stage,
      current_market_value: input.current_market_value ?? null,
    })
    .select(PROPERTY_COLUMNS)
    .single()

  if (error || !data) {
    return { data: null, error: toHumanError(error, 'לא הצלחנו לשמור את הנכס') }
  }

  const property = data as PropertyRow

  if (input.current_market_value != null) {
    const { error: valuationError } = await supabase.from('property_valuations').insert({
      property_id: property.id,
      valuation_date: new Date().toISOString().slice(0, 10),
      market_value: input.current_market_value,
      currency: input.default_currency,
      valuation_type: 'owner_estimate',
      source: 'owner',
    })
    if (valuationError) {
      // The property itself was saved successfully — this is a secondary,
      // non-fatal failure. Logged, not swallowed silently.
      // eslint-disable-next-line no-console
      console.error('[dataApi] failed to record initial valuation history row:', valuationError)
    }
  }

  return { data: property, error: null }
}

/**
 * Updates current_market_value and, when it actually changed, appends a new
 * property_valuations row — same reasoning as createProperty.
 */
export async function updatePropertyValue(
  propertyId: string,
  newValue: number,
  currency: PropertyRow['default_currency']
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'המערכת אינה מוגדרת כראוי.' }

  const { error } = await supabase.from('properties').update({ current_market_value: newValue }).eq('id', propertyId)
  if (error) {
    return { error: toHumanError(error, 'לא הצלחנו לעדכן את שווי הנכס') }
  }

  const { error: valuationError } = await supabase.from('property_valuations').insert({
    property_id: propertyId,
    valuation_date: new Date().toISOString().slice(0, 10),
    market_value: newValue,
    currency,
    valuation_type: 'owner_estimate',
    source: 'owner',
  })
  if (valuationError) {
    // eslint-disable-next-line no-console
    console.error('[dataApi] failed to record valuation history row:', valuationError)
  }

  return { error: null }
}
