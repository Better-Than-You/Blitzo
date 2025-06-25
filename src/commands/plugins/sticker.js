import { StickerUtils } from '../../utils/stickerUtils.js'

export const stickerCommands = {
  sticker: {
    description: 'Convert image/gif/video to sticker',
    aliases: ['s'],
    category: 'Utility',
    handler: async (sock, messageInfo) => {
      try {
        const args = (messageInfo.text || '').split(' ').slice(1)

        // Check for flags
        let argCount = 0
        const shouldCrop = args.includes('-cr')
        const forceTransparent = args.includes('-tp')
        if (shouldCrop) argCount++
        if (forceTransparent) argCount++

        const packName = args[argCount] || undefined
        const authorName = args[argCount + 1] || undefined

        const media = await StickerUtils.downloadMedia(sock, messageInfo)

        if (!media) {
          return await sock.sendReply(
            messageInfo,
            '❌ Please reply to an image, gif, or video to convert it to sticker!'
          )
        }

        // console.log('Media info:', {
        //   hasBuffer: !!media.buffer,
        //   bufferLength: media.buffer?.length,
        //   mediaType: media.mediaType,
        //   mimetype: media.mimetype
        // })

        const { buffer, mediaType, mimetype } = media
        let stickerBuffer

        let statusMessage = '⏳ Converting to sticker...'
        if (forceTransparent) {
          statusMessage = '⏳ Removing background and creating transparent sticker...'
        }
        if (shouldCrop) {
          statusMessage += ' (with 1:1 crop)'
        }

        await sock.sendReply(messageInfo, statusMessage)

        switch (mediaType) {
          case 'imageMessage':
            stickerBuffer = await StickerUtils.imageToSticker(buffer, {
              pack: packName,
              author: authorName,
              crop: shouldCrop,
              preserveTransparency: true,
              forceTransparent: forceTransparent,
            })
            break

          case 'videoMessage':
            if (mimetype.includes('gif')) {
              stickerBuffer = await StickerUtils.gifToSticker(buffer, {
                pack: packName,
                author: authorName,
              })
            } else {
              stickerBuffer = await StickerUtils.videoToSticker(buffer, 6, {
                pack: packName,
                author: authorName,
              })
            }
            break

          default:
            return await sock.sendReply(messageInfo, '❌ Unsupported media type! Please use image, gif, or video.')
        }

        await sock.sendMessage(messageInfo.jid, {
          sticker: stickerBuffer,
        })
      } catch (error) {
        console.error('Sticker conversion error:', error)
        await sock.sendReply(messageInfo, '❌ Failed to convert media to sticker! Please try with a different image.')
      }
    },
  },

  toimage: {
    description: 'Convert sticker to image',
    aliases: ['toimg', 'stickertoimage'],
    category: 'Utility',
    handler: async (sock, messageInfo) => {
      try {
        const media = await StickerUtils.downloadMedia(sock, messageInfo)

        if (!media || media.mediaType !== 'stickerMessage') {
          return await sock.sendReply(messageInfo, '❌ Please reply to a sticker to convert it to image!')
        }

        await sock.sendReply(messageInfo, '⏳ Converting sticker to image...')

        const imageBuffer = await StickerUtils.stickerToImage(media.buffer)

        await sock.sendMessage(messageInfo.jid, {
          image: imageBuffer,
          caption: '✅ Sticker converted to image!',
        })
      } catch (error) {
        console.error('Sticker to image conversion error:', error)
        await sock.sendReply(messageInfo, '❌ Failed to convert sticker to image! Please try again.')
      }
    },
  },

  takestick: {
    description: 'Convert image to sticker with custom pack and author',
    aliases: ['take', 'steal'],
    category: 'Utility',
    handler: async (sock, messageInfo) => {
      try {
        const args = (messageInfo.text || '').split(' ').slice(1)
        const packName = args[0] || undefined
        const authorName = args[1] || undefined

        // Check for flags
        const shouldCrop = args.includes('-cr')
        const forceTransparent = args.includes('-tp')

        const media = await StickerUtils.downloadMedia(sock, messageInfo)

        if (!media) {
          return await sock.sendReply(
            messageInfo,
            '❌ Please reply to an image to convert it to sticker!\n\n📖 Usage: /takestick [pack_name] [author_name] [-cr] [-tp]'
          )
        }

        const { buffer, mediaType } = media

        if (mediaType !== 'imageMessage') {
          return await sock.sendReply(
            messageInfo,
            '💡 Use `/sticker` command for gif/video conversion.\n\n📖 `/takestick` works with images only.'
          )
        }

        let stickerText = '⏳ Converting image to sticker...'
        if (packName && authorName) {
          stickerText = `⏳ Creating sticker with pack: "${packName}" by "${authorName}"...`
        }
        if (forceTransparent) {
          stickerText += ' (background removed)'
        }
        if (shouldCrop) {
          stickerText += ' (with 1:1 crop)'
        }

        await sock.sendReply(messageInfo, stickerText)

        const stickerBuffer = await StickerUtils.imageToSticker(buffer, {
          pack: packName,
          author: authorName,
          crop: shouldCrop,
          preserveTransparency: true,
          forceTransparent: forceTransparent,
        })

        await sock.sendMessage(messageInfo.jid, {
          sticker: stickerBuffer,
        })
      } catch (error) {
        console.error('Takestick error:', error)
        await sock.sendReply(messageInfo, '❌ Failed to create sticker! Please try with a different image.')
      }
    },
  },
}
