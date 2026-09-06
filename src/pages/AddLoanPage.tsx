import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import FormField from '../components/FormField'
import SelectField from '../components/SelectField'
import EmptyState from '../components/EmptyState'
import { listActiveProperties } from '../lib/dataApi/properties'
import { createLoan } from '../lib/dataApi/loans'
import { todayIso } from '../lib/format'
import { validatePositiveAmount, validateRequiredDate, validateRequiredText } from '../lib/validation'
import type { Currency, PropertyRow } from '../types/finance'

export default function AddLoanPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState<PropertyRow[] | null>(null)

  const [propertyId, setPropertyId] = useState('')
  const [lender, setLender] = useState('')
  const [originalPrincipal, setOriginalPrincipal] = useState('')
  const [currentBalance, setCurrentBalance] = useState('')
  const [balanceAsOf, setBalanceAsOf] = useState(todayIso())
  const [currency, setCurrency] = useState<Currency>('ILS')
  const [maturityDate, setMaturityDate] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    listActiveProperties().then((res) => {
      setProperties(res.data)
      if (res.data.length > 0) {
        setPropertyId(res.data[0].id)
        setCurrency(res.data[0].default_currency)
      }
    })
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const checks = {
      propertyId: validateRequiredText(propertyId, 'נכס'),
      lender: validateRequiredText(lender, 'שם הגורם המלווה'),
      originalPrincipal: validatePositiveAmount(originalPrincipal, 'סכום ההלוואה המקורי'),
      currentBalance: validatePositiveAmount(currentBalance, 'יתרת ההלוואה הנוכחית'),
      balanceAsOf: validateRequiredDate(balanceAsOf, 'תאריך היתרה'),
    }
    const nextErrors: Record<string, string> = {}
    for (const [key, result] of Object.entries(checks)) {
      if (!result.valid) nextErrors[key] = result.message!
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setServerError(null)
    const { error } = await createLoan({
      property_id: propertyId,
      lender,
      original_principal: Number(originalPrincipal),
      current_balance: Number(currentBalance),
      balance_as_of: balanceAsOf,
      currency,
      maturity_date: maturityDate || undefined,
      monthly_payment: monthlyPayment ? Number(monthlyPayment) : undefined,
    })
    setSaving(false)

    if (error) {
      setServerError(error)
      return
    }
    navigate('/dashboard')
  }

  if (properties === null) {
    return (
      <AppShell>
        <div className="spinner-label">טוען…</div>
      </AppShell>
    )
  }

  if (properties.length === 0) {
    return (
      <AppShell>
        <EmptyState message="כדי להוסיף הלוואה, קודם צריך להוסיף נכס." actionLabel="הוספת נכס" actionTo="/properties/new" />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <h2 className="section-title">הוספת הלוואה</h2>
      <form className="entry-form" onSubmit={handleSubmit} noValidate>
        {serverError ? <div className="banner banner-critical">{serverError}</div> : null}

        <SelectField
          id="propertyId"
          label="נכס"
          value={propertyId}
          onChange={(v) => {
            setPropertyId(v)
            const p = properties.find((pr) => pr.id === v)
            if (p) setCurrency(p.default_currency)
          }}
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          error={errors.propertyId}
          required
        />

        <FormField id="lender" label="גורם מלווה" value={lender} onChange={setLender} error={errors.lender} required helperText="לדוגמה: בנק הפועלים" />

        <FormField
          id="originalPrincipal"
          label="סכום ההלוואה המקורי"
          type="number"
          value={originalPrincipal}
          onChange={setOriginalPrincipal}
          error={errors.originalPrincipal}
          required
        />

        <FormField
          id="currentBalance"
          label="יתרת ההלוואה הנוכחית"
          type="number"
          value={currentBalance}
          onChange={setCurrentBalance}
          error={errors.currentBalance}
          required
        />

        <FormField
          id="balanceAsOf"
          label="נכון לתאריך"
          type="date"
          value={balanceAsOf}
          onChange={setBalanceAsOf}
          error={errors.balanceAsOf}
          required
          helperText="מתי עודכנה היתרה לאחרונה — כדי שתמיד נדע כמה 'טרי' הנתון"
        />

        <SelectField
          id="currency"
          label="מטבע"
          value={currency}
          onChange={(v) => setCurrency(v as Currency)}
          options={[
            { value: 'ILS', label: 'שקל חדש (₪)' },
            { value: 'USD', label: 'דולר ארה"ב ($)' },
          ]}
          required
        />

        <FormField id="maturityDate" label="תאריך פדיון" type="date" value={maturityDate} onChange={setMaturityDate} helperText="לא חובה" />

        <FormField
          id="monthlyPayment"
          label="תשלום חודשי (אומדן)"
          type="number"
          value={monthlyPayment}
          onChange={setMonthlyPayment}
          helperText="אומדן בלבד לתצוגה — תזרים בפועל מחושב מתנועות מימון שנרשמות בפועל"
        />

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר…' : 'שמירת הלוואה'}
        </button>
      </form>
    </AppShell>
  )
}
