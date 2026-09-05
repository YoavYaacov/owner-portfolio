import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../components/FormField'
import { requestPasswordReset, AuthApiError } from '../lib/authApi'
import { validateUsername } from '../lib/validation'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFormError(null)
    setSuccessMessage(null)

    const check = validateUsername(username)
    setFieldError(check.valid ? undefined : check.message)
    if (!check.valid) return

    setSubmitting(true)
    try {
      // ADR-016: this always resolves with a generic success message,
      // whether or not the username exists — never reveal which usernames
      // are registered.
      const message = await requestPasswordReset(username)
      setSuccessMessage(message)
    } catch (err) {
      setFormError(err instanceof AuthApiError ? err.message : 'אירעה שגיאה. נסה/י שוב בעוד רגע.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>שחזור סיסמה</h1>
        <p className="auth-card__subtitle">
          הזן/י את שם המשתמש שלך. אם הוא קיים במערכת, יישלח אליו מייל עם קישור לאיפוס הסיסמה.
        </p>

        {formError && (
          <div className="banner banner-critical" role="alert">
            <span>{formError}</span>
          </div>
        )}
        {successMessage && (
          <div className="banner banner-good" role="status">
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="username"
            label="שם משתמש"
            value={username}
            onChange={setUsername}
            error={fieldError}
            autoComplete="username"
            required
            disabled={submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'שולח/ת…' : 'שליחת קישור לאיפוס'}
          </button>
        </form>

        <div className="form-footer-links">
          <Link to="/login">חזרה להתחברות</Link>
          <span />
        </div>
      </div>
    </div>
  )
}
