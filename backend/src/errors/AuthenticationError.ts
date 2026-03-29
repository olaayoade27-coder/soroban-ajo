import { AppError } from './AppError'

/**
 * Authentication error for auth-related failures
 * HTTP Status: 401
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details)
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }

  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError('Invalid credentials provided')
  }

  static tokenExpired(): AuthenticationError {
    return new AuthenticationError('Authentication token has expired', {
      reason: 'TOKEN_EXPIRED',
    })
  }

  static tokenInvalid(): AuthenticationError {
    return new AuthenticationError('Invalid or malformed authentication token', {
      reason: 'TOKEN_INVALID',
    })
  }

  static missingToken(): AuthenticationError {
    return new AuthenticationError('Authentication token is missing', {
      reason: 'TOKEN_MISSING',
    })
  }

  static sessionExpired(): AuthenticationError {
    return new AuthenticationError('Session has expired', {
      reason: 'SESSION_EXPIRED',
    })
  }

  static mfaRequired(): AuthenticationError {
    return new AuthenticationError('Multi-factor authentication is required', {
      reason: 'MFA_REQUIRED',
    })
  }

  static invalidMfaCode(): AuthenticationError {
    return new AuthenticationError('Invalid multi-factor authentication code', {
      reason: 'INVALID_MFA_CODE',
    })
  }
}
