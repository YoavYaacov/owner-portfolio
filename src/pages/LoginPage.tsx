import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { loginWithUsername, AuthApiError } from '../lib/authApi'
import { validateUsername } from '../lib/validation'

export default function LoginPage() {
  const { applySession } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return // prevent double submit (SRS §19)
    setFormError(null)

    const usernameCheck = validateUsername(username)
    // Full password-policy validation (min length, etc.) belongs on the
    // *sign-up*/reset side. Here we only require "not empty" — an existing
    // account may predate a policy tightening, and login is not the place
    // to reject a correct, working password.
    const passwordOk = password.length > 0
    const errors: typeof fieldErrors = {}
    if (!usernameCheck.valid) errors.username = usernameCheck.message
    if (!passwordOk) errors.password = 'יש להזין סיסמה.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const session = await loginWithUsername(username, password)
      await applySession(session)
      // No manual navigation: once the auth context updates, PublicOnlyRoute
      // redirects to /dashboard on its own (single source of truth).
    } catch (err) {
      setFormError(err instanceof AuthApiError ? err.message : 'שם המשתמש או הסיסמה שגויים.')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>כניסה למערכת</h1>
        <p className="auth-card__subtitle">ניהול פורטפוליו הנדל&quot;ן המשפחתי</p>

        {formError && (
          <div className="banner banner-critical" role="alert">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="username"
            label="שם משתמש"
            value={username}
            onChange={setUsername}
            error={fieldErrors.username}
            autoComplete="username"
            required
            disabled={submitting}
          />
          <FormField
            id="password"
            label="סיסמה"
            type="password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            autoComplete="current-password"
            required
            disabled={submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'מתחבר/ת…' : 'התחברות'}
          </button>
        </form>

        <div className="form-footer-links">
          <Link to="/forgot-password">שכחת סיסמה?</Link>
          <span />
        </div>
      </div>
    </div>
  )
}
