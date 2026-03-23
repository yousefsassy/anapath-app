import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  helperText?: string
}

export function FormField({ label, htmlFor, children, helperText }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {helperText ? <p className="form-helper-text">{helperText}</p> : null}
    </div>
  )
}
