import dotenv from 'dotenv';


dotenv.config();

export const botConfig = {
    prefix: process.env.BOT_PREFIX || '/',

    name: process.env.BOT_NAME || 'Blitzo',
    version: process.env.BOT_VERSION || '1.0.0',
    description: process.env.BOT_DESCRIPTION || 'A simple WhatsApp bot prototype',

    creator: {
        name: process.env.CREATOR_NAME || 'Sujatro',
        phone: process.env.CREATOR_PHONE,
        email: process.env.CREATOR_EMAIL || 'john@doe',
        jid: process.env.CREATOR_PHONE.slice(1) + '@s.whatsapp.net', // Creator's jid
        github: process.env.CREATOR_GITHUB || 'https://github.com/Better-Than-You',
        social: process.env.CREATOR_SOCIAL || '@better_th4n_y0u',
    },
    
    // .env hot reload
    reload() {
        dotenv.config();
        this.name = process.env.BOT_NAME || 'Blitzo';
        this.version = process.env.BOT_VERSION || '1.0.0';
        this.description = process.env.BOT_DESCRIPTION || 'A simple WhatsApp bot prototype';
        this.creator.name = process.env.CREATOR_NAME || 'Sujatro';
        this.creator.phone = process.env.CREATOR_PHONE;
        this.creator.email = process.env.CREATOR_EMAIL || 'john@doe';
        this.creator.jid = process.env.CREATOR_PHONE ? process.env.CREATOR_PHONE.slice(1) + '@s.whatsapp.net' : null;
        this.creator.github = process.env.CREATOR_GITHUB || 'https://github.com/Better-Than-You';
        this.creator.social = process.env.CREATOR_SOCIAL || '@better_th4n_y0u';
    },
    
    // Social links
    social: {
        github: process.env.CREATOR_GITHUB || 'https://github.com/Better-Than-You',
        social: process.env.CREATOR_SOCIAL || '@better_th4n_y0u',
    },
    
    mods: [],
    
    features: [
        'Colorized message logging',
        'Command handling',
        'Group management', 
        'Auto-responses',
        'Command aliases support',
        'Configurable prefix',
        'Creator and mod management'
    ],

    adminOnly: {
        mention: true
    },

    setPrefix(newPrefix) {
        if (newPrefix && newPrefix.length === 1 && newPrefix !== ' ') {
            this.prefix = newPrefix;
            return true;
        }
        return false;
    },

    resetPrefix() {
        this.prefix = process.env.BOT_PREFIX || '/';
    },

    // Method to check if user is creator
    isCreator(jid) {
        const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
        const creatorJid = this.creator.jid;
        return cleanJid === creatorJid;
    },

    // Method to check if user is moderator
    isMod(jid) {
        const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
        return this.mods.includes(cleanJid);
    },

    // Method to add moderator
    addMod(jid) {
        const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
        if (!this.mods.includes(cleanJid) && !this.isCreator(cleanJid)) {
            this.mods.push(cleanJid);
            return true;
        }
        return false;
    },

    // Method to remove moderator
    removeMod(jid) {
        const cleanJid = jid.split('@')[0] + '@s.whatsapp.net';
        const index = this.mods.indexOf(cleanJid);
        if (index > -1) {
            this.mods.splice(index, 1);
            return true;
        }
        return false;
    },

    // Method to get all mods
    getMods() {
        return [...this.mods];
    },

    // Method to clear all mods
    clearMods() {
        this.mods = [];
    }
};
