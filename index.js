import { WhatsAppBot } from './src/bot.js'
import { logger } from './src/utils/logger.js'
import { botConfig } from './src/config/botConfig.js'
import { mediaCache } from './src/cache/mediaCache.js'
class BotManager {
  constructor () {
    this.bot = new WhatsAppBot()
  }
  async start () {
    try {
      logger.info('⚡ Starting ' + botConfig.name + '...', true)
      await this.bot.initialize()

      // Keep the process running
      process.on('SIGINT', async () => {
        logger.error('🔴 Received SIGINT, shutting down...', true)
        await this.shutdown()
      })
      process.on('SIGTERM', async () => {
        logger.error('🔴 Received SIGTERM, shutting down...', true)
        await this.shutdown()
      })
      process.on('uncaughtException', async error => {
        logger.error('💥 Uncaught Exception:', true, error)
        await this.shutdown()
      })
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('🚨 Unhandled Promise Rejection:', true, reason)
      })
    } catch (error) {
      logger.error('Failed to start bot:', error)
      process.exit(1)
    }
  }

  async shutdown () {
    try {
      logger.info('🔄 Shutting down gracefully...', true)

      // Set a timeout to force exit if cleanup takes too long
      const shutdownTimeout = setTimeout(() => {
        logger.warn('⚠️ Shutdown timeout reached, forcing exit...', true)
        process.exit(1)
      }, 10000) // 10 seconds timeout

      // Cleanup modlist cache first
      const modlistCache = await import('./src/cache/modlistCache.js').then(m => m.modlistCache);
      await modlistCache.forceSyncToDatabase()

      // Clear media cache
      logger.info('🔄 Cleaning up media cache...', true)
      await mediaCache.clearAll()
      logger.info('🗑️  Media cache cleared successfully', true)

      // Clear the timeout since we completed successfully
      clearTimeout(shutdownTimeout)
    } catch (error) {
      logger.error('Error during shutdown:', true, error)
    }

    logger.info('🛑 Bot stopped', true)
    process.exit(0)
  }
}

// Start the bot
const botManager = new BotManager()
botManager.start()

// Export for testing or further use
export { botManager }
