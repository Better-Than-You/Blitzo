import { botConfig } from '../../config/botConfig.js'
import { extractPhoneFromJid } from '../../utils/helpers.js'

export const moderationCommands = {
  addmod: {
    description: 'Add a user as moderator (Creator only)',
    aliases: ['mod+', 'promote'],
    category: 'Moderation',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const text = messageInfo.text.trim()
      const args = text.split(' ')

      // Check if user is mentioned or phone number is provided
      let targetJid = null

      // Check for mentions in the message
      if (messageInfo.mentions?.length > 0) {
        targetJid = messageInfo.originalMessage.message.extendedTextMessage.contextInfo.mentionedJid[0]
      } 
      // Check if phone number is provided as argument
      else if (args.length > 1) {
        const phoneArg = args[1]
        // Remove any non-digit characters and format as JID
        const cleanPhone = phoneArg.replace(/\D/g, '')
        if (cleanPhone.length >= 10) {
          targetJid = cleanPhone + '@s.whatsapp.net'
        }
      }

      if (!targetJid) {
        return await sock.sendReply(messageInfo, 
          `❌ Please mention a user or provide their phone number!\n\n` +
          `📝 Usage: \`${botConfig.prefix}addmod @user\`\n` +
          `📝 Or: \`${botConfig.prefix}addmod 1234567890\``
        )
      }

      // Check if user is already creator
      if (botConfig.isCreator(targetJid)) {
        return await sock.sendReply(messageInfo, '❌ Cannot add creator as moderator!')
      }

      // Check if user is already a moderator
      if (botConfig.isMod(targetJid)) {
        return await sock.sendReply(messageInfo, 
          `❌ ${extractPhoneFromJid(targetJid)} is already a moderator!`
        )
      }

      // Add user as moderator
      const success = await botConfig.addMod(targetJid, messageInfo.sender)
      if (success) {
        const successText = 
          `✅ Moderator Added Successfully!\n\n` +
          `👤 User: ${extractPhoneFromJid(targetJid)}\n` +
          `🛡️ Role: Moderator\n` +
          `⚡ They can now use moderator commands!`
        
        return await sock.sendReply(messageInfo, successText)
      } else {
        return await sock.sendReply(messageInfo, '❌ Failed to add moderator. Please try again.')
      }
    }
  },

  removemod: {
    description: 'Remove a user from moderators (Creator only)',
    aliases: ['mod-', 'demote'],
    category: 'Moderation',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const text = messageInfo.text.trim()
      const args = text.split(' ')

      // Check if user is mentioned or phone number is provided
      let targetJid = null

      // Check for mentions in the message
      if (messageInfo.originalMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = messageInfo.originalMessage.message.extendedTextMessage.contextInfo.mentionedJid[0]
      } 
      // Check if phone number is provided as argument
      else if (args.length > 1) {
        const phoneArg = args[1]
        // Remove any non-digit characters and format as JID
        const cleanPhone = phoneArg.replace(/\D/g, '')
        if (cleanPhone.length >= 10) {
          targetJid = cleanPhone + '@s.whatsapp.net'
        }
      }

      if (!targetJid) {
        return await sock.sendReply(messageInfo, 
          `❌ Please mention a user or provide their phone number!\n\n` +
          `📝 Usage: \`${botConfig.prefix}removemod @user\`\n` +
          `📝 Or: \`${botConfig.prefix}removemod 1234567890\``
        )
      }

      // Check if user is a moderator
      if (!botConfig.isMod(targetJid)) {
        return await sock.sendReply(messageInfo, 
          `❌ ${extractPhoneFromJid(targetJid)} is not a moderator!`
        )
      }

      // Remove user from moderators
      const success = await botConfig.removeMod(targetJid, messageInfo.sender)
      if (success) {
        const successText = 
          `✅ Moderator Removed Successfully!\n\n` +
          `👤 User: ${extractPhoneFromJid(targetJid)}\n` +
          `🔻 Role: Regular User\n` +
          `⚡ They no longer have moderator privileges!`
        
        return await sock.sendReply(messageInfo, successText)
      } else {
        return await sock.sendReply(messageInfo, '❌ Failed to remove moderator. Please try again.')
      }
    }
  },

  listmods: {
    description: 'List all moderators',
    aliases: ['mods', 'modlist'],
    category: 'Moderation',
    handler: async (sock, messageInfo) => {
      const mods = await botConfig.getMods()
      const creator = botConfig.creator
      let mentions = []
      let modText = `🛡️ *Bot Administration*\n\n`
      modText += `👑 *Creator:*\n`
      modText += `• ${creator.name} (@${creator.jid.split('@')[0]})\n\n`
      mentions.push(creator.jid)

      if (mods.length > 0) {
        modText += `🛡️ *Moderators (${mods.length}):*\n`
        mods.forEach((phoneNumber, index) => {
          const modJid = phoneNumber + '@s.whatsapp.net'
          modText += `${index + 1}. @${phoneNumber}\n`
          mentions.push(modJid)
        })
      } else {
        modText += `🛡️ *Moderators:* None\n`
      }

      modText += `\n⚡ Total Staff: ${1 + mods.length}`

      return await sock.sendMessage(messageInfo.jid, {text: modText, mentions: mentions})
    }
  },

  clearmods: {
    description: 'Remove all moderators (Creator only)',
    aliases: ['modclear'],
    category: 'Moderation',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const mods = await botConfig.getMods()
      const modsCount = mods.length

      if (modsCount === 0) {
        return await sock.sendReply(messageInfo, '❌ No moderators to clear!')
      }

      const success = await botConfig.clearMods(messageInfo.sender)
      if (success) {
        const successText = 
          `✅ All Moderators Cleared!\n\n` +
          `🗑️ Removed: ${modsCount} moderator(s)\n` +
          `⚡ Only the creator has admin privileges now!`

        return await sock.sendReply(messageInfo, successText)
      } else {
        return await sock.sendReply(messageInfo, '❌ Failed to clear moderators. Please try again.')
      }
    }
  },

  modtest: {
    description: 'Test command for moderators only',
    aliases: ['mtest'],
    category: 'Moderation',
    modsOnly: true,
    handler: async (sock, messageInfo) => {
      const username = messageInfo.username || messageInfo.sender.split('@')[0]
      const isCreator = botConfig.isCreator(messageInfo.sender)
      const isMod = botConfig.isMod(messageInfo.sender)

      let role = 'Unknown'
      if (isCreator) role = 'Creator'
      else if (isMod) role = 'Moderator'

      const testText = 
        `✅ Moderator Test Successful!\n\n` +
        `👤 User: ${username}\n` +
        `🛡️ Role: ${role}\n` +
        `⚡ You have access to moderator commands!`

      return await sock.sendReply(messageInfo, testText)
    }
  },

  creatortest: {
    description: 'Test command for creator only',
    aliases: ['ctest'],
    category: 'Moderation',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const username = messageInfo.username || messageInfo.sender.split('@')[0]

      const testText = 
        `✅ Creator Test Successful!\n\n` +
        `👤 User: ${username}\n` +
        `👑 Role: Creator\n` +
        `⚡ You have full access to all bot commands!`

      return await sock.sendReply(messageInfo, testText)
    }
  }
}
