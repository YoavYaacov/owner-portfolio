interface FormFieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  helperText?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Shared form field: consistent label + helper text + human error message +
 * required marker across every form in the app (SRS §19/§36), rather than
 * re-implementing this per page.
 */
export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  helperText,
  autoComplete,
  required,
  disabled,
}: FormFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="text-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-help` : undefined}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      {error ? (
        <p className="error-text" id={`${id}-error`}>
          {error}
        </p>
      ) : helperText ? (
        <p className="helper-text" id={`${id}-help`}>
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
