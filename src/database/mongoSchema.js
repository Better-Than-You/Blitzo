import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
})

const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'audio', 'video', 'document'],        default: 'text'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isBot: {
        type: Boolean,
        default: false
    }
})

const commandSchema = new mongoose.Schema({
    command: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usage: {
        type: Number,
        default: 0
    }
})

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    session: {
        type: String,
        default: ''
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'array', 'object'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: String,
        default: 'system'
    }
})

export const User = mongoose.model('User', userSchema)
export const Message = mongoose.model('Message', messageSchema)
export const Command = mongoose.model('Command', commandSchema)
export const Session = mongoose.model('Session', sessionSchema)
export const Config = mongoose.model('Config', configSchema)