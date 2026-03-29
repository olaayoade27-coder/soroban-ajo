import React from 'react'
import { FormErrors } from './types'

interface FormFieldProps {
  id: keyof FormErrors
  label: string
  input: React.ReactNode
  touched?: boolean
  error?: string
}

/**
 * Reusable form field component with error display
 */
export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  input,
  touched,
  error,
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
    >
      {label}
    </label>
    {input}
    {touched && error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    )}
  </div>
)

interface ErrorSummaryProps {
  errors: FormErrors
  submitted: boolean
  ref?: React.Ref<HTMLDivElement>
}

/**
 * Error summary component for displaying validation errors
 */
export const ErrorSummary = React.forwardRef<HTMLDivElement, ErrorSummaryProps>(
  ({ errors, submitted }, ref) => {
    const hasErrors = Object.keys(errors).length > 0

    if (!hasErrors || !submitted) return null

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        tabIndex={-1}
      >
        <p className="text-sm font-medium text-red-800">
          Please fix {Object.keys(errors).length} error
          {Object.keys(errors).length > 1 ? 's' : ''} before submitting
        </p>
      </div>
    )
  }
)

ErrorSummary.displayName = 'ErrorSummary'
