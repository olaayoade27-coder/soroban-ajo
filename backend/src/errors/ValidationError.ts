import { AppError } from './AppError'

/**
 * Validation error for request validation failures
 * HTTP Status: 400
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }

  static fromZodErrors(errors: any[]): ValidationError {
    const details = errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }))
    return new ValidationError('Validation failed', { errors: details })
  }

  static missingField(fieldName: string): ValidationError {
    return new ValidationError(`Missing required field: ${fieldName}`, {
      field: fieldName,
    })
  }

  static invalidFormat(fieldName: string, format: string): ValidationError {
    return new ValidationError(
      `Invalid format for field '${fieldName}'. Expected: ${format}`,
      { field: fieldName, expectedFormat: format }
    )
  }

  static outOfRange(fieldName: string, min?: number, max?: number): ValidationError {
    const range = min !== undefined && max !== undefined 
      ? `${min}-${max}` 
      : min !== undefined 
      ? `>= ${min}` 
      : `<= ${max}`
    return new ValidationError(
      `Field '${fieldName}' is out of range. Expected: ${range}`,
      { field: fieldName, min, max }
    )
  }
}
