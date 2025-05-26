import { botConfig } from '../../config/botConfig.js'

export const coreCommands = {
  ping: {
    description: 'Test bot responsiveness',
    aliases: ['p'],
    category: 'Core',
    handler: async (sock, messageInfo) => {
      const startTime = Date.now()
      await sock.sendMessage(messageInfo.jid, { text: '🏓 Calculating response time...' })
      const endTime = Date.now()
      const responseTime = endTime - startTime

      const pongText = `🏓 Pong!\n⚡ Response Time: ${responseTime}ms`
      return await sock.sendMessage(messageInfo.jid, { text: pongText})
    },
  },
  status: {
    description: 'Check bot status',
    aliases: ['s', 'stat'],
    category: 'Core',
    handler: async (sock, messageInfo) => {
      const uptime = process.uptime()
      const hours = Math.floor(uptime / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)
      const seconds = Math.floor(uptime % 60)

      const statusText =
        `⚡ ${botConfig.name} Status\n\n` +
        `✅ *Status:* Running and healthy!\n` +
        `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
        `🧠 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
        `⚙️ *Current Prefix:* \`${botConfig.prefix}\`\n` +
        `🔧 *Prefix Customizable:* Yes\n`

      return await sock.sendReply(messageInfo, statusText)
    },
  },
  info: {
    description: 'Bot information',
    aliases: ['i', 'about'],
    category: 'Core',
    handler: async (sock, messageInfo) => {
      const infoText =
        `${botConfig.name} Prototype\n\n` +
        `⚡ Version: ${botConfig.version}\n` +
        `🌊 Theme: ${botConfig.description}\n\n` +
        `💫 Features:\n` +
        botConfig.features.map(feature => `• ${feature}`).join('\n') +
        `\n• More coming soon...` +
        `\n\nType ${botConfig.prefix}help for available commands`

      return await sock.sendReply(messageInfo, infoText)
    },
  },  prefix: {
    description: 'View or change bot prefix',
    aliases: ['setprefix', 'changeprefix'],
    category: 'Core',
    modsOnly: true,
    handler: async (sock, messageInfo) => {
      const text = messageInfo.text.trim()
      const args = text.split(' ')

      // If no new prefix provided, show current prefix
      if (args.length === 1) {
        const prefixText =
          `⚙️ Current Prefix: \`${botConfig.prefix}\`\n\n` +
          `📝 Usage: \`${botConfig.prefix}prefix <new_prefix>\`\n` +
          `📌 Example: \`${botConfig.prefix}prefix !\`\n\n` +
          `✨ Valid prefixes: Any single character like \`/\`, \`!\`, \`.\`, \`#\`, etc.`

        return await sock.sendReply(messageInfo, prefixText)
      }

      const newPrefix = args[1]

      // Validate new prefix
      if (!newPrefix || newPrefix.length !== 1) {
        return await sock.sendReply(messageInfo, `❌ Invalid prefix!\n\nPrefix must be a single character.\nExample: \`${botConfig.prefix}prefix !\``)
      }

      // Don't allow space as prefix
      if (newPrefix === ' ') {
        return await sock.sendReply(messageInfo, `❌ Space cannot be used as prefix!\n\nPlease choose a different character.`)
      }

      const oldPrefix = botConfig.prefix
      botConfig.setPrefix(newPrefix)

      const successText =
        `✅ Prefix Changed Successfully!\n\n` +
        `🔄 Old Prefix: \`${oldPrefix}\`\n` +
        `🆕 New Prefix: \`${newPrefix}\`\n\n` +
        `📝 Example usage: \`${newPrefix}help\`\n` +
        `⚡ ${botConfig.name} is ready with the new prefix!`

      return await sock.sendReply(messageInfo, successText)
    },
  },  resetprefix: {
    description: 'Reset prefix to default (/)',
    aliases: ['defaultprefix'],
    category: 'Core',
    modsOnly: true,
    handler: async (sock, messageInfo) => {
      const oldPrefix = botConfig.prefix
      botConfig.resetPrefix()

      const resetText =
        `🔄 Prefix Reset Successfully!\n\n` +
        `🔄 Old Prefix: \`${oldPrefix}\`\n` +
        `🆕 New Prefix: \`${botConfig.prefix}\` (default)\n\n` +
        `📝 Example usage: \`${botConfig.prefix}help\`\n` +
        `⚡ ${botConfig.name} is back to default settings!`

      return await sock.sendReply(messageInfo, resetText)
    },
  },
  creator: {
    description: 'Contact bot creator',
    aliases: ['contact', 'dev', 'owner'],
    category: 'Core',
    handler: async (sock, messageInfo) => {
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${botConfig.creator.name}`,
        `TEL;type=CELL;waid=${botConfig.creator.phone.slice(1)}:${botConfig.creator.phone}`,
        `EMAIL:${botConfig.creator.email}`,
        'END:VCARD'
      ].join('\n')
      console.log(vcard);
      await sock.sendMessage(messageInfo.jid, {
        contacts: {
            displayName: botConfig.creator.name,
            contacts: [
                { vcard }
        ]
    }, 
      }, {quoted: messageInfo.originalMessage})
      return await sock.sendMessage(messageInfo.jid, {text: `Contact info has been sent!`})
    },
  },
  hi: {
    description: 'Get a personalized welcome message',
    aliases: ['hello', 'greet'],
    category: 'Core',
    handler: async (sock, messageInfo) => {
      const username = messageInfo.username || messageInfo.sender.split('@')[0]

      const welcomeText =
        `👋 Hello ${username}!\n\n` +
        `⚡ Welcome to *${botConfig.name}*!\n\n` +
        `🚀 Type \`${botConfig.prefix}help\` to see what I can do\n` +
        `⚙️ Current prefix: \`${botConfig.prefix}\`\n\n` +
        `💫 Let's get started!`

      return await sock.sendReply(messageInfo, welcomeText)
    },
  },
}
