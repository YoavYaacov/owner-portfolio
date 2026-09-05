// Pure validation helpers, kept dependency-free and framework-free so they
// stay unit-testable (SRS §55 — "Form validation tests") and reusable
// across every future form in the app (Master Prompt §13 — one definition,
// not re-implemented per component).

export interface ValidationResult {
  valid: boolean
  message?: string
}

const USERNAME_PATTERN = /^[a-z0-9._-]+$/

export function validateUsername(rawValue: string): ValidationResult {
  const value = rawValue.trim()
  if (!value) {
    return { valid: false, message: 'יש להזין שם משתמש.' }
  }
  if (value.length < 3 || value.length > 32) {
    return { valid: false, message: 'שם המשתמש צריך להכיל בין 3 ל-32 תווים.' }
  }
  if (value !== value.toLowerCase()) {
    return { valid: false, message: 'שם המשתמש חייב להיות באותיות לועזיות קטנות בלבד.' }
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      valid: false,
      message: 'שם המשתמש יכול להכיל רק אותיות לועזיות קטנות, ספרות, נקודה, מקף וקו תחתון.',
    }
  }
  return { valid: true }
}

export function validatePassword(value: string): ValidationResult {
  if (!value) {
    return { valid: false, message: 'יש להזין סיסמה.' }
  }
  if (value.length < 8) {
    return { valid: false, message: 'הסיסמה חייבת להכיל לפחות 8 תווים.' }
  }
  return { valid: true }
}

export function validatePasswordsMatch(password: string, confirmation: string): ValidationResult {
  if (password !== confirmation) {
    return { valid: false, message: 'הסיסמאות שהוזנו אינן תואמות.' }
  }
  return { valid: true }
}
