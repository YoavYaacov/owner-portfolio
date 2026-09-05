/**
 * Shown instead of a blank white page when VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY are missing at build time. Reliability principle
 * (Master Prompt §6/§23): fail loudly and explain what's wrong, in Hebrew,
 * never a silent blank screen or a raw stack trace.
 */
export default function ConfigurationError() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>המערכת אינה מוגדרת כראוי</h1>
        <p className="auth-card__subtitle">
          חסרים פרטי חיבור למסד הנתונים (VITE_SUPABASE_URL /
          VITE_SUPABASE_ANON_KEY). אם אתה רואה הודעה זו לאחר פריסה, ודא שהם
          הוגדרו כ-Repository Secrets בהגדרות ה-GitHub Actions.
        </p>
      </div>
    </div>
  )
}
