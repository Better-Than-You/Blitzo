import { Session } from './mongoSchema.js'
import { logger } from '../utils/logger.js'

export class MongoAuthService {
  constructor() {
    this.sessionId = 'whatsapp_session_default'
  }

  async getSession() {
    try {
      const sessionDoc = await Session.findOne({ sessionId: this.sessionId })
      
      if (sessionDoc) {
        return sessionDoc
      } else {
        return null
      }
    } catch (error) {
      logger.error('Failed to load session:', error.message)
      return null
    }
  }

  async saveSession(sessionData) {
    try {
      await Session.updateOne(
        { sessionId: this.sessionId },
        {
          sessionId: this.sessionId,
          session: sessionData.session || sessionData,
          lastUpdated: new Date(),
        },
        { upsert: true }
      )
    } catch (error) {
      logger.error('Failed to save session:', error.message)
    }
  }

  async deleteSession() {
    try {
      const result = await Session.deleteOne({ sessionId: this.sessionId })
      
      if (result.deletedCount > 0) {
        return true
      }
      return false
    } catch (error) {
      logger.error('Failed to delete session:', error.message)
      return false
    }
  }

  async clearAllSessions() {
    try {
      const result = await Session.deleteMany({})
      return result.deletedCount
    } catch (error) {
      logger.error('Failed to clear sessions:', error.message)
      return 0
    }
  }
}

export const mongoAuthService = new MongoAuthService()
