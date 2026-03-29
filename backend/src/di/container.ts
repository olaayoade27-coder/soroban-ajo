/**
 * Dependency Injection Container
 * Manages service instantiation and dependency resolution
 */

type ServiceFactory<T> = () => T
type ServiceConstructor<T> = new (...args: any[]) => T

interface ServiceDefinition<T> {
  factory?: ServiceFactory<T>
  constructor?: ServiceConstructor<T>
  instance?: T
  singleton: boolean
}

export class DIContainer {
  private services = new Map<string, ServiceDefinition<any>>()
  private instances = new Map<string, any>()

  /**
   * Register a service with a factory function
   */
  register<T>(
    key: string,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    this.services.set(key, {
      factory,
      singleton: options.singleton ?? true,
    })
  }

  /**
   * Register a service with a constructor
   */
  registerClass<T>(
    key: string,
    constructor: ServiceConstructor<T>,
    options: { singleton?: boolean } = {}
  ): void {
    this.services.set(key, {
      constructor,
      singleton: options.singleton ?? true,
    })
  }

  /**
   * Register a singleton instance
   */
  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, {
      instance,
      singleton: true,
    })
    this.instances.set(key, instance)
  }

  /**
   * Resolve a service
   */
  resolve<T>(key: string): T {
    const definition = this.services.get(key)

    if (!definition) {
      throw new Error(`Service '${key}' not registered in DI container`)
    }

    // Return singleton instance if already created
    if (definition.singleton && this.instances.has(key)) {
      return this.instances.get(key)
    }

    let instance: T

    if (definition.instance) {
      instance = definition.instance
    } else if (definition.factory) {
      instance = definition.factory()
    } else if (definition.constructor) {
      instance = new definition.constructor()
    } else {
      throw new Error(`No factory or constructor for service '${key}'`)
    }

    // Cache singleton
    if (definition.singleton) {
      this.instances.set(key, instance)
    }

    return instance
  }

  /**
   * Check if service is registered
   */
  has(key: string): boolean {
    return this.services.has(key)
  }

  /**
   * Clear all services and instances
   */
  clear(): void {
    this.services.clear()
    this.instances.clear()
  }

  /**
   * Get all registered service keys
   */
  getKeys(): string[] {
    return Array.from(this.services.keys())
  }
}

// Global container instance
export const container = new DIContainer()
