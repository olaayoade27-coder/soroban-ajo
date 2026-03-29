/**
 * DI Container Index
 * Exports all DI-related utilities
 */

export { DIContainer, container } from './container'
export { TYPES, type IServiceMap } from './types'
export { setupDependencies, getService, registerService } from './bindings'
