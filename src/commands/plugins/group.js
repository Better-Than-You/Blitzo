import { botConfig } from '../../config/botConfig.js'
import { extractPhoneFromJid } from '../../utils/helpers.js'
import { logger } from '../../utils/logger.js'
import { nameCache } from '../../cache/nameCache.js'

export const groupCommands = {
  groupinfo: {
    description: 'Get group information',
    aliases: ['gi', 'ginfo'],
    category: 'Group',
    //grouponly check is handled in the commandManager
    groupOnly: true,    handler: async (sock, messageInfo) => {
      try {
        // Use cached group info instead of direct API call
        const groupInfo = await nameCache.getGroupInfo(messageInfo.jid)
        
        if (!groupInfo) {
          return await sock.sendReply(messageInfo, '❌ Failed to get group information. Please try again later.')
        }

        const groupInfoText =
          `👥 Group Information\n\n` +
          `📝 Name: ${groupInfo.name}\n` +
          `👑 Owner: ${groupInfo.owner ? extractPhoneFromJid(groupInfo.owner) : 'Unknown'}\n` +
          `📅 Created: ${groupInfo.creationDate}\n` +
          `👥 Members: ${groupInfo.participantCount}\n` +
          `👑 Admins: ${groupInfo.adminsCount}\n` +
          `🔒 Settings: ${
            groupInfo.announce ? 'Only admins can send messages' : 'All members can send messages'
          }\n` +
          `📝 Description:\n\t ${groupInfo.description}`

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
    groupOnly: true,    handler: async (sock, messageInfo) => {
      try {
        // Use cached participants instead of direct API call
        const participants = await nameCache.getGroupParticipants(messageInfo.jid)
        
        if (!participants || participants.length === 0) {
          return await sock.sendReply(messageInfo, '❌ Failed to get members list. Please try again later.')
        }

        let mentions = participants.map(p => p.id)
        let membersList = `👥 Group Members (${participants.length})\n\n`

        // Group by role
        const admins = participants.filter(p => p.admin === 'admin')
        const superAdmins = participants.filter(p => p.admin === 'superadmin')
        const members = participants.filter(p => !p.admin)

        if (superAdmins.length > 0) {
          membersList += `👑 Creator:\n`
          superAdmins.forEach((admin, index) => {
            membersList += `${index + 1}. @${(admin.id.split('@')[0])}\n`
          })
          membersList += '\n'
        }

        if (admins.length > 0) {
          membersList += `🛡️ Admins:\n`
          admins.forEach((admin, index) => {
            membersList += `${index + 1}. @${(admin.id.split('@')[0])}\n`
          })
          membersList += '\n'
        }

        membersList += `👤 Members:\n`
        members.slice(0, 20).forEach((member, index) => {
          // Limit to first 20 to avoid message length issues
          membersList += `${index + 1}. @${(member.id.split('@')[0])}\n`
        })

        if (members.length > 20) {
          membersList += `\n... and ${members.length - 20} more members`
        }
        await sock.sendMessage(messageInfo.jid, {text: membersList, mentions})
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
    adminOnly: true,    handler: async (sock, messageInfo) => {
      try {
        // Use cached participants and group info instead of direct API call
        const participants = await nameCache.getGroupParticipants(messageInfo.jid)
        const groupInfo = await nameCache.getGroupInfo(messageInfo.jid)
        
        if (!participants || participants.length === 0) {
          return await sock.sendReply(messageInfo, '❌ Failed to mention members. Please try again later.')
        }

        const participantIds = participants.map(p => p.id)
        const mentionText = `⚡ ${botConfig.name} Announcement\n\nAttention everyone! 📢`

        await sock.sendMessage(messageInfo.jid, {
          text: mentionText,
          mentions: participantIds,
          quoted: messageInfo.originalMessage,
        })

        const groupName = groupInfo ? groupInfo.name : 'Unknown Group'
        logger.info(`Mentioned all members in ${groupName} by ${messageInfo.sender}`)
      } catch (error) {
        logger.error('Error mentioning all:', error)
        await sock.sendReply(messageInfo, '❌ Failed to mention all members.')
      }
    },
  },
}
