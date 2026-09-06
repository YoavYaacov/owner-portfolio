import type { Currency } from '../types/finance'

// Centralized formatting (Master Prompt §4/§19 — Currency/Units must always
// be clear; he-IL locale throughout, per SRS §4).
const CURRENCY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  ILS: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
}

export function formatCurrency(amount: number, currency: Currency): string {
  return CURRENCY_FORMATTERS[currency].format(amount)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

const DATE_FORMATTER = new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })

export function formatDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(isoDate))
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function firstOfCurrentMonthIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}
