import { logger } from './src/utils/logger.js';
import fs from 'fs';

// Clear authentication files to start fresh
function clearAuthFiles() {
    const authDir = './auth_info_baileys';
    
    if (fs.existsSync(authDir)) {
        try {
            fs.rmSync(authDir, { recursive: true, force: true });
            logger.info('🗑️  Cleared old authentication files');
        } catch (error) {
            logger.error('Failed to clear auth files:', error);
        }
    }
}

// Run this script to clear authentication and start fresh
clearAuthFiles();
logger.info('✅ Authentication cleared. You can now restart the bot with fresh authentication.');
