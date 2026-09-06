import type { Currency, PropertyStage, PropertyType } from '../types/finance'

// Centralized Hebrew labels for the enums defined in the DB CHECK
// constraints (SRS §9) — one definition, reused by every select/table/badge
// that needs to display them (Master Prompt §13's spirit applied to labels).

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'דירה',
  single_family_home: 'בית משפחתי (Single Family Home)',
  private_house: 'בית פרטי',
  vacant_land: 'קרקע',
  commercial: 'מסחרי',
  other: 'אחר',
}

export const PROPERTY_STAGE_LABELS: Record<PropertyStage, string> = {
  planned: 'על הנייר',
  under_construction: 'בבנייה',
  operating: 'פעיל / מניב',
  vacant: 'ריק',
  urban_renewal: 'פינוי-בינוי / התחדשות עירונית',
  renovation: 'בשיפוץ',
  sold: 'נמכר',
  inactive: 'לא פעיל',
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  ILS: 'שקל חדש (₪)',
  USD: 'דולר ארה"ב ($)',
}

export const COUNTRY_OPTIONS = [
  { value: 'IL', label: 'ישראל' },
  { value: 'US', label: 'ארצות הברית' },
]

export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}
