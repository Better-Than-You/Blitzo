import { Config } from './mongoSchema.js';
import { logger } from '../utils/logger.js';

class ConfigService {
    constructor() {
        this.cache = new Map();
        this.defaultConfigs = {
            'bot.prefix': { value: '/', type: 'string', description: 'Bot command prefix' },
            'bot.mods': { value: [], type: 'array', description: 'List of bot moderators (phone numbers)' },
            'bot.groupsOnly': { value: false, type: 'boolean', description: 'Whether bot works only in groups' },
            'bot.antilink': { value: false, type: 'boolean', description: 'Enable anti-link protection' },
            'bot.welcomeMessage': { value: true, type: 'boolean', description: 'Send welcome message to new members' },
            'cache.timeout': { value: 3600000, type: 'number', description: 'Cache timeout in milliseconds (1 hour)' }
        };
    }

    async initialize() {
        try {
            logger.info('🔧 Initializing configuration system...', true);
            
            const configs = await Config.find({});
            for (const config of configs) {
                this.cache.set(config.key, {
                    value: config.value,
                    type: config.type,
                    description: config.description,
                    lastUpdated: config.lastUpdated,
                    updatedBy: config.updatedBy
                });
            }

            for (const [key, defaultConfig] of Object.entries(this.defaultConfigs)) {
                if (!this.cache.has(key)) {
                    await this.set(key, defaultConfig.value, defaultConfig.type, defaultConfig.description, 'system');
                }
            }

            logger.success(`⚙️  Configuration system initialized (${this.cache.size} configs loaded)`, true);
        } catch (error) {
            logger.error('Failed to initialize configuration system:', true, error);
            throw error;
        }
    }

    async get(key, defaultValue = null) {
        try {
            if (this.cache.has(key)) {
                return this.cache.get(key).value;
            }

            const config = await Config.findOne({ key });
            if (config) {
                this.cache.set(key, {
                    value: config.value,
                    type: config.type,
                    description: config.description,
                    lastUpdated: config.lastUpdated,
                    updatedBy: config.updatedBy
                });
                return config.value;
            }

            return defaultValue;
        } catch (error) {
            logger.error(`Failed to get config '${key}':`, true, error);
            return defaultValue;
        }
    }

    async set(key, value, type = 'string', description = '', updatedBy = 'system') {
        try {
            const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
            if (!validTypes.includes(type)) {
                throw new Error(`Invalid config type: ${type}`);
            }

            const config = await Config.findOneAndUpdate(
                { key },
                { value, type, description, lastUpdated: new Date(), updatedBy },
                { upsert: true, new: true }
            );

            this.cache.set(key, {
                value: config.value,
                type: config.type,
                description: config.description,
                lastUpdated: config.lastUpdated,
                updatedBy: config.updatedBy
            });

            return true;
        } catch (error) {
            logger.error(`Failed to set config '${key}':`, true, error);
            return false;
        }
    }

    async getMods() {
        return await this.get('bot.mods', []);
    }

    async addMod(phoneNumber, updatedBy = 'system') {
        const currentMods = await this.getMods();
        if (!currentMods.includes(phoneNumber)) {
            currentMods.push(phoneNumber);
            return await this.set('bot.mods', currentMods, 'array', 'List of bot moderators', updatedBy);
        }
        return true;
    }

    async removeMod(phoneNumber, updatedBy = 'system') {
        const currentMods = await this.getMods();
        const index = currentMods.indexOf(phoneNumber);
        if (index > -1) {
            currentMods.splice(index, 1);
            return await this.set('bot.mods', currentMods, 'array', 'List of bot moderators', updatedBy);
        }
        return true;
    }

    async isMod(phoneNumber) {
        const mods = await this.getMods();
        return mods.includes(phoneNumber);
    }

    async getAll() {
        try {
            return await Config.find({}).sort({ key: 1 });
        } catch (error) {
            logger.error('Failed to get all configurations:', true, error);
            return [];
        }
    }
}

export const configService = new ConfigService();
