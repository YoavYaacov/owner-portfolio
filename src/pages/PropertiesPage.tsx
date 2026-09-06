import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import { listActiveProperties } from '../lib/dataApi/properties'
import { formatCurrency } from '../lib/format'
import { PROPERTY_STAGE_LABELS, PROPERTY_TYPE_LABELS } from '../lib/labels'
import type { PropertyRow } from '../types/finance'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listActiveProperties().then((res) => {
      if (!active) return
      setProperties(res.data)
      setError(res.error)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <AppShell>
      <div className="dashboard-toolbar">
        <Link className="btn-link" to="/dashboard">
          חזרה ל-Dashboard
        </Link>
        <Link className="btn btn-primary btn-inline" to="/properties/new">
          הוספת נכס
        </Link>
      </div>
      <h2 className="section-title">הנכסים שלי</h2>

      {error ? <div className="banner banner-critical">{error}</div> : null}

      {properties === null ? (
        <div className="spinner-label">טוען…</div>
      ) : properties.length === 0 ? (
        <EmptyState message="עדיין לא נוסף אף נכס." actionLabel="הוספת נכס ראשון" actionTo="/properties/new" />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">שם</th>
                <th scope="col">סוג</th>
                <th scope="col">שלב</th>
                <th scope="col">מדינה</th>
                <th scope="col">שווי עדכני</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{PROPERTY_TYPE_LABELS[p.property_type]}</td>
                  <td>{PROPERTY_STAGE_LABELS[p.property_stage]}</td>
                  <td>{p.country}</td>
                  <td>{p.current_market_value != null ? formatCurrency(p.current_market_value, p.default_currency) : 'לא ידוע'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
