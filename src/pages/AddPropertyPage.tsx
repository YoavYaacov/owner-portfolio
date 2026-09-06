import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import FormField from '../components/FormField'
import SelectField from '../components/SelectField'
import { createProperty } from '../lib/dataApi/properties'
import { COUNTRY_OPTIONS, PROPERTY_STAGE_LABELS, PROPERTY_TYPE_LABELS, toOptions } from '../lib/labels'
import { validatePositiveAmount, validateRequiredText } from '../lib/validation'
import type { Currency, PropertyStage, PropertyType } from '../types/finance'

const CURRENCY_BY_COUNTRY: Record<string, Currency> = { IL: 'ILS', US: 'USD' }

export default function AddPropertyPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('IL')
  const [currency, setCurrency] = useState<Currency>('ILS')
  const [city, setCity] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment')
  const [propertyStage, setPropertyStage] = useState<PropertyStage>('operating')
  const [marketValue, setMarketValue] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleCountryChange = (value: string) => {
    setCountry(value)
    if (CURRENCY_BY_COUNTRY[value]) setCurrency(CURRENCY_BY_COUNTRY[value])
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return // double-submit prevention (SRS §19/§36)

    const nameCheck = validateRequiredText(name, 'שם הנכס')
    const valueCheck = marketValue ? validatePositiveAmount(marketValue, 'שווי הנכס') : { valid: true }
    const nextErrors: Record<string, string> = {}
    if (!nameCheck.valid) nextErrors.name = nameCheck.message!
    if (!valueCheck.valid) nextErrors.marketValue = valueCheck.message!
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setServerError(null)
    const { data, error } = await createProperty({
      name,
      country,
      city: city || undefined,
      default_currency: currency,
      property_type: propertyType,
      property_stage: propertyStage,
      current_market_value: marketValue ? Number(marketValue) : undefined,
    })
    setSaving(false)

    if (error || !data) {
      setServerError(error ?? 'לא הצלחנו לשמור את הנכס.')
      return
    }
    navigate('/properties')
  }

  return (
    <AppShell>
      <h2 className="section-title">הוספת נכס</h2>
      <form className="entry-form" onSubmit={handleSubmit} noValidate>
        {serverError ? <div className="banner banner-critical">{serverError}</div> : null}

        <FormField id="name" label="שם הנכס" value={name} onChange={setName} error={errors.name} required helperText="שם מזהה קצר, לדוגמה: הדירה ברחוב הרצל" />

        <SelectField id="country" label="מדינה" value={country} onChange={handleCountryChange} options={COUNTRY_OPTIONS} required />

        <FormField id="city" label="עיר" value={city} onChange={setCity} helperText="לא חובה" />

        <SelectField
          id="propertyType"
          label="סוג הנכס"
          value={propertyType}
          onChange={(v) => setPropertyType(v as PropertyType)}
          options={toOptions(PROPERTY_TYPE_LABELS)}
          required
        />

        <SelectField
          id="propertyStage"
          label="שלב"
          value={propertyStage}
          onChange={(v) => setPropertyStage(v as PropertyStage)}
          options={toOptions(PROPERTY_STAGE_LABELS)}
          required
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
          helperText="נבחר אוטומטית לפי המדינה, וניתן לשינוי"
        />

        <FormField
          id="marketValue"
          label="שווי שוק עדכני"
          type="number"
          value={marketValue}
          onChange={setMarketValue}
          error={errors.marketValue}
          helperText="לא חובה כרגע — אפשר להוסיף/לעדכן מאוחר יותר. אם מוזן, יישמר גם בהיסטוריית השווי."
        />

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר…' : 'שמירת נכס'}
        </button>
      </form>
    </AppShell>
  )
}
