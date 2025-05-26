import { botConfig } from '../../config/botConfig.js'
import { extractPhoneFromJid } from '../../utils/helpers.js'
import { logger } from '../../utils/logger.js'

export const groupCommands = {
  groupinfo: {
    description: 'Get group information',
    aliases: ['gi', 'ginfo'],
    category: 'Group',
    //grouponly check is handled in the commandManager
    groupOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const groupMetadata = await sock.groupMetadata(messageInfo.jid)
        const participantCount = groupMetadata.participants.length
        const adminsCount = groupMetadata.participants.filter(p => p.admin).length
        const creationDate = new Date(groupMetadata.creation * 1000).toLocaleDateString()
        const groupInfoText =
          `👥 Group Information\n\n` +
          `📝 Name: ${groupMetadata.subject}\n` +
          `👑 Owner: ${groupMetadata.owner ? extractPhoneFromJid(groupMetadata.owner) : 'Unknown'}\n` +
          `📅 Created: ${creationDate}\n` +
          `👥 Members: ${participantCount}\n` +
          `👑 Admins: ${adminsCount}\n` +
          `🔒 Settings: ${
            groupMetadata.announce ? 'Only admins can send messages' : 'All members can send messages'
          }\n` +
          `📝 Description:\n\t ${groupMetadata.desc || 'No description'}`

        return await sock.sendReply(messageInfo, groupInfoText)
      } catch (error) {
        logger.error('Error getting group info:', error)
        await sock.sendReply(messageInfo, '❌ Failed to get group information. Please try again later.')
      }
    },
  },
  members: {
    description: 'List group members',
    aliases: ['m', 'list'],
    category: 'Group',
    groupOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const groupMetadata = await sock.groupMetadata(messageInfo.jid)
        const participants = groupMetadata.participants
        let membersList = `👥 Group Members (${participants.length})\n\n`

        // Group by role
        const admins = participants.filter(p => p.admin === 'admin')
        const superAdmins = participants.filter(p => p.admin === 'superadmin')
        const members = participants.filter(p => !p.admin)

        if (superAdmins.length > 0) {
          membersList += `👑 Creator:\n`
          superAdmins.forEach((admin, index) => {
            membersList += `${index + 1}. ${extractPhoneFromJid(admin.id)}\n`
          })
          membersList += '\n'
        }

        if (admins.length > 0) {
          membersList += `🛡️ Admins:\n`
          admins.forEach((admin, index) => {
            membersList += `${index + 1}. ${extractPhoneFromJid(admin.id)}\n`
          })
          membersList += '\n'
        }

        membersList += `👤 Members:\n`
        members.slice(0, 20).forEach((member, index) => {
          // Limit to first 20 to avoid message length issues
          membersList += `${index + 1}. ${extractPhoneFromJid(member.id)}\n`
        })

        if (members.length > 20) {
          membersList += `\n... and ${members.length - 20} more members`
        }
        await sock.sendReply(messageInfo, membersList)
      } catch (error) {
        logger.error('Error getting members list:', error)
        await sock.sendReply(messageInfo, '❌ Failed to get members list. Please try again later.')
      }
    },
  },
  mention: {
    description: 'Mention all group members',
    aliases: ['all', 'everyone'],
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const groupMetadata = await sock.groupMetadata(messageInfo.jid)
        const participants = groupMetadata.participants.map(p => p.id)

        const mentionText = `⚡ ${botConfig.name} Announcement\n\nAttention everyone! 📢`

        await sock.sendMessage(messageInfo.jid, {
          text: mentionText,
          mentions: participants,
          quoted: messageInfo.originalMessage,
        })

        logger.info(`Mentioned all members in ${groupMetadata.subject} by ${messageInfo.sender}`)
      } catch (error) {
        logger.error('Error mentioning all:', error)
        await sock.sendReply(messageInfo, '❌ Failed to mention all members.')
      }
    },
  },
}
