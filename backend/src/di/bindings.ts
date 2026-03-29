/**
 * DI Container Bindings
 * Registers all services and their dependencies
 */

import { container } from './container'
import { TYPES } from './types'
import { createModuleLogger } from '../utils/logger'

/**
 * Initialize all service bindings
 * Call this during application startup
 */
export function setupDependencies(): void {
  // Core Services
  container.register(
    TYPES.Logger as any,
    () => createModuleLogger('App'),
    { singleton: true }
  )

  // Blockchain Services - These would be initialized with actual implementations
  container.register(
    TYPES.SorobanService as any,
    () => {
      // Import and instantiate SorobanService
      // const SorobanService = require('../services/sorobanService').SorobanService
      // return new SorobanService()
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.ContractService as any,
    () => {
      // Import and instantiate ContractService
      return null // Placeholder
    },
    { singleton: true }
  )

  // Business Services
  container.register(
    TYPES.GroupService as any,
    () => {
      // Import and instantiate GroupService with dependencies
      // const GroupService = require('../services/groupService').GroupService
      // const sorobanService = container.resolve(TYPES.SorobanService)
      // return new GroupService(sorobanService)
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.UserService as any,
    () => {
      // Import and instantiate UserService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.NotificationService as any,
    () => {
      // Import and instantiate NotificationService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.AuthService as any,
    () => {
      // Import and instantiate AuthService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.GamificationService as any,
    () => {
      // Import and instantiate GamificationService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.RefundService as any,
    () => {
      // Import and instantiate RefundService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.DisputeService as any,
    () => {
      // Import and instantiate DisputeService
      return null // Placeholder
    },
    { singleton: true }
  )

  // External Services
  container.register(
    TYPES.EmailService as any,
    () => {
      // Import and instantiate EmailService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.CacheService as any,
    () => {
      // Import and instantiate CacheService
      return null // Placeholder
    },
    { singleton: true }
  )

  container.register(
    TYPES.WebhookService as any,
    () => {
      // Import and instantiate WebhookService
      return null // Placeholder
    },
    { singleton: true }
  )
}

/**
 * Get a service from the container
 */
export function getService<T>(type: symbol): T {
  return container.resolve<T>(type as any)
}

/**
 * Register a custom service (for testing or overrides)
 */
export function registerService<T>(type: symbol, service: T): void {
  container.registerInstance(type as any, service)
}
