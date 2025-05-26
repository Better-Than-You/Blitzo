import { logger } from '../utils/logger.js'
import chalk from 'chalk'
import { commandManager } from '../commands/commandManager.js'
import { botConfig } from '../config/botConfig.js'
import { extractPhoneFromJid } from '../utils/helpers.js'
import { nameCache } from '../cache/nameCache.js'
export async function messageHandler (sock, messageUpdate) {
  try {
    logger.debug(`📨 Processing messageUpdate: ${JSON.stringify(messageUpdate, null, 2)}`)
    const { messages, type } = messageUpdate

    // Log the type to see what we're getting
    logger.debug(`📋 Message update type: ${type}`)

    if (!messages || messages.length === 0) {
      logger.debug('❌ No messages in update')
      return
    }

    for (const message of messages) {
      logger.debug(`🔍 Processing message: ${JSON.stringify(message, null, 2)}`)

      // Skip if it's our own message
      if (message.key.fromMe) {
        logger.debug('⏭️  Skipping own message')
        continue
      }

      // Skip if no message content
      if (!message.message) {
        logger.debug('❌ Message has no content, skipping')
        continue
      }

      const messageInfo = await extractMessageInfo(sock, message)
      if (!messageInfo) {
        logger.debug('❌ Could not extract message info, skipping')
        continue
      }

      logger.debug(`✅ Extracted message info: ${JSON.stringify(messageInfo, null, 2)}`)      // Log the received message
      logMessage(messageInfo, sock)

      // Optimize cache for active groups
      await optimizeGroupCache(sock, messageInfo)

      // Process commands or auto-replies
      await processMessage(sock, messageInfo)

      // Auto-preload cache for active groups
      await optimizeGroupCache(sock, messageInfo)
    }
  } catch (error) {
    logger.error('💥 Error in message handler:', error)
  }
}

async function extractMessageInfo (sock, message) {
  try {
    const messageTypes = message.message
    let messageText = ''
    let messageType = ''

    // Handle different message types including newer ones
    if (messageTypes.conversation) {
      messageText = messageTypes.conversation
      messageType = 'text'
    } else if (messageTypes.extendedTextMessage) {
      messageText = messageTypes.extendedTextMessage.text
      messageType = 'text'
    } else if (messageTypes.imageMessage) {
      messageText = messageTypes.imageMessage.caption || '[Image]'
      messageType = 'image'
    } else if (messageTypes.videoMessage) {
      messageText = messageTypes.videoMessage.caption || '[Video]'
      messageType = 'video'
    } else if (messageTypes.documentMessage) {
      messageText = `[Document: ${messageTypes.documentMessage.fileName || 'Unknown'}]`
      messageType = 'document'
    } else if (messageTypes.audioMessage) {
      messageText = '[Audio]'
      messageType = 'audio'
    } else if (messageTypes.stickerMessage) {
      messageText = '[Sticker]'
      messageType = 'sticker'
    } else if (messageTypes.locationMessage) {
      messageText = '[Location]'
      messageType = 'location'
    } else if (messageTypes.contactMessage) {
      messageText = '[Contact]'
      messageType = 'contact'
    } else if (messageTypes.reactionMessage) {
      messageText = `[Reaction: ${messageTypes.reactionMessage.text}]`
      messageType = 'reaction'
    } else {
      // Log unknown message types for debugging
      logger.debug(`Unknown message type: ${JSON.stringify(Object.keys(messageTypes), null, 2)}`)
      return null
    } // Get username/display name using cache
    const senderJid = message.key.participant || message.key.remoteJid
    let username = senderJid.split('@')[0] // Default to phone number

    try {
      // Use cache to get username
      if (message.key.remoteJid.includes('@g.us')) {
        // For group messages, get participant username
        username = await nameCache.getParticipantUsername(senderJid, message.key.remoteJid, message)
      } else {
        // For private messages, get username
        username = await nameCache.getUsername(senderJid, message)
      }
    } catch (error) {
      logger.debug('Error getting username from cache:', error.message)
    }
    return {
      jid: message.key.remoteJid,
      sender: senderJid,
      username: username,
      text: messageText,
      fromGroup: message.key.remoteJid.includes('@g.us'),
      mentions: messageTypes.extendedTextMessage?.contextInfo?.mentionedJid || [],
      quotedMessage: messageTypes.extendedTextMessage?.contextInfo?.quotedMessage || null,
      arguments: messageText.split(' ').slice(1),
      type: messageType,
      timestamp: message.messageTimestamp,
      fromMe: message.key.fromMe,
      originalMessage: message,
    }
  } catch (error) {
    logger.error('Error extracting message info:', error)
    return null
  }
}

async function logMessage (messageInfo, socket) {
  if (messageInfo.fromMe) return //not logging own messages

  const isGroup = messageInfo.jid.includes('@g.us')

  // Use cache for group names instead of direct API calls
  const number = isGroup 
    ? chalk.blue(await nameCache.getGroupName(messageInfo.jid))
    : chalk.blue(extractPhoneFromJid(messageInfo.jid))

  const chatType = isGroup ? '👥 Group' : '👤 Private'
  const timestamp = new Date(messageInfo.timestamp * 1000).toLocaleTimeString()

  // Use username if available, otherwise fall back to phone number
  const displayName = messageInfo.username || messageInfo.sender.split('@')[0]

  // Create colorized output
  const timeStamp = chalk.gray(`[${timestamp}]`)
  const chatTypeColored = isGroup ? chalk.blue(chatType) : chalk.green(chatType)
  const userNameColored = chalk.yellow.bold(displayName)
  const messageText = chalk.white(messageInfo.text)

  // Log the colorized message
  console.log(`${timeStamp} ${chatTypeColored} | ${number} | ${userNameColored} : ${messageText}`)
}

async function processMessage (sock, messageInfo) {
  if (messageInfo.fromMe) return //not process own messages

  const text = messageInfo.text.trim()

  if (text.startsWith(botConfig.prefix)) {
    await commandManager.handleCommand(sock, messageInfo, text)
  } // can add more auto-reply logic here if needed
}

// Auto-preload cache for active groups
async function optimizeGroupCache(sock, messageInfo) {
  if (!messageInfo.fromGroup) return
  
  try {
    // Check if this group needs cache preloading
    const groupInfo = await nameCache.getGroupInfo(messageInfo.jid)
    
    // If group info is not cached or participants are low in cache, preload
    if (!groupInfo) {
      // Run preload in background to not block message processing
      setImmediate(async () => {
        await nameCache.preloadGroupCache(messageInfo.jid)
        logger.debug(`🚀 Auto-preloaded cache for active group ${messageInfo.jid}`)
      })
    }
  } catch (error) {
    logger.debug('Error in auto cache optimization:', error.message)
  }
}
