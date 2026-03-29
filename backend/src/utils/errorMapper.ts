import { AppError, ErrorFactory } from '../errors/AppError'
import { ValidationError } from '../errors/ValidationError'
import { AuthenticationError } from '../errors/AuthenticationError'
import { BlockchainError } from '../errors/BlockchainError'
import { ZodError } from 'zod'

/**
 * Error mapper utility for converting various error types to AppError
 * Provides consistent error handling across the application
 */
export class ErrorMapper {
  /**
   * Map any error to AppError
   */
  static mapError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof ZodError) {
      return ValidationError.fromZodErrors(error.errors)
    }

    if (error instanceof SyntaxError) {
      return new ValidationError('Invalid JSON format', {
        originalMessage: error.message,
      })
    }

    if (error instanceof TypeError) {
      return new ValidationError('Type validation failed', {
        originalMessage: error.message,
      })
    }

    if (error instanceof RangeError) {
      return new ValidationError('Value out of range', {
        originalMessage: error.message,
      })
    }

    if (error instanceof Error) {
      return ErrorFactory.fromUnknown(error)
    }

    return ErrorFactory.fromUnknown(error)
  }

  /**
   * Map Soroban/Contract errors
   */
  static mapContractError(error: any, operation?: string): BlockchainError {
    if (error instanceof BlockchainError) {
      return error
    }

    const errorMessage = error?.message || error?.toString() || 'Unknown contract error'
    const errorCode = error?.code || error?.type

    // Handle specific contract error patterns
    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      return BlockchainError.insufficientBalance(0, 0)
    }

    if (errorMessage.includes('timeout')) {
      return BlockchainError.timeout(operation || 'contract_call', 30000)
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return BlockchainError.networkError(errorMessage)
    }

    return BlockchainError.contractExecutionFailed(
      operation || 'unknown',
      error,
      { errorCode }
    )
  }

  /**
   * Map authentication errors
   */
  static mapAuthError(error: any): AuthenticationError {
    if (error instanceof AuthenticationError) {
      return error
    }

    const message = error?.message || error?.toString() || 'Authentication failed'

    if (message.includes('expired')) {
      return AuthenticationError.tokenExpired()
    }

    if (message.includes('invalid') || message.includes('malformed')) {
      return AuthenticationError.tokenInvalid()
    }

    if (message.includes('missing')) {
      return AuthenticationError.missingToken()
    }

    if (message.includes('mfa') || message.includes('2fa')) {
      return AuthenticationError.mfaRequired()
    }

    return new AuthenticationError(message)
  }

  /**
   * Get HTTP status code for error
   */
  static getStatusCode(error: unknown): number {
    if (error instanceof AppError) {
      return error.statusCode
    }

    if (error instanceof ZodError) {
      return 400
    }

    if (error instanceof SyntaxError || error instanceof TypeError) {
      return 400
    }

    return 500
  }

  /**
   * Get error code for client handling
   */
  static getErrorCode(error: unknown): string {
    if (error instanceof AppError) {
      return error.code
    }

    if (error instanceof ZodError) {
      return 'VALIDATION_ERROR'
    }

    if (error instanceof SyntaxError) {
      return 'INVALID_JSON'
    }

    if (error instanceof TypeError) {
      return 'TYPE_ERROR'
    }

    return 'INTERNAL_SERVER_ERROR'
  }

  /**
   * Check if error is operational (safe to send to client)
   */
  static isOperational(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.isOperational
    }

    if (error instanceof ZodError) {
      return true
    }

    if (error instanceof SyntaxError || error instanceof TypeError) {
      return true
    }

    return false
  }

  /**
   * Format error for API response
   */
  static formatErrorResponse(error: unknown, requestId?: string) {
    const appError = this.mapError(error)

    return {
      success: false,
      error: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      ...(appError.details && { details: appError.details }),
      ...(requestId && { requestId }),
    }
  }
}
