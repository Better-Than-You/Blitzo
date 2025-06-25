import { logger } from '../utils/logger.js'

class NameCache {
  constructor() {
    this.usernames = new Map()
    this.groupNames = new Map()
    this.lastUpdate = new Map()
    this.updateInterval = 10 * 60 * 1000
    this.socket = null
    
    logger.success('📝 Name cache system initialized', true)
  }

  setSocket(socket) {
    this.socket = socket
  }

  isCacheValid(jid) {
    const lastUpdate = this.lastUpdate.get(jid)
    if (!lastUpdate) return false
    return (Date.now() - lastUpdate) < this.updateInterval
  }
  async getUsername(jid, message = null) {
    if (this.isCacheValid(jid) && this.usernames.has(jid)) {
      return this.usernames.get(jid)
    }

    let username = jid.split('@')[0]

    try {
      if (message?.pushName && message.pushName.trim()) {
        username = message.pushName.trim()
      }
      else if (message?.verifiedBizName && message.verifiedBizName.trim()) {
        username = message.verifiedBizName.trim()
      }

      this.usernames.set(jid, username)
      this.lastUpdate.set(jid, Date.now())
      
      return username
    } catch (error) {
      logger.debug(`Error getting username for ${jid}:`, error.message)
      return username
    }
  }

  async getGroupName(groupJid) {
    if (this.isCacheValid(groupJid) && this.groupNames.has(groupJid)) {
      return this.groupNames.get(groupJid)
    }

    let groupName = 'Unknown Group'

    try {
      if (this.socket) {
        const groupMetadata = await this.socket.groupMetadata(groupJid)
        groupName = groupMetadata.subject || 'Unknown Group'
        
        // Update cache        this.groupNames.set(groupJid, groupName)
        this.lastUpdate.set(groupJid, Date.now())
      }
    } catch (error) {
      logger.debug(`Error getting group name for ${groupJid}:`, error.message)
    }

    return groupName
  }

  async getParticipantUsername(senderJid, groupJid, message = null) {
    try {
      if (this.isCacheValid(senderJid) && this.usernames.has(senderJid)) {
        return this.usernames.get(senderJid)
      }

      let username = senderJid.split('@')[0]

      if (message?.pushName && message.pushName.trim()) {
        username = message.pushName.trim()
      } else if (this.socket && groupJid.includes('@g.us')) {
        try {
          const groupMetadata = await this.socket.groupMetadata(groupJid)
          const participant = groupMetadata.participants.find(p => p.id === senderJid)
          
          if (participant) {
            if (participant.notify && participant.notify.trim()) {
              username = participant.notify.trim()
            } else if (participant.name && participant.name.trim()) {
              username = participant.name.trim()
            }
          }
        } catch (groupError) {
          logger.debug('Could not get group metadata for participant:', groupError.message)
        }
      }

      // Update cache
      this.usernames.set(senderJid, username)
      this.lastUpdate.set(senderJid, Date.now())
      
      logger.debug(`📝 Cached participant username for ${senderJid}: ${username}`)
      return username
    } catch (error) {
      logger.debug(`Error getting participant username for ${senderJid}:`, error.message)
      return senderJid.split('@')[0]
    }
  }

  /**
   * Get contact info from cache or fetch from API
   */
  async getContactInfo(jid) {
    const cacheKey = `contact_${jid}`
    
    // Check cache first
    if (this.isCacheValid(cacheKey) && this.usernames.has(cacheKey)) {
      return this.usernames.get(cacheKey)
    }

    let contactInfo = {
      jid: jid,
      name: jid.split('@')[0],
      notify: null,
      verifiedName: null,
      businessName: null
    }

    try {
      if (this.socket) {
        // Try to get contact info from WhatsApp
        const contacts = await this.socket.onWhatsApp(jid)
        if (contacts && contacts.length > 0) {
          const contact = contacts[0]
          contactInfo = {
            jid: contact.jid,
            name: contact.notify || contact.name || jid.split('@')[0],
            notify: contact.notify,
            verifiedName: contact.verifiedName,
            businessName: contact.businessName,
            exists: contact.exists
          }
        }
        
        // Cache the contact info
        this.usernames.set(cacheKey, contactInfo)
        this.lastUpdate.set(cacheKey, Date.now())
        
        logger.debug(`📝 Cached contact info for ${jid}`)
      }
    } catch (error) {
      logger.debug(`Error getting contact info for ${jid}:`, error.message)
    }

    return contactInfo
  }

  /**
   * Batch update multiple usernames from group metadata
   */
  async batchUpdateUsernames(groupJid) {
    try {
      const groupMetadata = await this.getGroupMetadata(groupJid)
      if (!groupMetadata) return 0

      let updatedCount = 0
      const currentTime = Date.now()

      for (const participant of groupMetadata.participants) {
        const participantJid = participant.id
        
        // Only update if not in cache or expired
        if (!this.isCacheValid(participantJid)) {
          let username = participantJid.split('@')[0]
          
          if (participant.notify && participant.notify.trim()) {
            username = participant.notify.trim()
          } else if (participant.name && participant.name.trim()) {
            username = participant.name.trim()
          }
          
          this.usernames.set(participantJid, username)
          this.lastUpdate.set(participantJid, currentTime)
          updatedCount++
        }
      }

      if (updatedCount > 0) {
        logger.debug(`📝 Batch updated ${updatedCount} usernames for group ${groupJid}`)
      }
      
      return updatedCount
    } catch (error) {
      logger.debug(`Error in batch username update for ${groupJid}:`, error.message)
      return 0
    }
  }

  /**
   * Preload cache for a group (useful for active groups)
   */
  async preloadGroupCache(groupJid) {
    try {
      logger.debug(`🚀 Preloading cache for group ${groupJid}`)
      
      // Load group metadata and info
      await this.getGroupMetadata(groupJid)
      await this.getGroupInfo(groupJid)
      
      // Batch update usernames
      const updatedCount = await this.batchUpdateUsernames(groupJid)
      
      logger.info(`✅ Preloaded cache for group ${groupJid} (${updatedCount} usernames cached)`)
      return true
    } catch (error) {
      logger.error(`Error preloading cache for group ${groupJid}:`, error.message)
      return false
    }
  }

  /**
   * Force update a specific entry
   */
  async forceUpdate(jid, isGroup = false) {
    if (isGroup) {
      this.lastUpdate.delete(jid)
      return await this.getGroupName(jid)
    } else {
      this.lastUpdate.delete(jid)
      return await this.getUsername(jid)
    }
  }

  /**
   * Clear cache for a specific JID
   */
  clearCache(jid) {
    this.usernames.delete(jid)
    this.groupNames.delete(jid)
    this.lastUpdate.delete(jid)
    logger.debug(`🗑️ Cleared cache for ${jid}`)
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    const totalEntries = this.usernames.size + this.groupNames.size
    this.usernames.clear()
    this.groupNames.clear()
    this.lastUpdate.clear()
    logger.info(`🗑️ Cleared all cache (${totalEntries} entries)`)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let validUsernames = 0
    let validGroupNames = 0
    let expiredEntries = 0

    // Count valid usernames
    for (const [jid, timestamp] of this.lastUpdate.entries()) {
      const isValid = (now - timestamp) < this.updateInterval
      if (this.usernames.has(jid)) {
        if (isValid) validUsernames++
        else expiredEntries++
      }
      if (this.groupNames.has(jid)) {
        if (isValid) validGroupNames++
        else expiredEntries++
      }
    }

    return {
      totalUsernames: this.usernames.size,
      totalGroupNames: this.groupNames.size,
      validUsernames,
      validGroupNames,
      expiredEntries,
      updateInterval: this.updateInterval / (60 * 1000) // in minutes
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now()
    let cleanedCount = 0

    for (const [jid, timestamp] of this.lastUpdate.entries()) {
      if ((now - timestamp) >= this.updateInterval) {
        this.usernames.delete(jid)
        this.groupNames.delete(jid)
        this.lastUpdate.delete(jid)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned up ${cleanedCount} expired cache entries`)
    }

    return cleanedCount
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval() {
    // Clean up every 15 minutes (5 minutes after entries expire)
    const cleanupInterval = 15 * 60 * 1000
    
    setInterval(() => {
      this.cleanup()
    }, cleanupInterval)
    
    logger.info(`🕒 Started cache cleanup interval (every 15 minutes)`)
  }

  /**
   * Get group metadata from cache or fetch from API
   */
  async getGroupMetadata(groupJid) {
    const cacheKey = `metadata_${groupJid}`
    
    // Check cache first
    if (this.isCacheValid(cacheKey) && this.groupNames.has(cacheKey)) {
      return this.groupNames.get(cacheKey)
    }

    let groupMetadata = null

    try {
      if (this.socket) {
        groupMetadata = await this.socket.groupMetadata(groupJid)
        
        // Update cache
        this.groupNames.set(cacheKey, groupMetadata)
        this.lastUpdate.set(cacheKey, Date.now())
        
        // Also cache the group name for quick access
        if (groupMetadata.subject) {
          this.groupNames.set(groupJid, groupMetadata.subject)
          this.lastUpdate.set(groupJid, Date.now())
        }
        
        logger.debug(`📝 Cached group metadata for ${groupJid}`)
      }
    } catch (error) {
      logger.debug(`Error getting group metadata for ${groupJid}:`, error.message)
    }

    return groupMetadata
  }

  /**
   * Check if user is admin in a group (cached)
   */
  async isGroupAdmin(userJid, groupJid) {
    const cacheKey = `admin_${userJid}_${groupJid}`
    
    // Check cache first
    if (this.isCacheValid(cacheKey) && this.usernames.has(cacheKey)) {
      return this.usernames.get(cacheKey)
    }

    let isAdmin = false

    try {
      const groupMetadata = await this.getGroupMetadata(groupJid)
      if (groupMetadata) {
        const participant = groupMetadata.participants.find(p => p.id === userJid)
        isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin')
        
        // Cache the result
        this.usernames.set(cacheKey, isAdmin)
        this.lastUpdate.set(cacheKey, Date.now())
        
        logger.debug(`📝 Cached admin status for ${userJid} in ${groupJid}: ${isAdmin}`)
      }
    } catch (error) {
      logger.debug(`Error checking admin status for ${userJid} in ${groupJid}:`, error.message)
    }

    return isAdmin
  }

  /**
   * Get group participants with cached metadata
   */
  async getGroupParticipants(groupJid) {
    const groupMetadata = await this.getGroupMetadata(groupJid)
    return groupMetadata ? groupMetadata.participants : []
  }

  /**
   * Get group info with cached metadata
   */
  async getGroupInfo(groupJid) {
    const groupMetadata = await this.getGroupMetadata(groupJid)
    if (!groupMetadata) return null

    return {
      name: groupMetadata.subject || 'Unknown Group',
      owner: groupMetadata.owner,
      participantCount: groupMetadata.participants.length,
      adminsCount: groupMetadata.participants.filter(p => p.admin).length,
      creationDate: new Date(groupMetadata.creation * 1000).toLocaleDateString(),
      announce: groupMetadata.announce,
      description: groupMetadata.desc || 'No description',
      participants: groupMetadata.participants
    }
  }

  /**
   * Get cache hit rate statistics
   */
  getHitRateStats() {
    // This would require tracking hits/misses in real implementation
    // For now, return basic cache efficiency metrics
    const stats = this.getStats()
    const totalEntries = stats.totalUsernames + stats.totalGroupNames
    const validEntries = stats.validUsernames + stats.validGroupNames
    
    return {
      ...stats,
      hitRate: totalEntries > 0 ? (validEntries / totalEntries * 100).toFixed(2) : 0,
      efficiency: stats.expiredEntries === 0 ? 100 : ((validEntries / (validEntries + stats.expiredEntries)) * 100).toFixed(2)
    }
  }
}

// Create and export singleton instance
export const nameCache = new NameCache()
