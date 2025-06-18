import { logger } from './src/utils/logger.js'
import { mongoAuthService } from './src/database/authService.js'
import { connectMongoDB, closeMongoDb } from './src/database/connection.js'
import fs from 'fs'

async function clearAuthData() {
    try {
        logger.info('Clearing authentication data...')
        
        const authDirs = ['./auth_info_baileys', './temp_auth', './cache/temp_auth']
        
        for (const authDir of authDirs) {
            if (fs.existsSync(authDir)) {
                try {
                    fs.rmSync(authDir, { recursive: true, force: true })
                    logger.info(`Cleared file auth: ${authDir}`)
                } catch (error) {
                    logger.debug(`Could not clear ${authDir}:`, error.message)
                }
            }
        }
        
        // Clear MongoDB
        try {
            await connectMongoDB()
            const cleared = await mongoAuthService.clearAllSessions()
            logger.info(`Cleared ${cleared} MongoDB session(s)`)
            await closeMongoDb()
        } catch (error) {
            logger.warn('MongoDB auth clear failed:', error.message)
        }
          logger.info('Authentication cleared successfully!')
        logger.info('Next bot startup will require QR code scan')
        
    } catch (error) {
        logger.error('Failed to clear authentication:', error)
        process.exit(1)
    }
}

clearAuthData().then(() => {
    process.exit(0)
})
