/**
 * DI Container Type Definitions
 * Defines service identifiers and their types
 */

// Service identifiers
export const TYPES = {
  // Core Services
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config'),
  Database: Symbol.for('Database'),

  // Blockchain Services
  SorobanService: Symbol.for('SorobanService'),
  ContractService: Symbol.for('ContractService'),
  TokenService: Symbol.for('TokenService'),

  // Business Services
  GroupService: Symbol.for('GroupService'),
  UserService: Symbol.for('UserService'),
  TransactionService: Symbol.for('TransactionService'),
  NotificationService: Symbol.for('NotificationService'),
  AuthService: Symbol.for('AuthService'),
  GamificationService: Symbol.for('GamificationService'),
  RefundService: Symbol.for('RefundService'),
  DisputeService: Symbol.for('DisputeService'),

  // Repositories
  GroupRepository: Symbol.for('GroupRepository'),
  UserRepository: Symbol.for('UserRepository'),
  TransactionRepository: Symbol.for('TransactionRepository'),

  // External Services
  EmailService: Symbol.for('EmailService'),
  CacheService: Symbol.for('CacheService'),
  WebhookService: Symbol.for('WebhookService'),
} as const

// Service type mappings
export interface IServiceMap {
  [TYPES.Logger]: any
  [TYPES.Config]: any
  [TYPES.Database]: any
  [TYPES.SorobanService]: any
  [TYPES.ContractService]: any
  [TYPES.TokenService]: any
  [TYPES.GroupService]: any
  [TYPES.UserService]: any
  [TYPES.TransactionService]: any
  [TYPES.NotificationService]: any
  [TYPES.AuthService]: any
  [TYPES.GamificationService]: any
  [TYPES.RefundService]: any
  [TYPES.DisputeService]: any
  [TYPES.GroupRepository]: any
  [TYPES.UserRepository]: any
  [TYPES.TransactionRepository]: any
  [TYPES.EmailService]: any
  [TYPES.CacheService]: any
  [TYPES.WebhookService]: any
}
