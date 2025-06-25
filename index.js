import { WhatsAppBot } from './src/bot.js';
import { logger } from './src/utils/logger.js';
import { botConfig } from './src/config/botConfig.js';
import { mediaCache } from './src/cache/mediaCache.js';
class BotManager {
    constructor() {
        this.bot = new WhatsAppBot();
    }    async start() {
        try {
            logger.info('⚡ Starting ' + botConfig.name + '...', true);
            await this.bot.initialize();
            
            // Keep the process running
            process.on('SIGINT', () => this.shutdown());
            process.on('SIGTERM', () => this.shutdown());
            process.on('uncaughtException', (error) => {
                logger.error('Uncaught Exception:', error);
                this.shutdown();
            });
            process.on('unhandledRejection', (reason, promise) => {
                logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            });
            
        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        try {
            logger.info('🔄 Shutting down gracefully...', true);
            await mediaCache.clearAll();
        } catch (error) {
            logger.error('Error during shutdown:', true, error);
        }
        
        logger.error('🛑 Bot stopped', true); // error only for color purposes
        process.exit(0);
    }
}

// Start the bot
const botManager = new BotManager();
botManager.start();

// Export for testing or further use
export { botManager };

