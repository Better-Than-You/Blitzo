import { logger } from '../../utils/logger.js'
import { nameCache } from '../../cache/nameCache.js'

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
    }
  },

  clearcache: {
    description: 'Clear cache entries (use -name flag for name cache only)',
    aliases: ['cclear'],
    category: 'Development', 
    creatorOnly: true,
    handler: async (sock, messageInfo) => {
      try {
        const args = messageInfo.arguments
        const nameFlag = args.includes('-name')
        
        if (nameFlag) {
          // Clear only name cache
          const statsBefore = nameCache.getStats()
          const totalBefore = statsBefore.totalUsernames + statsBefore.totalGroupNames
          
          nameCache.clearAllCache()
          
          const successText = 
            `Name Cache Cleared Successfully!\n\n` +
            `Cleared: ${totalBefore} entries\n` +
            `Name cache has been reset and will rebuild automatically`

          return await sock.sendReply(messageInfo, successText)
        } else {
          // Clear media cache by default
          const { mediaCache } = await import('../../cache/mediaCache.js')
          const { removedCount, removedSize } = mediaCache.clearAll()
          
            const successText = 
            `🗑️  Cleared all media cache: ${removedCount} files (${(removedSize/1024/1024).toFixed(2)} MB)`
          return await sock.sendReply(messageInfo, successText)
        }
      } catch (error) {
        logger.error('Clear cache command error:', error)
        await sock.sendReply(messageInfo, 'Error clearing cache')
      }
    }
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
    }
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
        
        if (result.success) {
          return await sock.sendReply(messageInfo, `✅ Plugins reloaded successfully!`)
        } else {
          return await sock.sendReply(messageInfo, `❌ Failed to reload plugins: ${result.error}`)
        }
      } catch (error) {
        logger.error('Reload plugins command error:', error)
        await sock.sendReply(messageInfo, '❌ Error reloading plugins')
      }
    }
  }
}
