import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blitzo_bot'

export async function connectMongoDB() {
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    
    logger.info('MongoDB connected to: ' + mongoose.connection.db.databaseName)
    return mongoose.connection.db
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message)
    
    return {
      collection: () => ({
        findOne: async () => null,
        updateOne: async () => ({ acknowledged: true }),
        deleteOne: async () => ({ deletedCount: 0 }),
        deleteMany: async () => ({ deletedCount: 0 }),
        listIndexes: () => ({ toArray: async () => [] }),
        createIndex: async () => ({ name: 'mock_index' })
      })
    }
  }
}

export async function getMongoDb() {
  if (!mongoose.connection.readyState) {
    await connectMongoDB()
  }
  return mongoose.connection.db
}

export async function closeMongoDb() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed')
    } catch (error) {
      logger.error('Error closing MongoDB:', error.message)
    }
  }
}

export async function isMongoConnected() {
  return mongoose.connection.readyState === 1
}