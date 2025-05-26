import dotenv from 'dotenv';


// Load environment variables
dotenv.config();

export const botConfig = {
    // Bot prefix settings
    prefix: '/',
    
    // Bot information
    name: process.env.BOT_NAME || 'Blitzo',
    version: process.env.BOT_VERSION || '1.0.0',
    description: process.env.BOT_DESCRIPTION || 'A simple WhatsApp bot prototype',
    
    // Creator information from environment
    creator: {
        name: process.env.CREATOR_NAME || 'Sujatro',
        phone: process.env.CREATOR_PHONE,
        jid: process.env.CREATOR_PHONE.slice(1) + '@s.whatsapp.net', // Creator's WhatsApp JID
        github: process.env.CREATOR_GITHUB || 'https://github.com/Better-Than-You',
        social: process.env.CREATOR_SOCIAL || '@better_th4n_y0u',
    },
    
    // Moderators list (can be modified at runtime)
    mods: [],
    
    // Features
    features: [
        'Colorized message logging',
        'Command handling',
        'Group management', 
        'Auto-responses',
        'Command aliases support',
        'Configurable prefix',
        'Creator and mod management'
    ],
    
    // Admin settings
    adminOnly: {
        mention: true
    },
    
    // Method to change prefix
    setPrefix(newPrefix) {
        if (newPrefix && newPrefix.length === 1 && newPrefix !== ' ') {
            this.prefix = newPrefix;
            return true;
        }
        return false;
    },

    // Method to reset prefix to default
    resetPrefix() {
        this.prefix = '/';
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
