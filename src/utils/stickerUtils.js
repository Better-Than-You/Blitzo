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
        return this.createCompressedSticker(gifBuffer, options, 80, 'gif');
    }

    static async videoToSticker(videoBuffer, duration = 6, options = {}) {
        return this.createCompressedSticker(videoBuffer, options, 80, 'video', duration);
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

    static async createCompressedSticker(buffer, options = {}, initialQuality = 80, mediaType = 'gif', duration = 6) {
        const { pack = botConfig.name, author = botConfig.creator.name } = options;
        const timestamp = Date.now();
        
        try {
            // First, try to compress the input buffer if it's too large
            let processedBuffer = buffer;
            
            if (mediaType === 'gif' || mediaType === 'video') {
                // For GIF/Video, try to optimize the input first
                processedBuffer = await this.optimizeMediaForSticker(buffer, mediaType, duration);
            }
            
            let quality = initialQuality;
            let stickerBuffer;
            let attempts = 0;
            const maxAttempts = 5;
            
            // Iteratively reduce quality until size is under 750KB
            do {
                attempts++;
                
                const sticker = new Sticker(processedBuffer, {
                    pack,
                    author,
                    type: StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: timestamp.toString(),
                    quality,
                    background: "transparent"
                });
                
                stickerBuffer = await sticker.toBuffer();
                
                const sizeCheck = this.isStickerSizeCompliant(stickerBuffer);
                
                if (sizeCheck.compliant) {
                    logger.info(`Sticker size compliant: ${sizeCheck.sizeFormatted} (quality: ${quality}%)`);
                    break;
                }
                
                // Reduce quality for next attempt
                quality = Math.max(20, quality - 60); // Reduce by 60% each time
                
                logger.warn(`Sticker size ${sizeCheck.sizeFormatted} exceeds ${sizeCheck.maxSizeFormatted}, reducing quality to ${quality}% (attempt ${attempts}/${maxAttempts})`);
                
            } while (!this.isStickerSizeCompliant(stickerBuffer).compliant && attempts < maxAttempts);
            
            // Final size check and warning
            const finalSizeCheck = this.isStickerSizeCompliant(stickerBuffer);
            if (!finalSizeCheck.compliant) {
                logger.warn(`Warning: Final sticker size ${finalSizeCheck.sizeFormatted} still exceeds ${finalSizeCheck.maxSizeFormatted} after ${attempts} compression attempts`);
            }
            
            // Cache the compressed sticker
            try {
                const cacheKey = `sticker_${mediaType}_${timestamp}_q${quality}`;
                await mediaCache.cacheMediaDirect(
                    stickerBuffer, 
                    `${cacheKey}.webp`, 
                    'webp', 
                    'image/webp'
                );
                
                logger.info(`Cached compressed ${mediaType} sticker: ${cacheKey}, size: ${this.formatFileSize(stickerBuffer.length)}, quality: ${quality}%`);
            } catch (cacheError) {
                logger.error('Failed to cache sticker:', cacheError.message);
            }
            
            return stickerBuffer;
            
        } catch (error) {
            logger.error(`Error creating compressed ${mediaType} sticker:`, error.message);
            // Fallback to original method
            return this.createSticker(buffer, options, Math.max(20, initialQuality - 20));
        }
    }

    static async optimizeMediaForSticker(buffer, mediaType, duration = 6) {
        try {
            if (mediaType === 'gif') {
                // For GIFs, we can use sharp to optimize
                return await sharp(buffer, { animated: true })
                    .resize(512, 512, { 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .gif({ 
                        loop: 0,
                        delay: 100, // Increase delay to reduce file size
                        effort: 7 // Higher effort for better compression
                    })
                    .toBuffer();
            } else if (mediaType === 'video') {
                // For videos, we need to convert to GIF first or use the original buffer
                // Since we don't have ffmpeg integration here, return original buffer
                // In a production environment, you might want to use ffmpeg to:
                // - Resize to max 512x512
                // - Limit to 6 seconds
                // - Reduce frame rate
                // - Compress
                return buffer;
            }
            
            return buffer;
        } catch (error) {
            logger.error(`Error optimizing ${mediaType}:`, error.message);
            return buffer;
        }
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

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static isStickerSizeCompliant(buffer) {
        const maxSizeBytes = 1024 * 750; // 750KB
        return {
            compliant: buffer.length <= maxSizeBytes,
            size: buffer.length,
            sizeFormatted: this.formatFileSize(buffer.length),
            maxSize: maxSizeBytes,
            maxSizeFormatted: this.formatFileSize(maxSizeBytes)
        };
    }
}
