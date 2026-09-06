import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import FormField from '../components/FormField'
import SelectField from '../components/SelectField'
import EmptyState from '../components/EmptyState'
import { listActiveProperties } from '../lib/dataApi/properties'
import { createTransaction, listTransactionCategories } from '../lib/dataApi/transactions'
import { todayIso } from '../lib/format'
import { validatePositiveAmount, validateRequiredDate, validateRequiredText } from '../lib/validation'
import type { Currency, PropertyRow, TransactionCategoryRow } from '../types/finance'

const GROUP_LABELS: Record<TransactionCategoryRow['category_group'], string> = {
  income: 'הכנסות',
  operating: 'הוצאות תפעול',
  capital: 'השקעות הוניות (CapEx)',
  financing: 'מימון',
}

export default function AddTransactionPage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState<PropertyRow[] | null>(null)
  const [categories, setCategories] = useState<TransactionCategoryRow[] | null>(null)

  const [propertyId, setPropertyId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transactionDate, setTransactionDate] = useState(todayIso())
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('ILS')
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')

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
    listTransactionCategories().then((res) => setCategories(res.data))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const checks = {
      propertyId: validateRequiredText(propertyId, 'נכס'),
      categoryId: validateRequiredText(categoryId, 'קטגוריה'),
      transactionDate: validateRequiredDate(transactionDate, 'תאריך'),
      amount: validatePositiveAmount(amount, 'סכום'),
    }
    const nextErrors: Record<string, string> = {}
    for (const [key, result] of Object.entries(checks)) {
      if (!result.valid) nextErrors[key] = result.message!
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setServerError(null)
    const { error } = await createTransaction({
      property_id: propertyId,
      category_id: categoryId,
      transaction_date: transactionDate,
      amount: Number(amount),
      currency,
      description: description || undefined,
      vendor: vendor || undefined,
    })
    setSaving(false)

    if (error) {
      setServerError(error)
      return
    }
    navigate('/dashboard')
  }

  if (properties === null || categories === null) {
    return (
      <AppShell>
        <div className="spinner-label">טוען…</div>
      </AppShell>
    )
  }

  if (properties.length === 0) {
    return (
      <AppShell>
        <EmptyState message="כדי להוסיף תנועה, קודם צריך להוסיף נכס." actionLabel="הוספת נכס" actionTo="/properties/new" />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <h2 className="section-title">הוספת תנועה פיננסית</h2>
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

        <SelectField
          id="categoryId"
          label="קטגוריה"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: `${GROUP_LABELS[c.category_group]} — ${c.label_he}` }))}
          placeholder="בחר/י קטגוריה"
          error={errors.categoryId}
          required
        />

        <FormField id="transactionDate" label="תאריך" type="date" value={transactionDate} onChange={setTransactionDate} error={errors.transactionDate} required />

        <FormField id="amount" label="סכום" type="number" value={amount} onChange={setAmount} error={errors.amount} required />

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

        <FormField id="vendor" label="ספק / גורם" value={vendor} onChange={setVendor} helperText="לא חובה" />

        <FormField id="description" label="הערה" value={description} onChange={setDescription} helperText="לא חובה" />

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'שומר…' : 'שמירת תנועה'}
        </button>
      </form>
    </AppShell>
  )
}
