import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'
import P from 'pino'
import QRCode from 'qrcode'
import { messageHandler } from './handlers/messageHandler.js'
import { logger } from './utils/logger.js'
import { botConfig } from './config/botConfig.js'

class WhatsAppBot {
  constructor () {
    this.sock = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  async initialize () {
    try {
      // will implement database connection here in the future
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
      this.sock = makeWASocket({
        printQRInTerminal: false,
        logger: P({ level: 'silent' }),
        auth: state,
        browser: [botConfig.name, 'Desktop', '1.0.0'],
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: () => false,
        getMessage: async key => {
          if (key.remoteJid === 'status@broadcast') return undefined
          return { conversation: 'Hello' }
        },
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 2,
        patchMessageBeforeSending: message => {
          return message
        },
        transactionOpts: {
          maxCommitRetries: 1,
          delayBetweenTriesMs: 3000,
        },
      })

      // adding additoinal methods to the socket
      this.sock.sendReply = async (message, text) => {
        await this.sock.sendMessage(message.jid, { text }, { quoted: message.originalMessage })
      }
      this.sock.sendReaction = async (message, reaction) => {
        await this.sock.sendMessage(message.jid, { react: { text: reaction, key: message.originalMessage.key, },         })
      }

      this.setupEventHandlers(saveCreds)
      logger.info(`⚡ ${botConfig.name} initialized`)

      return this.sock
    } catch (error) {
      logger.error('Failed to initialize bot:', error)
      throw error
    }
  }

  setupEventHandlers (saveCreds) {
    // Handle credential updates
    this.sock.ev.on('creds.update', saveCreds)

    // Handle connection updates
    this.sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        logger.info('📱 Scan the QR code below to connect:')
        console.log(await QRCode.toString(qr, { type: 'terminal', small: true }))
      }

      if (connection === 'close') {
        this.isConnected = false
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        const statusCode = lastDisconnect?.error?.output?.statusCode

        logger.warn(`🔌 Connection closed. Status: ${statusCode}`)

        if (shouldReconnect) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) // Exponential backoff
            logger.warn(
              `🔄 Reconnecting in ${delay / 1000}s... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            )

            setTimeout(() => {
              this.initialize()
            }, delay)
          } else {
            logger.error('❌ Max reconnection attempts reached. Please restart the bot.')
            process.exit(1)
          }
        } else {
          logger.error('❌ Bot logged out')
          process.exit(1)
        }
      } else if (connection === 'open') {
        logger.success(botConfig.name + ' connected successfully!')
        this.isConnected = true
        this.reconnectAttempts = 0 // Reset reconnect attempts on successful connection

        // Wait a bit after connection to avoid immediate disconnection
        setTimeout(() => {
          logger.info(`⚡ ${botConfig.name} is ready to receive messages!`)
        }, 5000)
      } else if (connection === 'connecting') {
        logger.info('🔗 Connecting to WhatsApp...')
      }
    }) // Handle incoming messages
    this.sock.ev.on('messages.upsert', async m => {
      logger.debug(`Received messages.upsert event: ${JSON.stringify(m, null, 2)}`)
      await messageHandler(this.sock, m)
    })

    // Also handle message updates which might contain new messages
    this.sock.ev.on('messages.update', async m => {
      logger.debug(`Received messages.update event: ${JSON.stringify(m, null, 2)}`)
      // Some messages might come through updates
      if (m && m.length > 0) {
        for (const msg of m) {
          if (msg.update && msg.update.message) {
            await messageHandler(this.sock, { messages: [msg], type: 'notify' })
          }
        }
      }
    })

    // Handle message receipts which can indicate new messages
    this.sock.ev.on('message-receipt.update', receipt => {
      logger.debug(`Message receipt: ${JSON.stringify(receipt, null, 2)}`)
    })

    // Handle presence updates
    this.sock.ev.on('presence.update', presence => {
      logger.debug(`Presence update: ${JSON.stringify(presence, null, 2)}`)
    }) // Debug: Log all events to see what we're receiving
    if (process.env.DEBUG) {
      const originalEmit = this.sock.ev.emit
      this.sock.ev.emit = function (event, ...args) {
        // Log all events except noisy ones
        if (!['creds.update', 'connection.update'].includes(event)) {
          logger.debug(`📡 Event: ${event}`, args.length > 0 ? JSON.stringify(args[0], null, 2) : '')
        }
        return originalEmit.apply(this, [event, ...args])
      }

      // Also listen to specific events that might contain messages
      this.sock.ev.on('messaging-history.set', history => {
        logger.debug(`🗂️  Messaging history set: ${JSON.stringify(history, null, 2)}`)
      })

      this.sock.ev.on('chats.set', chats => {
        logger.debug(`💬 Chats set: ${chats.length} chats`)
      })

      this.sock.ev.on('contacts.set', contacts => {
        logger.debug(`👥 Contacts set: ${Object.keys(contacts).length} contacts`)
      })
    }

    // Handle connection errors
    this.sock.ev.on('connection.error', error => {
      logger.error('Connection error:', error)
    })
  }

  getConnectionStatus () {
    return this.isConnected
  }
}

export { WhatsAppBot }
