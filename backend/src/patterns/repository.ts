/**
 * Repository pattern base class for data access
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(filter?: Record<string, unknown>): Promise<number>;
}

export abstract class Repository<T> implements IRepository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filter?: Record<string, unknown>): Promise<T[]>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
  abstract count(filter?: Record<string, unknown>): Promise<number>;

  protected buildFilter(filter?: Record<string, unknown>): Record<string, unknown> {
    return filter || {};
  }

  protected validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID');
    }
  }

  protected validateData(data: Partial<T>): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data');
    }
  }
}
