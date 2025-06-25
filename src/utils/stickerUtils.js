import sharp from 'sharp';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { downloadMediaMessage } from 'baileys';
import { botConfig } from '../config/botConfig.js';
import { mediaCache } from '../cache/mediaCache.js';
import { logger } from './logger.js';
import removeBg from 'remove.bg';

// Enhanced Sticker Utilities using wa-sticker-formatter:
// - Transparent PNG support with proper alpha channel preservation
// - Background removal using remove.bg API
// - 1:1 ratio cropping for square stickers  
// - Automatic transparency detection and background removal
// - Configurable pack and author metadata
// - Media caching for improved performance

export class StickerUtils {
    static async downloadMedia(sock, messageInfo) {
        try {
            // Method 1: Direct media from current message
            const currentMessage = messageInfo.originalMessage?.message;
            if (currentMessage) {
                // Check for direct media
                for (const mediaType of ['imageMessage', 'videoMessage', 'stickerMessage']) {
                    if (currentMessage[mediaType]) {
                        try {
                            const buffer = await downloadMediaMessage(messageInfo.originalMessage, 'buffer', {});
                            if (buffer && buffer.length > 0) {
                                return {
                                    buffer,
                                    mediaType,
                                    mimetype: currentMessage[mediaType].mimetype || ''
                                };
                            }
                        } catch (error) {
                            logger.error(`Failed to download ${mediaType}: ${error.message}`);
                        }
                    }
                }
            }
            
            // Method 2: Quoted message media
            if (messageInfo.quotedMessage) {
                for (const mediaType of ['imageMessage', 'videoMessage', 'stickerMessage']) {
                    if (messageInfo.quotedMessage[mediaType]) {
                        // Try to construct the quoted message object
                        const contextInfo = messageInfo.originalMessage?.message?.extendedTextMessage?.contextInfo;
                        if (contextInfo && contextInfo.stanzaId) {
                            const quotedMessageObj = {
                                key: {
                                    remoteJid: messageInfo.jid,
                                    fromMe: false,
                                    id: contextInfo.stanzaId,
                                    participant: contextInfo.participant || undefined
                                },
                                message: messageInfo.quotedMessage
                            };
                            
                            try {
                                const buffer = await downloadMediaMessage(quotedMessageObj, 'buffer', {});
                                if (buffer && buffer.length > 0) {
                                    return {
                                        buffer,
                                        mediaType,
                                        mimetype: messageInfo.quotedMessage[mediaType].mimetype || ''
                                    };
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
        try {
            const image = sharp(imageBuffer);
            const { width, height, hasAlpha, format } = await image.metadata();
            
            // Determine the size for cropping (use the smaller dimension)
            const size = Math.min(width, height);
            
            // Calculate the crop position to center the image
            const left = Math.round((width - size) / 2);
            const top = Math.round((height - size) / 2);
            
            let processor = image.extract({ left, top, width: size, height: size });
            
            // Always output as PNG to ensure compatibility
            if (hasAlpha || format === 'png') {
                processor = processor.ensureAlpha().png();
            } else {
                processor = processor.png();
            }
            
            const croppedImage = await processor.toBuffer();
            
            return croppedImage;
        } catch (error) {
            console.error('Error cropping image to square:', error);
            throw error;
        }
    }

    static async getImageInfo(imageBuffer) {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const transparency = await this.detectTransparency(imageBuffer);
            
            return {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels,
                space: metadata.space,
                hasAlpha: metadata.hasAlpha,
                transparency: transparency
            };
        } catch (error) {
            console.error('Error getting image info:', error);
            throw error;
        }
    }

    static async detectTransparency(imageBuffer) {
        try {
            const image = sharp(imageBuffer);
            const { channels, hasAlpha, format } = await image.metadata();
            
            // Primary check: metadata indicates alpha channel
            if (hasAlpha || channels === 4) {
                return true;
            }
            
            // Secondary check for PNG files (they might have transparency without alpha flag)
            if (format === 'png') {
                try {
                    // Check if any pixels have transparency by examining the raw data
                    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
                    
                    if (info.channels === 4) {
                        // Check alpha channel (every 4th byte)
                        for (let i = 3; i < data.length; i += 4) {
                            if (data[i] < 255) {
                                return true;
                            }
                        }
                    }
                } catch (rawError) {
                    return true; // Assume PNG has transparency if we can't analyze
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error detecting transparency:', error);
            return false;
        }
    }

    static async imageToSticker(imageBuffer, options = {}) {
        try {
            // Validate input buffer
            if (!imageBuffer) {
                throw new Error('No image buffer provided');
            }
            
            if (!Buffer.isBuffer(imageBuffer)) {
                throw new Error('Input is not a valid buffer');
            }
            
            if (imageBuffer.length === 0) {
                throw new Error('Image buffer is empty');
            }
            
            // Try to validate the image format
            try {
                const metadata = await sharp(imageBuffer).metadata();
                
                // Convert JPEG to PNG to avoid jpegload_buffer issues
                if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                    imageBuffer = await sharp(imageBuffer)
                        .png()
                        .toBuffer();
                }
                
            } catch (metadataError) {
                throw new Error(`Invalid image format: ${metadataError.message}`);
            }
            
            const { 
                pack = botConfig.name, 
                author = botConfig.creator.name,
                crop = false,
                preserveTransparency = true,
                forceTransparent = false
            } = options;
            
            let processedBuffer = imageBuffer;
            
            // Handle --tp flag: remove background and create transparent image
            if (forceTransparent) {
                // Remove background using remove.bg API
                const backgroundRemovedBuffer = await this.removeBackground(processedBuffer);
                
                // Ensure the result is in PNG format with alpha channel
                const pngBuffer = await sharp(backgroundRemovedBuffer)
                    .ensureAlpha()
                    .png()
                    .toBuffer();
                
                // Cache the transparent PNG version
                const timestamp = Date.now();
                const cacheKey = `transparent_${timestamp}.png`;
                
                try {
                    await mediaCache.cacheMediaDirect(pngBuffer, cacheKey, 'png', 'image/png');
                } catch (cacheError) {
                    // Continue with processing even if caching fails
                }
                
                processedBuffer = pngBuffer;
            }
            
            // Crop to 1:1 ratio if requested
            if (crop) {
                processedBuffer = await this.cropToSquare(processedBuffer);
            }
            
            // Ensure the final buffer is in PNG format for sticker creation
            processedBuffer = await sharp(processedBuffer)
                .png({ quality: 90, compressionLevel: 6 })
                .toBuffer();
            
            // Create sticker using wa-sticker-formatter with transparency support
            const sticker = new Sticker(processedBuffer, {
                pack: pack,
                author: author,
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: Date.now().toString(),
                quality: 90,
                background: (preserveTransparency || forceTransparent) ? "transparent" : "#FFFFFF"
            });
            
            const stickerBuffer = await sticker.toBuffer();
            return stickerBuffer;
            
        } catch (error) {
            console.error('Error converting image to sticker:', error);
            throw error;
        }
    }

    static async stickerToImage(stickerBuffer) {
        try {
            const processedImage = await sharp(stickerBuffer)
                .png()
                .toBuffer();

            return processedImage;
        } catch (error) {
            console.error('Error converting sticker to image:', error);
            throw error;
        }
    }

    static async gifToSticker(gifBuffer, options = {}) {
        try {
            const { 
                pack = botConfig.name, 
                author = botConfig.creator.name
            } = options;
            
            // Create animated sticker using wa-sticker-formatter
            const sticker = new Sticker(gifBuffer, {
                pack: pack,
                author: author,
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: Date.now().toString(),
                quality: 80,
                background: "transparent"
            });
            
            const stickerBuffer = await sticker.toBuffer();
            return stickerBuffer;
            
        } catch (error) {
            console.error('Error converting GIF to sticker:', error);
            throw error;
        }
    }

    static async videoToSticker(videoBuffer, duration = 6, options = {}) {
        try {
            const { 
                pack = botConfig.name, 
                author = botConfig.creator.name
            } = options;
            
            // Create animated sticker from video using wa-sticker-formatter
            const sticker = new Sticker(videoBuffer, {
                pack: pack,
                author: author,
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: Date.now().toString(),
                quality: 80,
                background: "transparent"
            });
            
            const stickerBuffer = await sticker.toBuffer();
            return stickerBuffer;
            
        } catch (error) {
            console.error('Error converting video to sticker:', error);
            throw error;
        }
    }

    static async removeBackground(imageBuffer) {
        try {
            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            
            // You need to set your remove.bg API key in environment variables
            const apiKey = process.env.REMOVEBG_API_KEY;
            
            if (!apiKey || apiKey === 'your_removebg_api_key_here') {
                return imageBuffer; // Return original if no API key
            }
            
            const result = await removeBg.removeBackgroundFromImageBase64({
                base64img: base64Image,
                apiKey: apiKey,
                size: 'regular', // Options: 'preview', 'regular', 'medium', 'hd'
                type: 'auto',    // Options: 'auto', 'person', 'product', 'car'
                format: 'png'    // Always PNG for transparency
            });
            
            if (result && result.base64img) {
                const transparentBuffer = Buffer.from(result.base64img, 'base64');
                return transparentBuffer;
            } else {
                return imageBuffer;
            }
            
        } catch (error) {
            console.error('Error removing background:', error.message);
            // Return original image if background removal fails
            return imageBuffer;
        }
    }

    // Note: FFmpeg is no longer needed since we're using wa-sticker-formatter
    static isFFmpegAvailable() {
        // Always return true since wa-sticker-formatter handles everything internally
        return Promise.resolve(true);
    }
}
