import { PrismaClient } from '@prisma/client';
import { BaseService } from '@/services/BaseService';
import { ValidationHelpers, ServiceError, ErrorCodes } from '@/utils/serviceHelpers';

/**
 * Example refactored service using BaseService
 * This demonstrates how to consolidate duplicate CRUD logic
 */
export class ExampleRefactoredService extends BaseService<any> {
  constructor(prisma: PrismaClient, model: any) {
    super(prisma, model);
  }

  /**
   * Find by ID with validation
   */
  async findByIdSafe(id: string) {
    ValidationHelpers.validateRequired(id);
    const item = await this.findById(id);
    if (!item) {
      throw new ServiceError(
        ErrorCodes.NOT_FOUND,
        `Item with ID ${id} not found`,
        404
      );
    }
    return item;
  }

  /**
   * Create with validation
   */
  async createSafe(data: Record<string, unknown>) {
    ValidationHelpers.validateRequired(data);
    this.validateData(data as any);
    return this.create(data as any);
  }

  /**
   * Update with validation
   */
  async updateSafe(id: string, data: Record<string, unknown>) {
    ValidationHelpers.validateRequired(id);
    ValidationHelpers.validateRequired(data);
    this.validateData(data as any);
    return this.update(id, data as any);
  }

  /**
   * Delete with validation
   */
  async deleteSafe(id: string) {
    ValidationHelpers.validateRequired(id);
    return this.delete(id);
  }

  /**
   * Find all with pagination
   */
  async findAllPaginated(
    skip: number = 0,
    take: number = 10,
    where?: Record<string, unknown>
  ) {
    const items = await this.model.findMany({
      where,
      skip,
      take,
    });
    const total = await this.count(where);
    return { items, total, skip, take };
  }
}
