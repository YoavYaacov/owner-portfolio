import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import FormField from '../components/FormField'
import SelectField from '../components/SelectField'
import { createFxRate } from '../lib/dataApi/fxRates'
import { todayIso } from '../lib/format'
import { validatePositiveAmount, validateRequiredDate } from '../lib/validation'
import type { Currency } from '../types/finance'

/**
 * Manual FX rate entry (ADR-024). Portfolio value/debt/equity totals that
 * mix ILS and USD properties cannot be computed without at least one rate
 * here — see the "לא כולל..." note on the Dashboard when one is missing.
 */
export default function AddFxRatePage() {
  const navigate = useNavigate()
  const [rateDate, setRateDate] = useState(todayIso())
  const [fromCurrency, setFromCurrency] = useState<Currency>('USD')
  const [toCurrency, setToCurrency] = useState<Currency>('ILS')
  const [rate, setRate] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const checks = {
      rateDate: validateRequiredDate(rateDate, 'תאריך'),
      rate: validatePositiveAmount(rate, 'שער ההמרה'),
    }
    const nextErrors: Record<string, string> = {}
    for (const [key, result] of Object.entries(checks)) {
      if (!result.valid) nextErrors[key] = result.message!
    }
    if (fromCurrency === toCurrency) nextErrors.toCurrency = 'יש לבחור שני מטבעות שונים.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setServerError(null)
    setSaved(false)
    const { error } = await createFxRate({ rate_date: rateDate, from_currency: fromCurrency, to_currency: toCurrency, rate: Number(rate) })
    setSaving(false)

    if (error) {
      setServerError(error)
      return
    }
    setSaved(true)
  }

  return (
    <AppShell>
      <h2 className="section-title">הוספת שער המרה</h2>
      <p className="section-subtitle">
        נדרש כדי לחשב שווי/חוב/הון עצמי כוללים כאשר הפורטפוליו כולל גם נכסים ב-₪ וגם ב-$.
      </p>
      <form className="entry-form" onSubmit={handleSubmit} noValidate>
        {serverError ? <div className="banner banner-critical">{serverError}</div> : null}
        {saved ? (
          <div className="banner banner-good">
            <span>שער ההמרה נשמר בהצלחה.</span>
          </div>
        ) : null}

        <FormField id="rateDate" label="תאריך השער" type="date" value={rateDate} onChange={setRateDate} error={errors.rateDate} required />

        <SelectField
          id="fromCurrency"
          label="ממטבע"
          value={fromCurrency}
          onChange={(v) => setFromCurrency(v as Currency)}
          options={[
            { value: 'USD', label: 'דולר ארה"ב ($)' },
            { value: 'ILS', label: 'שקל חדש (₪)' },
          ]}
          required
        />

        <SelectField
          id="toCurrency"
          label="למטבע"
          value={toCurrency}
          onChange={(v) => setToCurrency(v as Currency)}
          options={[
            { value: 'ILS', label: 'שקל חדש (₪)' },
            { value: 'USD', label: 'דולר ארה"ב ($)' },
          ]}
          error={errors.toCurrency}
          required
        />

        <FormField
          id="rate"
          label="שער (כמה יחידות של 'למטבע' עבור יחידה אחת של 'ממטבע')"
          type="number"
          value={rate}
          onChange={setRate}
          error={errors.rate}
          required
          helperText="לדוגמה: אם דולר אחד שווה 3.70 ₪, הזן 3.70"
        />

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר…' : 'שמירת שער'}
        </button>
        {saved ? (
          <button type="button" className="btn-link" style={{ marginTop: 12 }} onClick={() => navigate('/dashboard')}>
            חזרה ל-Dashboard
          </button>
        ) : null}
      </form>
    </AppShell>
  )
}
