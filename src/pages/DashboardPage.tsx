import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import StatCard from '../components/StatCard'
import AttentionBadge from '../components/AttentionBadge'
import EmptyState from '../components/EmptyState'
import { usePortfolioData } from '../hooks/usePortfolioData'
import { formatCurrency, formatDate } from '../lib/format'
import type { AggregateTotal } from '../lib/finance'

/** Renders one aggregate figure, honestly disclosing partial data instead
 * of a silently-wrong total (Master Prompt §6, SRS §38/§39). */
function totalNote(total: AggregateTotal): string | null {
  if (total.excluded.length === 0) return null
  const names = total.excluded.map((e) => e.propertyName).join(', ')
  return `לא כולל ${total.excluded.length} נכס/ים שחסר בהם מידע: ${names}`
}

export default function DashboardPage() {
  const {
    loading,
    error,
    properties,
    totals,
    attentionByProperty,
    periodStart,
    periodEnd,
  } = usePortfolioData('ILS')

  if (loading) {
    return (
      <AppShell>
        <div className="spinner-label">טוען נתוני פורטפוליו…</div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="banner banner-critical">
          <span>{error}</span>
        </div>
      </AppShell>
    )
  }

  if (properties.length === 0) {
    return (
      <AppShell>
        <EmptyState
          message="עדיין לא נוסף אף נכס לפורטפוליו. כדי לראות כאן שווי, חוב, NOI ותזרים אמיתיים — קודם צריך להוסיף נכס אחד לפחות."
          actionLabel="הוספת נכס ראשון"
          actionTo="/properties/new"
        />
      </AppShell>
    )
  }

  const attentionEntries = properties
    .map((p) => ({ property: p, attention: attentionByProperty.get(p.id) }))
    .filter((e) => e.attention && e.attention.status !== 'good')
    .sort((a, b) => {
      const rank = { critical: 0, attention: 1, insufficient_data: 2, good: 3 } as const
      return rank[a.attention!.status] - rank[b.attention!.status]
    })

  return (
    <AppShell>
      <div className="dashboard-toolbar">
        <div className="dashboard-toolbar__links">
          <Link className="btn-link" to="/properties">
            הנכסים שלי
          </Link>
          <Link className="btn-link" to="/transactions/new">
            הוספת תנועה
          </Link>
          <Link className="btn-link" to="/loans/new">
            הוספת הלוואה
          </Link>
          <Link className="btn-link" to="/fx-rates/new">
            הוספת שער המרה
          </Link>
        </div>
      </div>

      <section aria-labelledby="section-overview">
        <h2 id="section-overview" className="section-title">
          מצב כללי
        </h2>
        <p className="section-subtitle">
          נתוני הכנסות/הוצאות/NOI/תזרים הם עבור התקופה {formatDate(periodStart)} – {formatDate(periodEnd)} (חודש נוכחי, עד היום).
        </p>
        <div className="stat-grid">
          <StatCard
            label="שווי פורטפוליו"
            explanation="הסכום הכולל של שווי השוק העדכני של כל הנכסים הפעילים בפורטפוליו."
            value={formatCurrency(totals.totalValue.total, totals.totalValue.currency)}
            note={totalNote(totals.totalValue)}
          />
          <StatCard
            label="חוב כולל"
            explanation="יתרת החוב הפעילה על כל ההלוואות בפורטפוליו, נכון לתאריך העדכון האחרון של כל הלוואה."
            value={formatCurrency(totals.totalDebt.total, totals.totalDebt.currency)}
            note={totalNote(totals.totalDebt)}
          />
          <StatCard
            label="הון עצמי (Equity)"
            explanation="שווי הפורטפוליו פחות החוב הכולל. מוצג רק כאשר גם השווי וגם החוב ידועים במלואם."
            value={totals.equity ? formatCurrency(totals.equity.value, totals.equity.currency) : 'לא ניתן לחשב — חסר מידע בשווי או בחוב'}
            tone={totals.equity ? 'neutral' : 'attention'}
          />
          <StatCard
            label="הכנסות (החודש)"
            explanation="סך כל ההכנסות שנרשמו בתקופה הנוכחית, מכל הנכסים."
            value={formatCurrency(totals.income.total, totals.income.currency)}
            note={totalNote(totals.income)}
          />
          <StatCard
            label="הוצאות תפעול (החודש)"
            explanation="סך ההוצאות התפעוליות השוטפות (לא כולל השקעות הוניות ותשלומי מימון) שנרשמו בתקופה הנוכחית."
            value={formatCurrency(totals.operatingExpenses.total, totals.operatingExpenses.currency)}
            note={totalNote(totals.operatingExpenses)}
          />
          <StatCard
            label="הכנסה תפעולית נטו (NOI)"
            explanation="ההכנסה שנשארת מהנכסים לאחר הוצאות תפעול שוטפות, לפני תשלומי משכנתה ומימון."
            value={formatCurrency(totals.noi.total, totals.noi.currency)}
            note={totalNote(totals.noi)}
          />
          <StatCard
            label="תזרים לאחר מימון"
            explanation="ה-NOI בניכוי תשלומי המימון (קרן + ריבית) שנרשמו בפועל בתקופה. זהו הסכום שנשאר בפועל לבעלים."
            value={formatCurrency(totals.cashFlow.total, totals.cashFlow.currency)}
            note={totalNote(totals.cashFlow)}
          />
        </div>
      </section>

      <section aria-labelledby="section-attention">
        <h2 id="section-attention" className="section-title">
          דורש תשומת לב
        </h2>
        {attentionEntries.length === 0 ? (
          <div className="banner banner-good">
            <span>אין כרגע נכסים הדורשים תשומת לב.</span>
          </div>
        ) : (
          <ul className="attention-list">
            {attentionEntries.map(({ property, attention }) => (
              <li key={property.id} className="attention-list__item">
                <div className="attention-list__header">
                  <span className="attention-list__name">{property.name}</span>
                  <AttentionBadge status={attention!.status} />
                </div>
                <ul className="attention-list__reasons">
                  {attention!.reasons.map((reason, idx) => (
                    <li key={idx}>{reason.description}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="section-properties">
        <h2 id="section-properties" className="section-title">
          נכסים
        </h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">נכס</th>
                <th scope="col">עיר / מדינה</th>
                <th scope="col">שווי עדכני</th>
                <th scope="col">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td>{property.name}</td>
                  <td>
                    {property.city ? `${property.city}, ` : ''}
                    {property.country}
                  </td>
                  <td>
                    {property.current_market_value != null
                      ? formatCurrency(property.current_market_value, property.default_currency)
                      : 'לא ידוע'}
                  </td>
                  <td>
                    <AttentionBadge status={attentionByProperty.get(property.id)?.status ?? 'insufficient_data'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
