import { pluginCommands } from './plugins/index.js'
import { logger } from '../utils/logger.js'
import { botConfig } from '../config/botConfig.js'
import { nameCache } from '../cache/nameCache.js'

class CommandManager {
  constructor () {
    this.commands = {
      ...pluginCommands,
      help: {
        description: 'Show available commands',
        aliases: ['h', 'commands', 'cmd'],
        category: 'Core',
        handler: async (sock, messageInfo) => {
          const username = messageInfo.username || messageInfo.sender.split('@')[0]
          const prefix = botConfig.prefix

          if (messageInfo.arguments.length > 0) {
            const commandName = messageInfo.arguments[0]
            const commandData = this.getCommandWithAliases(commandName)

            if (!commandData) {
              return await sock.sendReply(
                messageInfo,
                `❓ Command "${commandName}" not found. Type ${prefix}help for available commands.`
              )
            }

            let commandText = `✨ *Command Information* ✨\n\n📌 *Name:* \`${commandData.command}\`\n📝 *Description:* ${commandData.description || 'No description available.'}\n📂 *Category:* ${commandData.category || 'General'}\n🔗 *Aliases:* ${commandData.aliases ? '`' + commandData.aliases.join('`, `') + '`' : 'None'}\n💡 *Usage:* \`${prefix}${commandData.command} [arguments]\`\n\n⚠️ *Restrictions:*\n`

            if (commandData.groupOnly) {
              commandText += 'This command can only be used in groups.\n'
            }
            if (commandData.adminOnly) {
              commandText += 'This command requires admin privileges.\n'
            }
            if (commandData.modsOnly) {
              commandText += 'This command is restricted to moderators only.\n'
            }
            if (commandData.creatorOnly) {
              commandText += 'This command can only be used by the bot creator.\n'
            }

            return await sock.sendReply(messageInfo, commandText)
          }
          const categories = {}
          Object.entries(commandManager.commands).forEach(([cmd, data]) => {
            const category = data.category || 'General'
            if (!categories[category]) categories[category] = []
            categories[category].push({ cmd, ...data })
          })

          let helpText = `👋 Hello *${username}*!\n`
          helpText += `⚡ Welcome to ${botConfig.name}!\n`
          helpText += `📋 *Available Commands:*\n`

          Object.entries(categories).forEach(([category, cmds]) => {
            function center(str, width, fill = ' ') {
              if (width <= str.length) {
                return str
              }

              const leftPadding = Math.floor((width - str.length) / 2)
              const rightPadding = width - str.length - leftPadding

              return fill.repeat(leftPadding) + str + fill.repeat(rightPadding)
            }

            helpText += `\n${center(` *${category}* `, 51, '-')}\n`
            cmds.forEach(data => {
              let line = `\`${data.cmd}\``
              if (data.groupOnly) {
                line += ' [group]'
              }
              if (data.adminOnly) {
                line += ' [admin]'
              }
              if (data.modsOnly) {
                line += ' [mods]'
              }
              if (data.creatorOnly) {
                line += ' [creator]'
              }
              line += ` - ${data.description || ''}`
              helpText += line + '\n'
            })
          })

          helpText += `\n⚙️  Current Prefix: \`${prefix}\`\n`
          helpText += `\`⚡ Powered by ${botConfig.name}\``

          await sock.sendMessage(messageInfo.jid, { text: helpText }, { quoted: messageInfo.originalMessage })
        },
      },
      lock: {
        description: 'Lock certain commands',
        aliases: ['lockcmd', 'lockcommand'],
        category: 'Core',
        modsOnly: true,
        handler: async (sock, messageInfo) => {
          const commandToLock = messageInfo.arguments[0]
          if (!commandToLock) {
            await sock.sendReply(messageInfo, '❌ Please specify a command to lock.')
            return
          }

          if (!this.commands[commandToLock]) {
            await sock.sendReply(messageInfo, `❓ Command "${commandToLock}" not found. Please check the command name.`)
            return
          }

          this.commands[commandToLock].locked = true
          await sock.sendReply(
            messageInfo,
            `✅ Command "${commandToLock}" has been locked and cannot be used until unlocked.`
          )
        },
      },
      unlock: {
        description: 'Unlock certain commands',
        aliases: ['unlockcmd', 'unlockcommand'],
        category: 'Core',
        modsOnly: true,
        handler: async (sock, messageInfo) => {
          const commandToUnlock = messageInfo.arguments[0]
          if (!commandToUnlock) {
            await sock.sendReply(messageInfo, '❌ Please specify a command to unlock.')
            return
          }

          if (!this.commands[commandToUnlock]) {
            await sock.sendReply(
              messageInfo,
              `❓ Command "${commandToUnlock}" not found. Please check the command name.`
            )
            return
          }

          this.commands[commandToUnlock].locked = false
          await sock.sendReply(messageInfo, `✅ Command "${commandToUnlock}" has been unlocked and can be used again.`)
        },
      },
    }

    this.aliases = {}
    this.buildAliasMap()
  }

  buildAliasMap () {
    Object.keys(this.commands).forEach(command => {
      const commandData = this.commands[command]
      if (commandData.aliases) {
        commandData.aliases.forEach(alias => {
          this.aliases[alias] = command
        })
      }
    })
  }
  resolveCommand (input) {
    const cleanInput = input.startsWith(botConfig.prefix) ? input.slice(botConfig.prefix.length) : input

    const commandPart = cleanInput.split(' ')[0]

    if (this.commands[commandPart]) {
      return commandPart
    }

    if (this.aliases[commandPart]) {
      return this.aliases[commandPart]
    }

    return null
  }

  async handleCommand (sock, messageInfo, command) {
    try {
      const resolvedCommand = this.resolveCommand(command)
      if (!resolvedCommand) {
        await sock.sendReply(
          messageInfo,
          `❓ Unknown command: "${command}". Type ${botConfig.prefix}help for available commands.`
        )
        return
      }

      const commandHandler = this.commands[resolvedCommand] 

      // Group only check
      if (commandHandler.groupOnly && !messageInfo.jid.includes('@g.us')) {
        return await sock.sendReply(messageInfo, '❌ This command can only be used in groups!')
      }

      // Creator only check
      if (commandHandler.creatorOnly) {
        const isCreator = botConfig.isCreator(messageInfo.sender)
        if (!isCreator) {
          return await sock.sendReply(messageInfo, '❌ This command can only be used by the bot creator!')
        }
      }

      // Lock check
      if (commandHandler.locked) {
        return await sock.sendReply(
          messageInfo,
          `❌ Command "${resolvedCommand}" is currently locked and cannot be used.`
        )
      }

      // Mods only check
      if (commandHandler.modsOnly) {
        const isCreator = botConfig.isCreator(messageInfo.sender)
        const isMod = botConfig.isMod(messageInfo.sender)
        
        if (!isCreator && !isMod) {
          return await sock.sendReply(messageInfo, '❌ This command is restricted to moderators only!')
        }
      }

      // Admin only check
      if (commandHandler.adminOnly) {
        const isAdmin = await this.checkIfAdmin(sock, messageInfo)
        if (!isAdmin) {
          await sock.sendReply(messageInfo, '❌ This command can only be used by group admins!')
          return
        }
      }

      // Executing the command
      await commandHandler.handler(sock, messageInfo)
    } catch (error) {
      await sock.sendReply(messageInfo, '❌ An error occurred while processing your command. Please try again later.')
      logger.error(`Command "${command}" failed for ${messageInfo.sender}:`, error)
    }
  }
  getCommandList () {
    return Object.keys(this.commands)
  }

  getAliasList () {
    return Object.keys(this.aliases)
  }

  getAllCommands () {
    return [...this.getCommandList(), ...this.getAliasList()]
  }

  getCommandInfo (command) {
    const resolvedCommand = this.resolveCommand(command)
    return resolvedCommand ? this.commands[resolvedCommand] : null
  }

  getCommandWithAliases (command) {
    const commandData = this.commands[command]
    if (!commandData) return null

    return {
      command,
      ...commandData,
      allCommands: [command, ...(commandData.aliases || [])],
    }
  }  

  async checkIfAdmin (sock, messageInfo) {
    try {
      if (!messageInfo.jid.includes('@g.us')) return false

      // Cache admin check
      return await nameCache.isGroupAdmin(messageInfo.sender, messageInfo.jid)
    } catch (error) {
      logger.error('Error checking admin status:', error)
      return false
    }
  }  

  async reloadPlugins () {
    try {
      logger.info('🔄 Reloading plugins...')
      
      // Ummm... idk, it works so dont change it :)
      const timestamp = Date.now()
      const [
        { coreCommands },
        { groupCommands },
        { developmentCommands },
        { moderationCommands }
      ] = await Promise.all([
        import(`./plugins/core.js?v=${timestamp}`),
        import(`./plugins/group.js?v=${timestamp}`),
        import(`./plugins/development.js?v=${timestamp}`),
        import(`./plugins/moderation.js?v=${timestamp}`)
      ])

      // Rebuilding the command map... again :)
      const pluginCommands = {
        ...coreCommands,
        ...groupCommands,
        ...developmentCommands,
        ...moderationCommands
      }
      
      const coreCommands_preserved = {
        help: this.commands.help,
        lock: this.commands.lock,
        unlock: this.commands.unlock
      }
      
      this.commands = {
        ...coreCommands_preserved,
        ...pluginCommands
      }
      
      this.aliases = {}
      this.buildAliasMap()
      
      logger.success('✅ Plugins reloaded successfully!')
      return true
    } catch (error) {
      logger.error('❌ Failed to reload plugins:', error)
      return false
    }
  }
}

export const commandManager = new CommandManager()
