import { logger } from '../../utils/logger.js'
import { nameCache } from '../../cache/nameCache.js'
import { botConfig } from '../../config/botConfig.js'

export const developmentCommands = {
  eval: {
    description: 'To evaluate commands while bot is running',
    aliases: [],
    category: 'Development',
    creatorOnly: true,
    modsOnly: false,
    handler: async (sock, messageInfo) => {
      try {
        const code = messageInfo.arguments.join(' ')
        if (!code) {
          await sock.sendReply(messageInfo, 'Please provide code to evaluate. Usage: `!eval <code>`')
          return
        }

        let result = await eval(`(async () => { ${code} })()`)
        if (typeof result !== 'string') {
          result = JSON.stringify(result, null, 2)
        }
        return await sock.sendMessage(messageInfo, `Eval Result:\n\`\`\`\n${result}\n\`\`\``)
      } catch (err) {
        await sock.sendReply(messageInfo, `Eval Error:\n\`\`\`\n${err}\n\`\`\``)
        logger.error('Eval command error:', err)
      }
    },
  },

  cachestats: {
    description: 'Show cache statistics and performance',
    aliases: ['cache', 'cstats'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const stats = nameCache.getStats()
        
        const statsText = 
          `📊 *Cache Statistics*\n\n` +
          `👤 *Usernames:* ${stats.validUsernames}/${stats.totalUsernames} valid\n` +
          `👥 *Group Names:* ${stats.validGroupNames}/${stats.totalGroupNames} valid\n` +
          `⏱️ *Expired Entries:* ${stats.expiredEntries}\n` +
          `🔄 *Update Interval:* ${stats.updateInterval} minutes`

        return await sock.sendReply(messageInfo, statsText)
      } catch (error) {
        logger.error('Cache stats command error:', error)
        await sock.sendReply(messageInfo, 'Error getting cache statistics')
      }
    },
  },

  clearcache: {
    description: 'Clear all cache entries',
    aliases: ['cclear'],
    category: 'Development', 
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const statsBefore = nameCache.getStats()
        const totalBefore = statsBefore.totalUsernames + statsBefore.totalGroupNames
        
        nameCache.clearAllCache()
        
        const successText = 
          `Cache Cleared Successfully!\n\n` +
          `Cleared: ${totalBefore} entries\n` +
          `Cache has been reset and will rebuild automatically`

        return await sock.sendReply(messageInfo, successText)
      } catch (error) {
        logger.error('Clear cache command error:', error)
        await sock.sendReply(messageInfo, 'Error clearing cache')
      }
    },
  },

  preloadcache: {
    description: 'Preload cache for current group',
    aliases: ['preload', 'warmcache'],
    category: 'Development',
    creatorOnly: true,
    groupOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const startTime = Date.now()
        const success = await nameCache.preloadGroupCache(messageInfo.jid)
        const duration = Date.now() - startTime
        
        if (success) {
          const stats = nameCache.getHitRateStats()
          const successText = 
            `✅ *Cache Preloaded Successfully!*\n\n` +
            `⏱️ *Duration:* ${duration}ms\n` +
            `📊 *Cache Stats:*\n` +
            `• Usernames: ${stats.validUsernames}/${stats.totalUsernames}\n` +
            `• Group Names: ${stats.validGroupNames}/${stats.totalGroupNames}\n` +
            `• Hit Rate: ${stats.hitRate}%\n` +
            `• Efficiency: ${stats.efficiency}%\n\n` +
            `🚀 Group cache is now optimized for faster responses!`

          return await sock.sendReply(messageInfo, successText)
        } else {
          return await sock.sendReply(messageInfo, '❌ Failed to preload cache for this group')
        }
      } catch (error) {
        logger.error('Preload cache command error:', error)
        await sock.sendReply(messageInfo, '❌ Error preloading cache')
      }
    },
  },

  cachehitstats: {
    description: 'Show detailed cache performance statistics',
    aliases: ['hitstats', 'cacheperf'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const stats = nameCache.getHitRateStats()
        
        const performanceText = 
          `📈 *Cache Performance Report*\n\n` +
          `🎯 *Hit Rate:* ${stats.hitRate}%\n` +
          `⚡ *Efficiency:* ${stats.efficiency}%\n` +
          `📊 *Cache Status:*\n` +
          `• Valid Usernames: ${stats.validUsernames}/${stats.totalUsernames}\n` +
          `• Valid Group Names: ${stats.validGroupNames}/${stats.totalGroupNames}\n` +
          `• Expired Entries: ${stats.expiredEntries}\n` +
          `• Update Interval: ${stats.updateInterval} minutes\n`

        return await sock.sendReply(messageInfo, performanceText)
      } catch (error) {
        logger.error('Cache hit stats command error:', error)
        await sock.sendReply(messageInfo, '❌ Error getting cache performance stats')
      }
    },
  },  reload: {
    description: 'Reload bot configuration and plugins',
    aliases: ['r', 'refresh'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        await sock.sendReply(messageInfo, '🔄 Reloading bot configuration and plugins...')

        botConfig.reload()
        logger.info('✅ Configuration reloaded')

        const pluginsReloaded = await sock.loadPlugins()
        
        if (pluginsReloaded) {
          const successText = 
            `🔄 *Bot Reloaded Successfully!*\n\n` +
            `✅ Configuration refreshed\n` +
            `✅ All plugins reloaded\n` +
            `✅ Command aliases updated\n\n` +
            `⚡ ${botConfig.name} is ready with the latest changes!`

          return await sock.sendReply(messageInfo, successText)
        } else {
          return await sock.sendReply(messageInfo, '❌ Failed to reload plugins. Check logs for details.')
        }
      } catch (error) {
        logger.error('Reload command error:', error)
        await sock.sendReply(messageInfo, '❌ Error reloading bot: ' + error.message)
      }
    },
  },

  clearauth: {
    description: 'Clear MongoDB authentication session (force re-login)',
    aliases: ['resetauth', 'logout'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        await sock.sendReply(messageInfo, '🗑️ Clearing authentication session...')
        
        const { mongoAuthService } = await import('../../database/authService.js')
        const cleared = await mongoAuthService.clearAllSessions()
        
        const successText = 
          `✅ *Authentication Reset Complete*\n\n` +
          `🗑️ *Sessions Cleared:* ${cleared}\n` +
          `📱 *Status:* Bot will request QR code on next restart\n\n` +
          `💡 *Next Steps:*\n` +
          `• Restart the bot: \`npm start\`\n` +
          `• Scan the new QR code to reconnect\n` +
          `• All session data will be fresh`

        return await sock.sendReply(messageInfo, successText)
      } catch (error) {
        logger.error('Clear auth command error:', error)
        await sock.sendReply(messageInfo, '❌ Error clearing authentication session')
      }
    },
  },
  mongotest: {
    description: 'Test MongoDB connection and auth system',
    aliases: ['dbtest', 'testmongo'],
    category: 'Development',
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        await sock.sendReply(messageInfo, 'Testing MongoDB connection...')
        
        const { isMongoConnected } = await import('../../database/connection.js')
        const { mongoAuthService } = await import('../../database/authService.js')
        const { User, Message, Session } = await import('../../database/mongoSchema.js')
        
        const isConnected = await isMongoConnected()
        const sessionExists = await mongoAuthService.getSession()
        
        const userCount = isConnected ? await User.countDocuments() : 0
        const messageCount = isConnected ? await Message.countDocuments() : 0
        const sessionCount = isConnected ? await Session.countDocuments() : 0
        
        const testResults = 
          `📊 *MongoDB Connection Test*\n\n` +
          `🔌 *Connection:* ${isConnected ? '✅ Active' : '❌ Failed'}\n` +
          `📱 *Auth Session:* ${sessionExists ? '✅ Exists' : '❌ Not Found'}\n` +
          `� *Users:* ${userCount}\n` +
          `� *Messages:* ${messageCount}\n` +
          `🔑 *Sessions:* ${sessionCount}\n\n` +
          `${isConnected ? 
            '🟢 *Status:* MongoDB is working correctly' : 
            '🔴 *Status:* MongoDB connection issues detected'}`

        return await sock.sendReply(messageInfo, testResults)
      } catch (error) {
        logger.error('MongoDB test command error:', error)
        await sock.sendReply(messageInfo, '❌ Error testing MongoDB connection')
      }
    },
  },
}
