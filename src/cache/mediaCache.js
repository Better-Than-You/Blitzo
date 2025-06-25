import { logger } from '../utils/logger.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { formatFileSize } from '../utils/helpers.js'

class MediaCache {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 60 * 60 * 1000 // 1 hour
    this.cacheDir = path.join(process.cwd(), 'src', 'cache')
    this.mediaCacheDir = path.join(this.cacheDir, 'media')
    this.maxCacheSize = 50 * 1024 * 1024 // 50MB max cache size
    this.ensureCacheDirectories()
    this.startCleanupInterval()
  }

  ensureCacheDirectories() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true })
      }
      if (!fs.existsSync(this.mediaCacheDir)) {
        fs.mkdirSync(this.mediaCacheDir, { recursive: true })
      }
    } catch (error) {
      logger.error('Failed to create media cache directories:', error.message)
    }
  }

  generateCacheKey(messageId, mediaType) {
    const data = `${messageId}_${mediaType}_${Date.now()}`
    return crypto.createHash('md5').update(data).digest('hex')
  }

  getFilePath(cacheKey, extension = '') {
    return path.join(this.mediaCacheDir, `${cacheKey}${extension}`)
  }

  getExtensionFromMimetype(mimetype) {
    const mimeMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'application/pdf': '.pdf'
    }
    return mimeMap[mimetype] || ''
  }

  async storeMedia(buffer, messageId, mediaType, mimetype = '') {
    try {
      const cacheKey = this.generateCacheKey(messageId, mediaType)
      const extension = this.getExtensionFromMimetype(mimetype)
      const filePath = this.getFilePath(cacheKey, extension)

      // Write buffer to file
      fs.writeFileSync(filePath, buffer)

      // Store metadata in memory cache
      const cacheEntry = {
        cacheKey,
        filePath,
        messageId,
        mediaType,
        mimetype,
        size: buffer.length,
        timestamp: Date.now(),
        accessed: Date.now()
      }

      this.cache.set(cacheKey, cacheEntry)

      logger.debug(`💾 Cached media: ${cacheKey} (${formatFileSize(buffer.length)})`)
      
      // Check cache size and cleanup if needed
      await this.enforceMaxCacheSize()

      return cacheKey
    } catch (error) {
      logger.error('Error storing media in cache:', error.message)
      return null
    }
  }

  async getMedia(cacheKey) {
    try {
      const cacheEntry = this.cache.get(cacheKey)
      
      if (!cacheEntry) {
        return null
      }

      // Check if file still exists
      if (!fs.existsSync(cacheEntry.filePath)) {
        this.cache.delete(cacheKey)
        return null
      }

      // Check if cache entry is expired
      if (Date.now() - cacheEntry.timestamp > this.cacheTimeout) {
        this.removeMedia(cacheKey)
        return null
      }

      // Update access time
      cacheEntry.accessed = Date.now()

      // Read and return file buffer
      const buffer = fs.readFileSync(cacheEntry.filePath)
      
      logger.debug(`📁 Retrieved cached media: ${cacheKey}`)
      
      return {
        buffer,
        mediaType: cacheEntry.mediaType,
        mimetype: cacheEntry.mimetype,
        size: cacheEntry.size
      }
    } catch (error) {
      logger.error('Error retrieving media from cache:', error.message)
      return null
    }
  }

  removeMedia(cacheKey) {
    try {
      const cacheEntry = this.cache.get(cacheKey)
      
      if (cacheEntry) {
        // Delete file if it exists
        if (fs.existsSync(cacheEntry.filePath)) {
          fs.unlinkSync(cacheEntry.filePath)
        }
        
        // Remove from memory cache
        this.cache.delete(cacheKey)
        
        logger.debug(`🗑️ Removed cached media: ${cacheKey}`)
        return true
      }
      
      return false
    } catch (error) {
      logger.error('Error removing media from cache:', error.message)
      return false
    }
  }

  async enforceMaxCacheSize() {
    try {
      const totalSize = this.getTotalCacheSize()
      
      if (totalSize > this.maxCacheSize) {
        // Sort by last accessed time (oldest first)
        const sortedEntries = Array.from(this.cache.entries())
          .sort((a, b) => a[1].accessed - b[1].accessed)

        let removedSize = 0
        let removedCount = 0

        // Remove oldest entries until we're under the limit
        for (const [cacheKey, entry] of sortedEntries) {
          if (totalSize - removedSize <= this.maxCacheSize * 0.8) { // Remove to 80% of max
            break
          }

          if (this.removeMedia(cacheKey)) {
            removedSize += entry.size
            removedCount++
          }
        }

        if (removedCount > 0) {
          logger.info(`🧹 Cleaned up ${removedCount} media files (${formatFileSize(removedSize)}) to enforce cache size limit`)
        }
      }
    } catch (error) {
      logger.error('Error enforcing cache size limit:', error.message)
    }
  }

  getTotalCacheSize() {
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  cleanup() {
    const now = Date.now()
    let cleanedCount = 0
    let cleanedSize = 0

    for (const [cacheKey, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        cleanedSize += entry.size
        if (this.removeMedia(cacheKey)) {
          cleanedCount++
        }
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`🧹 Media cache cleanup: removed ${cleanedCount} files (${formatFileSize(cleanedSize)})`)
    }

    return { cleanedCount, cleanedSize }
  }

  startCleanupInterval() {
    // Clean up every 30 minutes
    const cleanupInterval = 30 * 60 * 1000
    
    setInterval(() => {
      this.cleanup()
    }, cleanupInterval)
    
    logger.success(`🕒 Media cache system started (${formatFileSize(this.maxCacheSize)} limit)`, true)
  }

  getStats() {
    const totalEntries = this.cache.size
    const totalSize = this.getTotalCacheSize()
    const now = Date.now()
    
    let expiredEntries = 0
    let validEntries = 0

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      totalSize: formatFileSize(totalSize),
      maxSize: formatFileSize(this.maxCacheSize),
      cacheUsage: ((totalSize / this.maxCacheSize) * 100).toFixed(2) + '%',
      cacheTimeout: this.cacheTimeout / (60 * 1000) + ' minutes'
    }
  }

  clearAll() {
    let removedCount = 0
    let removedSize = 0

    for (const [cacheKey, entry] of this.cache.entries()) {
      removedSize += entry.size
      if (this.removeMedia(cacheKey)) {
        removedCount++
      }
    }

    logger.info(`🗑️  Cleared all media cache: ${removedCount} files (${formatFileSize(removedSize)})`, true)
    return { removedCount, removedSize }
  }

  async cacheMedia(buffer, messageId, mediaType, mimetype = '') {
    return await this.storeMedia(buffer, messageId, mediaType, mimetype)
  }

  async getCachedMedia(cacheKey) {
    return await this.getMedia(cacheKey)
  }

  hasCachedMedia(cacheKey) {
    const entry = this.cache.get(cacheKey)
    if (!entry) return false
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      return false
    }
    
    // Check if file exists
    return fs.existsSync(entry.filePath)
  }

  findCachedMediaByMessage(messageId, mediaType) {
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.messageId === messageId && entry.mediaType === mediaType) {
        // Check if not expired and file exists
        if (Date.now() - entry.timestamp <= this.cacheTimeout && fs.existsSync(entry.filePath)) {
          return cacheKey
        }
      }
    }
    return null
  }

  async cacheMediaDirect(buffer, fileName, fileType, mimetype = '') {
    try {
      const filePath = path.join(this.mediaCacheDir, fileName)

      // Write buffer to file
      fs.writeFileSync(filePath, buffer)

      // Store metadata in memory cache
      const cacheEntry = {
        cacheKey: fileName,
        filePath,
        messageId: fileName,
        mediaType: fileType,
        mimetype,
        size: buffer.length,
        timestamp: Date.now(),
        accessed: Date.now()
      }

      this.cache.set(fileName, cacheEntry)

      return fileName
    } catch (error) {
      logger.error('Failed to cache media directly:', error.message)
      throw error
    }
  }
}

// Create and export singleton instance
export const mediaCache = new MediaCache()
