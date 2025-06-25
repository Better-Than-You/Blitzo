import { botConfig } from '../../config/botConfig.js'

export const developmentCommands = {
  eval: {
    description: 'Evaluate JavaScript code (Creator only)',
    aliases: ['ev', 'exec'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const code = messageInfo.text.split(' ').slice(1).join(' ')
        
        if (!code) {
          return await sock.sendReply(messageInfo, '❌ Please provide code to evaluate!')
        }

        let result = await eval(code)
        
        if (typeof result !== 'string') {
          result = JSON.stringify(result, null, 2)
        }

        const resultText = `✅ *Evaluation Result:*\n\n\`\`\`\n${result}\n\`\`\``
        
        await sock.sendReply(messageInfo, resultText)
      } catch (error) {
        await sock.sendReply(messageInfo, `❌ *Error:*\n\n\`\`\`\n${error.message}\n\`\`\``)
      }
    },
  },

  restart: {
    description: 'Restart the bot (Creator only)',
    aliases: ['reboot'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      await sock.sendReply(messageInfo, '🔄 Restarting bot...')
      process.exit(0)
    },
  },

  config: {
    description: 'View or update bot configuration (Creator only)',
    aliases: ['cfg'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const args = messageInfo.text.split(' ').slice(1)
      
      if (args.length === 0) {
        const stats = await botConfig.getConfigStats()
        const configText = 
          `⚙️ *Bot Configuration Stats*\n\n` +
          `📊 Total Configs: ${stats.totalConfigs}\n` +
          `📅 Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}\n` +
          `🔧 Config Keys:\n${stats.configKeys.map(key => `• ${key}`).join('\n')}`
        
        return await sock.sendReply(messageInfo, configText)
      }

      if (args[0] === 'get' && args[1]) {
        const value = await botConfig.cache.get(`bot.${args[1]}`)
        const text = value !== undefined 
          ? `⚙️ Config \`${args[1]}\`: ${JSON.stringify(value, null, 2)}`
          : `❌ Config \`${args[1]}\` not found`
        
        return await sock.sendReply(messageInfo, text)
      }

      const helpText = 
        `⚙️ *Config Command Usage*\n\n` +
        `📋 \`${botConfig.prefix}config\` - View stats\n` +
        `📖 \`${botConfig.prefix}config get <key>\` - Get config value\n\n` +
        `💡 Example: \`${botConfig.prefix}config get prefix\``

      await sock.sendReply(messageInfo, helpText)
    },
  },

  logs: {
    description: 'View recent bot logs (Creator only)',
    aliases: ['log'],
    category: 'Development', 
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const uptime = process.uptime()
      const hours = Math.floor(uptime / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)
      const seconds = Math.floor(uptime % 60)
      
      const memUsage = process.memoryUsage()
      const memText = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      
      const logText = 
        `📊 *Bot System Logs*\n\n` +
        `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
        `🧠 *Memory:* ${memText}\n` +
        `📈 *CPU Usage:* ${Math.round(process.cpuUsage().user / 1000)}ms\n` +
        `🔧 *Node Version:* ${process.version}\n` +
        `💾 *Platform:* ${process.platform}\n` +
        `🆔 *Process ID:* ${process.pid}`

      await sock.sendReply(messageInfo, logText)
    },
  },
}
