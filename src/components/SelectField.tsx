interface Option {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

/** Select-not-free-text per SRS §36, sharing the same field chrome as FormField. */
export default function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  helperText,
  required,
  disabled,
}: SelectFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <select
        id={id}
        name={id}
        className="text-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-help` : undefined}
        disabled={disabled}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
