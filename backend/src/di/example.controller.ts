/**
 * Example: Using Dependency Injection in Controllers
 * This file demonstrates how to use the DI container in your controllers
 */

import { Request, Response, NextFunction } from 'express'
import { getService, TYPES } from '../di'
import { asyncHandler } from '../middleware/errorHandler'

/**
 * Example controller using dependency injection
 * Instead of importing services directly, we resolve them from the DI container
 */
export class ExampleGroupController {
  /**
   * Get all groups
   * Demonstrates injecting GroupService
   */
  static getGroups = asyncHandler(async (req: Request, res: Response) => {
    // Resolve service from DI container
    const groupService = getService(TYPES.GroupService)

    // Use the service
    const groups = await groupService.getAllGroups()

    res.json({
      success: true,
      data: groups,
    })
  })

  /**
   * Create a new group
   * Demonstrates injecting multiple services
   */
  static createGroup = asyncHandler(async (req: Request, res: Response) => {
    // Resolve services from DI container
    const groupService = getService(TYPES.GroupService)
    const notificationService = getService(TYPES.NotificationService)

    // Use the services
    const group = await groupService.createGroup(req.body)

    // Notify users
    await notificationService.notifyGroupCreated(group)

    res.status(201).json({
      success: true,
      data: group,
    })
  })

  /**
   * Get group by ID
   */
  static getGroupById = asyncHandler(async (req: Request, res: Response) => {
    const groupService = getService(TYPES.GroupService)
    const { id } = req.params

    const group = await groupService.getGroupById(id)

    res.json({
      success: true,
      data: group,
    })
  })
}

/**
 * Benefits of using DI:
 * 1. Easy to test - can inject mock services
 * 2. Loose coupling - services don't depend on concrete implementations
 * 3. Centralized configuration - all services configured in one place
 * 4. Singleton management - services are created once and reused
 * 5. Dependency resolution - container handles complex dependency graphs
 */
