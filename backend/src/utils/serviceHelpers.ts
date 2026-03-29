import { z } from 'zod';

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: z.string().email('Invalid email address'),
  walletAddress: z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address'),
  uuid: z.string().uuid('Invalid UUID'),
  positiveNumber: z.number().positive('Must be positive'),
  nonNegativeNumber: z.number().nonnegative('Must be non-negative'),
  percentage: z.number().min(0).max(100),
};

/**
 * Common validation helpers
 */
export class ValidationHelpers {
  static validateEmail(email: string): boolean {
    return ValidationPatterns.email.safeParse(email).success;
  }

  static validateWalletAddress(address: string): boolean {
    return ValidationPatterns.walletAddress.safeParse(address).success;
  }

  static validateUUID(id: string): boolean {
    return ValidationPatterns.uuid.safeParse(id).success;
  }

  static validateRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  static validateRequired(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  static validateArrayNotEmpty<T>(arr: T[]): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

/**
 * Common error handling
 */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
