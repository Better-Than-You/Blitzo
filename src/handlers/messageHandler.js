import { logger } from '../utils/logger.js'
import chalk from 'chalk'
import { commandManager } from '../commands/commandManager.js'
import { botConfig } from '../config/botConfig.js'
import { extractPhoneFromJid } from '../utils/helpers.js'
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

      logger.debug(`✅ Extracted message info: ${JSON.stringify(messageInfo, null, 2)}`)

      // Log the received message
      logMessage(messageInfo)

      // Process commands or auto-replies
      await processMessage(sock, messageInfo)
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
    } // Get username/display name
    const senderJid = message.key.participant || message.key.remoteJid
    let username = senderJid.split('@')[0] // Default to phone number

    try {
      // For group messages, try to get the push name from the message
      if (message.pushName && message.pushName.trim()) {
        username = message.pushName.trim()
      }

      // If still no proper name and it's a group, try group metadata
      if (username === senderJid.split('@')[0] && message.key.remoteJid.includes('@g.us')) {
        try {
          const groupMetadata = await sock.groupMetadata(message.key.remoteJid)
          const participant = groupMetadata.participants.find(p => p.id === senderJid)
          if (participant) {
            // Try different name sources
            if (participant.notify && participant.notify.trim()) {
              username = participant.notify.trim()
            } else if (participant.name && participant.name.trim()) {
              username = participant.name.trim()
            }
          }
        } catch (groupError) {
          logger.debug('Could not get group metadata:', groupError.message)
        }
      }

      if (username === senderJid.split('@')[0] && message.verifiedBizName) {
        username = message.verifiedBizName
      }
    } catch (error) {
      logger.debug('Error getting username:', error.message)
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

function logMessage (messageInfo) {
  if (messageInfo.fromMe) return //not logging own messages

  const number = chalk.blue(extractPhoneFromJid(messageInfo.jid))
  const isGroup = messageInfo.jid.includes('@g.us')
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
