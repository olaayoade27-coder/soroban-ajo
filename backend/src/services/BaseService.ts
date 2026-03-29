import { PrismaClient } from '@prisma/client';

/**
 * Base service class for common CRUD operations
 */
export abstract class BaseService<T> {
  protected prisma: PrismaClient;
  protected model: any;

  constructor(prisma: PrismaClient, model: any) {
    this.prisma = prisma;
    this.model = model;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async findAll(where?: Record<string, unknown>): Promise<T[]> {
    return this.model.findMany({ where });
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where });
  }

  async findOne(where: Record<string, unknown>): Promise<T | null> {
    return this.model.findFirst({ where });
  }
}
