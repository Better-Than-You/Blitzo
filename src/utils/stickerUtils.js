import sharp from 'sharp';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { downloadMediaMessage } from 'baileys';
import { botConfig } from '../config/botConfig.js';
import { mediaCache } from '../cache/mediaCache.js';
import { logger } from './logger.js';
import removeBg from 'remove.bg';

export class StickerUtils {
    static async downloadMedia(sock, messageInfo) {
        try {
            const mediaTypes = ['imageMessage', 'videoMessage', 'stickerMessage'];
            
            // Try current message
            const currentMessage = messageInfo.originalMessage?.message;
            if (currentMessage) {
                for (const mediaType of mediaTypes) {
                    if (currentMessage[mediaType]) {
                        try {
                            const buffer = await downloadMediaMessage(messageInfo.originalMessage, 'buffer', {});
                            if (buffer?.length > 0) {
                                return { buffer, mediaType, mimetype: currentMessage[mediaType].mimetype || '' };
                            }
                        } catch (error) {
                            logger.error(`Failed to download ${mediaType}: ${error.message}`);
                        }
                    }
                }
            }
            
            // Try quoted message
            if (messageInfo.quotedMessage) {
                for (const mediaType of mediaTypes) {
                    if (messageInfo.quotedMessage[mediaType]) {
                        const contextInfo = messageInfo.originalMessage?.message?.extendedTextMessage?.contextInfo;
                        if (contextInfo?.stanzaId) {
                            const quotedMessageObj = {
                                key: {
                                    remoteJid: messageInfo.jid,
                                    fromMe: false,
                                    id: contextInfo.stanzaId,
                                    participant: contextInfo.participant
                                },
                                message: messageInfo.quotedMessage
                            };
                            
                            try {
                                const buffer = await downloadMediaMessage(quotedMessageObj, 'buffer', {});
                                if (buffer?.length > 0) {
                                    return { buffer, mediaType, mimetype: messageInfo.quotedMessage[mediaType].mimetype || '' };
                                }
                            } catch (error) {
                                logger.error(`Failed to download quoted ${mediaType}: ${error.message}`);
                            }
                        }
                    }
                }
            }
            return null;
        } catch (error) {
            logger.error('Error in downloadMedia:', error.message);
            return null;
        }
    }

    static async cropToSquare(imageBuffer) {
        const image = sharp(imageBuffer);
        const { width, height, hasAlpha, format } = await image.metadata();
        const size = Math.min(width, height);
        const left = Math.round((width - size) / 2);
        const top = Math.round((height - size) / 2);
        
        return image
            .extract({ left, top, width: size, height: size })
            .ensureAlpha()
            .png()
            .toBuffer();
    }

    static async getImageInfo(imageBuffer) {
        const metadata = await sharp(imageBuffer).metadata();
        const transparency = await this.detectTransparency(imageBuffer);
        
        return {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels,
            space: metadata.space,
            hasAlpha: metadata.hasAlpha,
            transparency
        };
    }

    static async detectTransparency(imageBuffer) {
        try {
            const image = sharp(imageBuffer);
            const { channels, hasAlpha, format } = await image.metadata();
            
            if (hasAlpha || channels === 4) return true;
            
            if (format === 'png') {
                try {
                    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
                    if (info.channels === 4) {
                        for (let i = 3; i < data.length; i += 4) {
                            if (data[i] < 255) return true;
                        }
                    }
                } catch {
                    return true;
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    static async imageToSticker(imageBuffer, options = {}) {
        if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            throw new Error('Invalid image buffer');
        }
        
        const metadata = await sharp(imageBuffer).metadata();
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
            imageBuffer = await sharp(imageBuffer).png().toBuffer();
        }
        
        const { 
            pack = botConfig.name, 
            author = botConfig.creator.name,
            crop = false,
            preserveTransparency = true,
            forceTransparent = false
        } = options;
        
        let processedBuffer = imageBuffer;
        
        if (forceTransparent) {
            const backgroundRemovedBuffer = await this.removeBackground(processedBuffer);
            processedBuffer = await sharp(backgroundRemovedBuffer).ensureAlpha().png().toBuffer();
            
            try {
                await mediaCache.cacheMediaDirect(processedBuffer, `transparent_${Date.now()}.png`, 'png', 'image/png');
            } catch {}
        }
        
        if (crop) processedBuffer = await this.cropToSquare(processedBuffer);
        
        processedBuffer = await sharp(processedBuffer).png({ quality: 90, compressionLevel: 6 }).toBuffer();
        
        const sticker = new Sticker(processedBuffer, {
            pack,
            author,
            type: StickerTypes.FULL,
            categories: ["🤩", "🎉"],
            id: Date.now().toString(),
            quality: 90,
            background: (preserveTransparency || forceTransparent) ? "transparent" : "#FFFFFF"
        });
        
        return sticker.toBuffer();
    }

    static async stickerToImage(stickerBuffer) {
        return sharp(stickerBuffer).png().toBuffer();
    }

    static async gifToSticker(gifBuffer, options = {}) {
        return this.createSticker(gifBuffer, options, 80);
    }

    static async videoToSticker(videoBuffer, duration = 6, options = {}) {
        return this.createSticker(videoBuffer, options, 80);
    }

    static async createSticker(buffer, options, quality) {
        const { pack = botConfig.name, author = botConfig.creator.name } = options;
        
        const sticker = new Sticker(buffer, {
            pack,
            author,
            type: StickerTypes.FULL,
            categories: ["🤩", "🎉"],
            id: Date.now().toString(),
            quality,
            background: "transparent"
        });
        
        return sticker.toBuffer();
    }

    static async removeBackground(imageBuffer) {
        try {
            const apiKey = process.env.REMOVEBG_API_KEY;
            if (!apiKey || apiKey === 'your_removebg_api_key_here') return imageBuffer;
            
            const result = await removeBg.removeBackgroundFromImageBase64({
                base64img: imageBuffer.toString('base64'),
                apiKey,
                size: 'regular',
                type: 'auto',
                format: 'png'
            });
            
            return result?.base64img ? Buffer.from(result.base64img, 'base64') : imageBuffer;
        } catch (error) {
            logger.error('Error removing background:', error.message);
            return imageBuffer;
        }
    }

    static isFFmpegAvailable() {
        return Promise.resolve(true);
    }
}
