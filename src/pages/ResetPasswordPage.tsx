import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { validatePassword, validatePasswordsMatch } from '../lib/validation'

/**
 * Reached via the emailed recovery link (ADR-016/ADR-018). Gated on
 * `recoveryPending`, which the auth provider sets when it observes
 * Supabase's `PASSWORD_RECOVERY` event — not on the URL path — because
 * under HashRouter the recovery tokens and the app route share the same
 * URL fragment (see ADR-018 / RootRedirect for the full explanation).
 *
 * Known limitation (documented, not hidden — Master Prompt §26): reloading
 * this page after the link has already been opened once loses the
 * in-memory `recoveryPending` flag, since it isn't persisted. If that
 * happens the user sees the "invalid/expired link" state and needs to
 * request a new email — acceptable for a single-use recovery link.
 */
export default function ResetPasswordPage() {
  const { recoveryPending, clearRecoveryPending, signOut } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!recoveryPending && !done) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>הקישור אינו תקף</h1>
          <p className="auth-card__subtitle">
            קישור איפוס הסיסמה אינו תקף, כבר נעשה בו שימוש, או שפג תוקפו.
          </p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            בקשת קישור חדש
          </Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>הסיסמה עודכנה</h1>
          <div className="banner banner-good" role="status">
            <span>הסיסמה עודכנה בהצלחה. יש להתחבר מחדש עם הסיסמה החדשה.</span>
          </div>
          <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            לעמוד ההתחברות
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting || !supabase) return
    setFormError(null)

    const passwordCheck = validatePassword(password)
    const matchCheck = validatePasswordsMatch(password, confirmPassword)
    const errors: typeof fieldErrors = {}
    if (!passwordCheck.valid) errors.password = passwordCheck.message
    if (passwordCheck.valid && !matchCheck.valid) errors.confirmPassword = matchCheck.message
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setFormError('לא הצלחנו לעדכן את הסיסמה. ייתכן שהקישור פג תוקף — נסה/י לבקש קישור חדש.')
        setSubmitting(false)
        return
      }
      // Require a fresh, full login with the new password rather than
      // silently continuing inside the recovery session.
      await signOut()
      clearRecoveryPending()
      setDone(true)
    } catch {
      setFormError('אירעה שגיאה בעדכון הסיסמה. נסה/י שוב.')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>קביעת סיסמה חדשה</h1>
        <p className="auth-card__subtitle">הסיסמה חייבת להכיל לפחות 8 תווים.</p>

        {formError && (
          <div className="banner banner-critical" role="alert">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="new-password"
            label="סיסמה חדשה"
            type="password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            autoComplete="new-password"
            required
            disabled={submitting}
          />
          <FormField
            id="confirm-password"
            label="אימות סיסמה חדשה"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            required
            disabled={submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'מעדכן/ת…' : 'עדכון סיסמה'}
          </button>
        </form>
      </div>
    </div>
  )
}
