import { pluginCommands } from './plugins/index.js'
import { logger } from '../utils/logger.js'
import { botConfig } from '../config/botConfig.js'

class CommandManager {
  constructor () {
    this.commands = {
      ...pluginCommands,
      help: {
        description: 'Show available commands',
        aliases: ['h', 'commands', 'cmd', 'menu'],
        category: 'Core',
        handler: async (sock, messageInfo) => {
          const username = messageInfo.username || messageInfo.sender.split('@')[0]
          const prefix = botConfig.prefix

          // Group commands by category
          const categories = {}
          Object.entries(commandManager.commands).forEach(([cmd, data]) => {
            const category = data.category || 'General'
            if (!categories[category]) categories[category] = []
            categories[category].push({ cmd, ...data })
          })

          // Build dynamic help text
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

          helpText += `\n⚙️ Current Prefix: \`${prefix}\`\n`
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

    // Build alias map for quick lookup
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
    // Remove prefix from input
    const cleanInput = input.startsWith(botConfig.prefix) ? input.slice(botConfig.prefix.length) : input

    // Extract just the command part (before any spaces/arguments)
    const commandPart = cleanInput.split(' ')[0]

    // Check if it's a direct command
    if (this.commands[commandPart]) {
      return commandPart
    }

    // Check if it's an alias
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

      const commandHandler = this.commands[resolvedCommand] // Check if command is group-only
      if (commandHandler.groupOnly && !messageInfo.jid.includes('@g.us')) {
        return await sock.sendReply(messageInfo, '❌ This command can only be used in groups!')
      }
      // Check if command requires creator privileges
      if (commandHandler.creatorOnly) {
        const isCreator = botConfig.isCreator(messageInfo.sender)
        if (!isCreator) {
          return await sock.sendReply(messageInfo, '❌ This command can only be used by the bot creator!')
        }
      }

      // Check if command is locked
      if (commandHandler.locked) {
        return await sock.sendReply(
          messageInfo,
          `❌ Command "${resolvedCommand}" is currently locked and cannot be used.`
        )
      }

      // Check if command requires moderator privileges
      if (commandHandler.modsOnly) {
        if (!botConfig.isCreator(messageInfo.sender) && !botConfig.isMod(messageInfo.sender)) {
          return await sock.sendReply(messageInfo, '❌ This command is restricted to moderators only!')
        }

        // Check if command requires admin privileges (for group admin check)
        if (commandHandler.adminOnly) {
          const isAdmin = await this.checkIfAdmin(sock, messageInfo)
          if (!isAdmin) {
            await sock.sendReply(messageInfo, '❌ This command can only be used by group admins!')
            return
          }
        }
      }

      // Execute the command
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

  // Future method to check admin status
  async checkIfAdmin (sock, messageInfo) {
    try {
      if (!messageInfo.jid.includes('@g.us')) return false

      const groupMetadata = await sock.groupMetadata(messageInfo.jid)
      const participant = groupMetadata.participants.find(p => p.id === messageInfo.sender)

      return participant && (participant.admin === 'admin' || participant.admin === 'superadmin')
    } catch (error) {
      logger.error('Error checking admin status:', error)
      return false
    }
  }
}

export const commandManager = new CommandManager()
