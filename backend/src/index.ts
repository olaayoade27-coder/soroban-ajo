import dotenv from 'dotenv'
import { logger } from './utils/logger'
import { startWorkers, stopWorkers } from './jobs/jobWorkers'
import { startScheduler, stopScheduler } from './cron/scheduler'
import app from './app'

dotenv.config()

const PORT = process.env.PORT || 3001

// Start server and keep reference so we can close it on shutdown
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { env: process.env.NODE_ENV || 'development' })

  // Start background job workers and cron scheduler
  try {
    startWorkers()
    startScheduler()
    logger.info('Background jobs and cron scheduler started')
  } catch (err) {
    logger.error('Failed to start background jobs', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
})

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...')
  if (server && server.close) {
    server.close((err?: Error) => {
      if (err) {
        logger.error('Error closing server', { error: err.message })
      } else {
        logger.info('HTTP server closed')
      }
    })
  }

  stopScheduler()
  await stopWorkers()
  setTimeout(() => process.exit(0), 100)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export default app
