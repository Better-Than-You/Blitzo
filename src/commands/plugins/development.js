import { botConfig } from '../../config/botConfig.js'
import { formatDuration } from '../../utils/helpers.js'

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

  reload: {
    description: 'Reload all plugins',
    aliases: ['r'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const { commandManager } = await import('../../commands/commandManager.js')
        const result = await commandManager.reloadPlugins()

        if (result) {
          return await sock.sendReply(messageInfo, `✅ Plugins reloaded successfully!`)
        } else {
          return await sock.sendReply(messageInfo, `❌ Failed to reload plugins: ${result.error}`)
        }
      } catch (error) {
        logger.error('Reload plugins command error:', error)
        await sock.sendReply(messageInfo, '❌ Error reloading plugins')
      }
    },
  },

  config: {
    description: 'View or update bot configuration (Creator only)',
    usage: 'config [get|set] <key> [value]',
    aliases: ['cfg'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      const args = messageInfo.text.split(' ').slice(1)
      if (args.length === 0) {
        const stats = await botConfig.getConfigStats()
        const configText =
          `⚙️  *Bot Configuration Stats*\n\n` +
          `📊 Total Configs: ${stats.totalConfigs}\n` +
          `🔧 Config Keys:\n${stats.configKeys.map(key => `• ${key}`).join('\n')}`

        return await sock.sendReply(messageInfo, configText)
      }

      if (args[0] === 'get' && args[1]) {
        const value = await botConfig.cache.get(`bot.${args[1]}`)
        const text =
          value !== undefined
            ? `⚙️  Config \`${args[1]}\`: ${JSON.stringify(value, null, 2)}`
            : `❌ Config \`${args[1]}\` not found`

        return await sock.sendReply(messageInfo, text)
      }

      if (args[0] === 'set' && args[1] && args[2]) {
        const key = `bot.${args[1]}`
        const value = args.slice(2).join(' ')
        try {
          await botConfig.set(key, value, 'string', `Set by ${messageInfo.sender}`, 'Creator')
          return await sock.sendReply(messageInfo, `✅ Config \`${args[1]}\` set to \`${value}\``)
        } catch (error) {
          return await sock.sendReply(messageInfo, `❌ Failed to set config \`${args[1]}\`: ${error.message}`)
        }
      }
      const helpText =
        `⚙️  *Config Command Usage*\n\n` +
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
      const uptime = await formatDuration(process.uptime())
      const memUsage = process.memoryUsage()
      const memText = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(
        memUsage.heapTotal / 1024 / 1024
      )}MB`

      const logText =
        `📊 *Bot System Logs*\n\n` +
        `⏱️ *Uptime:* ${uptime}\n` +
        `🧠 *Memory:* ${memText}\n` +
        `📈 *CPU Usage:* ${Math.round(process.cpuUsage().user / 1000)}ms\n` +
        `🔧 *Node Version:* ${process.version}\n` +
        `💾 *Platform:* ${process.platform}\n` +
        `🆔 *Process ID:* ${process.pid}`

      await sock.sendReply(messageInfo, logText)
    },
  },

  syncmods: {
    description: 'Force sync moderators to database (Creator only)',
    aliases: ['syncmod'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const modlistCache = await import('../../cache/modlistCache.js').then(m => m.modlistCache)
        const stats = modlistCache.getStats()
        const syncResult = await modlistCache.forceSyncToDatabase()

        const syncText =
          `🔄 *Moderator Sync Status*\n\n` +
          `📊 Total Mods: ${stats.totalMods}\n` +
          `💾 Cache Status: ${stats.lastSync}\n` +
          `✅ Force Sync: ${syncResult ? '*Success*' : '*Failed*'}`

        await sock.sendReply(messageInfo, syncText)
      } catch (error) {
        await sock.sendReply(messageInfo, `❌ Sync failed: ${error.message}`)
      }
    },
  },
}
