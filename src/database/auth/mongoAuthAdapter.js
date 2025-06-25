import { mongoAuthService } from './authService.js'
import { logger } from '../../utils/logger.js'
import baileysPackage from 'baileys'

const { initAuthCreds, BufferJSON, proto } = baileysPackage

export class MongoDBAuthentication {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.DB = mongoAuthService
  }

  getAuthFromDatabase = async () => {
    try {
      let creds
      let keys = {}
      
      const storedSession = await this.DB.getSession()
      
      if (storedSession && storedSession.session) {
        const parsedSession = JSON.parse(storedSession.session, BufferJSON.reviver)
        creds = parsedSession.creds
        keys = parsedSession.keys || {}
      } else {
        creds = initAuthCreds()
        keys = {}
      }

      const saveState = async () => {
        try {
          const session = JSON.stringify(
            {
              creds,
              keys,
            },
            BufferJSON.replacer,
            2
          )
          await this.DB.saveSession({ session })
        } catch (error) {
          logger.error('Save failed:', error.message)
        }
      }

      const clearState = async () => {
        try {
          await this.DB.deleteSession()
        } catch (error) {
          logger.error('Clear failed:', error.message)
        }
      }

      return {
        state: {
          creds,
          keys: {
            get: (type, ids) => {
              const key = this.KEY_MAP[type]
              return ids.reduce((dict, id) => {
                let value = keys[key]?.[id]
                if (value) {
                  if (type === "app-state-sync-key") {
                    value = proto.AppStateSyncKeyData.fromObject(value)
                  }
                  dict[id] = value
                }
                return dict
              }, {})
            },
            set: (data) => {
              for (const _key in data) {
                const key = this.KEY_MAP[_key]
                keys[key] = keys[key] || {}
                Object.assign(keys[key], data[_key])
              }
              saveState()
            },
          },
        },
        saveState,
        clearState,
      }
    } catch (error) {
      logger.error('Auth init failed:', error.message)
      
      // Fallback
      return {
        state: {
          creds: initAuthCreds(),
          keys: {
            get: () => ({}),
            set: () => {}
          }
        },
        saveState: async () => {},
        clearState: async () => {}
      }
    }
  }

  KEY_MAP = {
    "pre-key": "preKeys",
    session: "sessions",
    "sender-key": "senderKeys",
    "app-state-sync-key": "appStateSyncKeys",
    "app-state-sync-version": "appStateVersions",
    "sender-key-memory": "senderKeyMemory",
  }
}

// Create auth state
export async function useMongoDBAuthState(sessionId = 'whatsapp_session_default') {
  try {
    const auth = new MongoDBAuthentication(sessionId)
    const authState = await auth.getAuthFromDatabase()
    
    return {
      state: authState.state,
      saveCreds: authState.saveState,
      saveKeys: authState.saveState,
      clearAuth: authState.clearState
    }
  } catch (error) {
    logger.error('Auth state failed:', error.message)
    
    // Basic fallback
    return {
      state: { 
        creds: initAuthCreds(), 
        keys: {
          get: (type, ids) => {
            const data = {}
            for (const id of ids) {
              data[id] = null
            }
            return data
          },
          set: () => {}
        }
      },
      saveCreds: async () => {},
      saveKeys: async () => {},
      clearAuth: async () => {}
    }
  }
}
