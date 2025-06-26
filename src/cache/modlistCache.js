import fs from 'fs';
import path from 'path';
import { configService } from '../database/configService.js';
import { logger } from '../utils/logger.js';

class ModlistCache {
    constructor() {
        this.cacheFile = path.join(process.cwd(), 'src', 'cache', 'media', 'modlist.json');
        if (!fs.existsSync(this.cacheFile)) {
            fs.writeFileSync(this.cacheFile, '');
        }
        this.mods = new Set();
        this.isDirty = false;
        this.syncInterval = null;
        this.syncIntervalTime = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
        try {
            logger.info('🔧 Initializing moderator cache system...', true);
            
            // Load from database first
            const dbMods = await configService.getMods();
            logger.info(`📊 Loaded ${dbMods.length} mods from database: ${JSON.stringify(dbMods)}`, true);
            this.mods = new Set(dbMods);
            
            // Save to cache file
            await this.saveToCacheFile();
            
            // Start periodic sync
            this.startPeriodicSync();
            
            logger.success(`👥 Moderator cache initialized (${this.mods.size} moderators loaded)`, true);
        } catch (error) {
            logger.error('Failed to initialize moderator cache:', true, error);
            
            // Fallback: try to load from cache file
            await this.loadFromCacheFile();
        }
    }

    async loadFromCacheFile() {
        try {
            if (fs.existsSync(this.cacheFile)) {
                const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
                this.mods = new Set(data.mods || []);
                logger.info(`📁 Loaded ${this.mods.size} moderators from cache file`, true);
            }
        } catch (error) {
            logger.error('Failed to load moderator cache file:', true, error);
            this.mods = new Set();
        }
    }

    async saveToCacheFile() {
        try {
            const data = {
                mods: Array.from(this.mods),
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            
            fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
            this.isDirty = false;
        } catch (error) {
            logger.error('Failed to save moderator cache file:', true, error);
        }
    }

    async syncToDatabase() {
        if (!this.isDirty) return true;

        try {
            const modsArray = Array.from(this.mods);
            logger.info(`🔄 Syncing ${modsArray.length} moderators to database: ${JSON.stringify(modsArray)}`, true);
            const success = await configService.set('bot.mods', modsArray, 'array', 'List of bot moderators', 'cache-sync');
            
            if (success) {
                await this.saveToCacheFile();
                logger.success(`✅ Synced ${modsArray.length} moderators to database`, true);
                return true;
            }
        } catch (error) {
            logger.error('Failed to sync moderators to database:', true, error);
        }
        
        return false;
    }

    startPeriodicSync() {
        this.syncInterval = setInterval(async () => {
            if (this.isDirty) {
                logger.info('⏰ Periodic sync triggered - syncing moderator changes...', true);
                await this.syncToDatabase();
            }
        }, this.syncIntervalTime);

        logger.info('🔄 Started periodic moderator sync (every 5 minutes)', true);
    }

    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Fast cache-based check
    isMod(phoneNumber) {
        return this.mods.has(phoneNumber);
    }

    // Add moderator to cache
    async addMod(phoneNumber, updatedBy = 'system') {
        if (!this.mods.has(phoneNumber)) {
            logger.info(`➕ Adding moderator: ${phoneNumber}`, true);
            this.mods.add(phoneNumber);
            this.isDirty = true;
            await this.saveToCacheFile();
            
            // Immediately sync to DB for important changes
            const syncSuccess = await this.syncToDatabase();
            
            logger.success(`👥 Added moderator: ${phoneNumber} (DB sync: ${syncSuccess ? 'success' : 'failed'})`, true);
            return true;
        }
        logger.warn(`⚠️ Moderator ${phoneNumber} already exists`, true);
        return false; // Already exists
    }

    // Remove moderator from cache
    async removeMod(phoneNumber, updatedBy = 'system') {
        if (this.mods.has(phoneNumber)) {
            this.mods.delete(phoneNumber);
            this.isDirty = true;
            await this.saveToCacheFile();
            
            // Immediately sync to DB for important changes
            await this.syncToDatabase();
            
            logger.info(`👥 Removed moderator: ${phoneNumber}`, true);
            return true;
        }
        return false; // Doesn't exist
    }

    // Get all moderators
    getMods() {
        return Array.from(this.mods);
    }

    // Clear all moderators
    async clearMods(updatedBy = 'system') {
        this.mods.clear();
        this.isDirty = true;
        await this.saveToCacheFile();
        await this.syncToDatabase();
        
        logger.info('👥 Cleared all moderators', true);
        return true;
    }

    // Get cache stats
    getStats() {
        return {
            totalMods: this.mods.size,
            isDirty: this.isDirty,
            cacheFile: this.cacheFile,
            lastSync: this.isDirty ? 'Pending' : 'Up to date'
        };
    }

    // Force sync to database
    async forceSyncToDatabase() {
        this.isDirty = true;
        return await this.syncToDatabase();
    }
}

// Create and export singleton instance
export const modlistCache = new ModlistCache();
