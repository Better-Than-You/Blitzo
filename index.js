import { WhatsAppBot } from './src/bot.js';
import { logger } from './src/utils/logger.js';
import { botConfig } from './src/config/botConfig.js';
class BotManager {
    constructor() {
        this.bot = new WhatsAppBot();
    }    async start() {
        try {
            logger.info('⚡ Starting ' + botConfig.name + '...');
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
        logger.info('🛑 Shutting down bot...');
        process.exit(0);
    }
}

// Start the bot
const botManager = new BotManager();
botManager.start();

// Export for testing or further use
export { botManager };

