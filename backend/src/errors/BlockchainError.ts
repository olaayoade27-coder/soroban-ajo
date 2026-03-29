import { AppError } from './AppError'

/**
 * Blockchain/Contract error for Soroban-related failures
 * HTTP Status: 500 (or 400 for validation errors)
 */
export class BlockchainError extends AppError {
  constructor(
    message: string,
    public readonly contractError?: any,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message, 'BLOCKCHAIN_ERROR', statusCode, {
      ...details,
      contractError,
    })
    Object.setPrototypeOf(this, BlockchainError.prototype)
  }

  static contractExecutionFailed(
    operation: string,
    error: any,
    details?: Record<string, any>
  ): BlockchainError {
    return new BlockchainError(
      `Contract execution failed for operation: ${operation}`,
      error,
      500,
      { operation, ...details }
    )
  }

  static transactionFailed(
    txHash: string,
    reason: string,
    details?: Record<string, any>
  ): BlockchainError {
    return new BlockchainError(
      `Transaction failed: ${reason}`,
      undefined,
      500,
      { txHash, reason, ...details }
    )
  }

  static insufficientBalance(
    required: number,
    available: number,
    token?: string
  ): BlockchainError {
    return new BlockchainError(
      `Insufficient balance. Required: ${required}, Available: ${available}${token ? ` (${token})` : ''}`,
      undefined,
      400,
      { required, available, token }
    )
  }

  static invalidContractState(
    expectedState: string,
    currentState: string
  ): BlockchainError {
    return new BlockchainError(
      `Invalid contract state. Expected: ${expectedState}, Current: ${currentState}`,
      undefined,
      400,
      { expectedState, currentState }
    )
  }

  static networkError(message: string, details?: Record<string, any>): BlockchainError {
    return new BlockchainError(
      `Network error: ${message}`,
      undefined,
      503,
      details
    )
  }

  static rpcError(method: string, error: any): BlockchainError {
    return new BlockchainError(
      `RPC call failed for method: ${method}`,
      error,
      503,
      { method }
    )
  }

  static timeout(operation: string, timeout: number): BlockchainError {
    return new BlockchainError(
      `Blockchain operation timed out: ${operation} (${timeout}ms)`,
      undefined,
      504,
      { operation, timeout }
    )
  }

  static invalidParameters(
    operation: string,
    invalidParams: string[]
  ): BlockchainError {
    return new BlockchainError(
      `Invalid parameters for operation: ${operation}`,
      undefined,
      400,
      { operation, invalidParams }
    )
  }
}
