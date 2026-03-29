/**
 * Refactoring Guide for Services
 * 
 * This document outlines how to refactor existing services to use BaseService
 * and common patterns to reduce code duplication.
 */

// BEFORE: Duplicate CRUD logic in multiple services
/*
class UserService {
  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
  
  async findAll() {
    return this.prisma.user.findMany();
  }
  
  async create(data) {
    return this.prisma.user.create({ data });
  }
  
  async update(id, data) {
    return this.prisma.user.update({ where: { id }, data });
  }
  
  async delete(id) {
    return this.prisma.user.delete({ where: { id } });
  }
}

class GroupService {
  async findById(id: string) {
    return this.prisma.group.findUnique({ where: { id } });
  }
  
  async findAll() {
    return this.prisma.group.findMany();
  }
  
  async create(data) {
    return this.prisma.group.create({ data });
  }
  
  async update(id, data) {
    return this.prisma.group.update({ where: { id }, data });
  }
  
  async delete(id) {
    return this.prisma.group.delete({ where: { id } });
  }
}
*/

// AFTER: Using BaseService
/*
import { BaseService } from '@/services/BaseService';

class UserService extends BaseService<User> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.user);
  }
  
  // Add custom methods specific to users
  async findByEmail(email: string) {
    return this.findOne({ email });
  }
}

class GroupService extends BaseService<Group> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.group);
  }
  
  // Add custom methods specific to groups
  async findActive() {
    return this.findAll({ status: 'active' });
  }
}
*/

// VALIDATION PATTERN CONSOLIDATION
/*
// BEFORE: Duplicate validation in multiple services
class UserService {
  validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

class GroupService {
  validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// AFTER: Using ValidationHelpers
import { ValidationHelpers } from '@/utils/serviceHelpers';

class UserService {
  validateEmail(email: string) {
    return ValidationHelpers.validateEmail(email);
  }
}

class GroupService {
  validateEmail(email: string) {
    return ValidationHelpers.validateEmail(email);
  }
}
*/

// ERROR HANDLING CONSOLIDATION
/*
// BEFORE: Duplicate error handling
class UserService {
  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

// AFTER: Using ServiceError
import { ServiceError, ErrorCodes } from '@/utils/serviceHelpers';

class UserService {
  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ServiceError(
        ErrorCodes.NOT_FOUND,
        'User not found',
        404
      );
    }
    return user;
  }
}
*/

export const RefactoringGuide = {
  description: 'See comments above for refactoring patterns',
};
