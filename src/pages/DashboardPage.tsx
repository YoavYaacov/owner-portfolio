import AppShell from '../components/AppShell'

/**
 * Placeholder destination for the protected route so the login flow has
 * somewhere real to land and be tested end-to-end (SRS §22 critical flow:
 * Login → Dashboard). The actual Dashboard content (portfolio value, debt,
 * NOI, attention items — Master Prompt §20, SRS §33) is Phase 3+ and must
 * not be faked with placeholder numbers (Master Prompt §6 — never invent
 * data).
 */
export default function DashboardPage() {
  return (
    <AppShell>
      <div className="banner banner-info">
        <span>
          ברוך/ה הבא. זהו מסך הבית הזמני של Phase 2 — האימות ומעטפת האפליקציה
          עובדים. תוכן ה-Dashboard האמיתי (שווי פורטפוליו, חוב, NOI, נכסים
          הדורשים תשומת לב) ייבנה ב-Phase 3 ואילך.
        </span>
      </div>
    </AppShell>
  )
}
