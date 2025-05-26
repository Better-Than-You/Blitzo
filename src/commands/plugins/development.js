import { logger } from '../../utils/logger.js'

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
          await sock.sendReply(messageInfo, '❌ Please provide code to evaluate. Usage: `!eval <code>`')
          return
        }
        // eslint-disable-next-line no-eval
        let result = await eval(`(async () => { ${code} })()`)
        if (typeof result !== 'string') {
          result = JSON.stringify(result, null, 2)
        }
        return await sock.sendMessage(messageInfo, `✅ Eval Result:\n\`\`\`\n${result}\n\`\`\``)
      } catch (err) {q
        await sock.sendReply(messageInfo, `❌ Eval Error:\n\`\`\`\n${err}\n\`\`\``)
        logger.error('Eval command error:', err)
      }
    },
  },
}
