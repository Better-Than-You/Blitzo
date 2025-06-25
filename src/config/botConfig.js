import dotenv from 'dotenv';
import { configService } from '../database/configService.js';
import { logger } from '../utils/logger.js';

dotenv.config();

class BotConfig {
    constructor() {
        this.isInitialized = false;
        this.cache = new Map();
        
        this.defaults = {
            name: process.env.BOT_NAME || 'Blitzo',
            version: process.env.BOT_VERSION || '1.0.0',
            description: process.env.BOT_DESCRIPTION || 'A simple WhatsApp bot prototype',
            prefix: process.env.BOT_PREFIX || '/',
            creator: {
                name: process.env.CREATOR_NAME || 'Sujatro',
                phone: process.env.CREATOR_PHONE,
                email: process.env.CREATOR_EMAIL || 'john@doe',
                jid: process.env.CREATOR_PHONE ? process.env.CREATOR_PHONE.slice(1) + '@s.whatsapp.net' : null,
                github: process.env.CREATOR_GITHUB || 'https://github.com/Better-Than-You',
                social: process.env.CREATOR_SOCIAL || '@better_th4n_y0u',
            },
            features: [
                'Colorized message logging',
                'Command handling',
                'Group management', 
                'Auto-responses',
                'Command aliases support',
                'Configurable prefix',
                'Creator and mod management'
            ]
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            logger.info('🔧 Initializing bot configuration...', true);
            
            await configService.initialize();
            
            const isFirstTime = await this.isFirstTimeSetup();
            
            if (isFirstTime) {
                await this.createInitialConfig();
                logger.success('🎉 Initial bot configuration created from environment variables', true);
            } else {
                logger.info('📋 Loading bot configuration from database...', true);
            }
            
            await this.loadFromDatabase();
            
            this.isInitialized = true;
            logger.success('⚙️ Bot configuration loaded successfully', true);
            
        } catch (error) {
            logger.error('Failed to initialize bot configuration:', true, error);
            throw error;
        }
    }

    async isFirstTimeSetup() {
        const prefix = await configService.get('bot.prefix');
        const name = await configService.get('bot.name');
        return prefix === null || name === null;
    }

    async createInitialConfig() {
        logger.info('🔨 Creating initial configuration from environment variables...', true);
        
        await configService.set('bot.name', this.defaults.name, 'string', 'Bot name', 'setup');
        await configService.set('bot.version', this.defaults.version, 'string', 'Bot version', 'setup');
        await configService.set('bot.description', this.defaults.description, 'string', 'Bot description', 'setup');
        await configService.set('bot.prefix', this.defaults.prefix, 'string', 'Bot command prefix', 'setup');
        
        await configService.set('bot.creator.name', this.defaults.creator.name, 'string', 'Creator name', 'setup');
        await configService.set('bot.creator.phone', this.defaults.creator.phone || '', 'string', 'Creator phone number', 'setup');
        await configService.set('bot.creator.email', this.defaults.creator.email, 'string', 'Creator email', 'setup');
        await configService.set('bot.creator.jid', this.defaults.creator.jid || '', 'string', 'Creator WhatsApp JID', 'setup');
        await configService.set('bot.creator.github', this.defaults.creator.github, 'string', 'Creator GitHub profile', 'setup');
        await configService.set('bot.creator.social', this.defaults.creator.social, 'string', 'Creator social handle', 'setup');
        
        await configService.set('bot.features', this.defaults.features, 'array', 'Bot features list', 'setup');
    }

    async loadFromDatabase() {
        const configs = [
            'bot.name', 'bot.version', 'bot.description', 'bot.prefix',
            'bot.creator.name', 'bot.creator.phone', 'bot.creator.email', 
            'bot.creator.jid', 'bot.creator.github', 'bot.creator.social',
            'bot.features'
        ];

        for (const key of configs) {
            const value = await configService.get(key);
            this.cache.set(key, value);
        }
    }

    get name() { return this.cache.get('bot.name') || this.defaults.name; }
    get version() { return this.cache.get('bot.version') || this.defaults.version; }
    get description() { return this.cache.get('bot.description') || this.defaults.description; }
    get prefix() { return this.cache.get('bot.prefix') || this.defaults.prefix; }
    get features() { return this.cache.get('bot.features') || this.defaults.features; }

    get creator() {
        return {
            name: this.cache.get('bot.creator.name') || this.defaults.creator.name,
            phone: this.cache.get('bot.creator.phone') || this.defaults.creator.phone,
            email: this.cache.get('bot.creator.email') || this.defaults.creator.email,
            jid: this.cache.get('bot.creator.jid') || this.defaults.creator.jid,
            github: this.cache.get('bot.creator.github') || this.defaults.creator.github,
            social: this.cache.get('bot.creator.social') || this.defaults.creator.social,
        };
    }

    async setPrefix(newPrefix, updatedBy = 'system') {
        if (newPrefix && newPrefix.length === 1 && newPrefix !== ' ') {
            const success = await configService.setPrefix(newPrefix, updatedBy);
            if (success) {
                this.cache.set('bot.prefix', newPrefix);
            }
            return success;
        }
        return false;
    }

    async resetPrefix(updatedBy = 'system') {
        const success = await configService.setPrefix(this.defaults.prefix, updatedBy);
        if (success) {
            this.cache.set('bot.prefix', this.defaults.prefix);
        }
        return success;
    }

    isCreator(jid) {
        const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
        return cleanJid === this.creator.jid;
    }

    async isMod(jid) {
        const phoneNumber = jid.split('@')[0];
        return await configService.isMod(phoneNumber);
    }

    async addMod(jid, updatedBy = 'system') {
        const phoneNumber = jid.split('@')[0];
        if (!this.isCreator(jid)) {
            return await configService.addMod(phoneNumber, updatedBy);
        }
        return false;
    }

    async removeMod(jid, updatedBy = 'system') {
        const phoneNumber = jid.split('@')[0];
        return await configService.removeMod(phoneNumber, updatedBy);
    }

    async getMods() {
        return await configService.getMods();
    }
}

export const botConfig = new BotConfig();
