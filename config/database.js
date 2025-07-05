const mongoose = require('mongoose');

// Enhanced database configuration with monitoring and error handling
const connectDB = async () => {
  try {
    // Connection options for better performance and reliability
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
      // Retry settings
      retryWrites: true,
      retryReads: true,
      // Read preference
      readPreference: 'primary',
      // Write concern
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeoutMS: 30000
      }
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔌 Connection state: ${conn.connection.readyState}`);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 MongoDB connection error:', err);
      // Don't exit process, let the app handle it
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🟢 Mongoose reconnected to MongoDB');
    });

    // Monitor slow queries in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
      
      // Log slow queries
      mongoose.connection.on('slow', (query) => {
        console.log('🐌 Slow query detected:', query);
      });
    }

    // Handle application termination
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown); // For nodemon restarts

    return conn;

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Log detailed error information
    if (error.name === 'MongoNetworkError') {
      console.error('🌐 Network error - check your connection and MongoDB URI');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection error - MongoDB might be down or unreachable');
    } else if (error.name === 'MongoParseError') {
      console.error('📝 URI parse error - check your MongoDB connection string format');
    }
    
    // Exit process with failure
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, closing MongoDB connection...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
    process.exit(1);
  }
};

// Health check function
const checkDatabaseHealth = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    
    return {
      status: 'healthy',
      connected: mongoose.connection.readyState === 1,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      ping: result.ok === 1,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Get connection statistics
const getConnectionStats = () => {
  const connection = mongoose.connection;
  
  return {
    readyState: connection.readyState,
    readyStateText: getReadyStateText(connection.readyState),
    host: connection.host,
    port: connection.port,
    name: connection.name,
    collections: Object.keys(connection.collections).length,
    models: Object.keys(mongoose.models).length
  };
};

// Helper function to get readable connection state
const getReadyStateText = (state) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

// Database maintenance functions
const maintenanceTasks = {
  // Rebuild indexes
  rebuildIndexes: async () => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        await mongoose.connection.db.collection(collection.name).reIndex();
        console.log(`✅ Rebuilt indexes for ${collection.name}`);
      }
      
      return { success: true, message: 'All indexes rebuilt successfully' };
    } catch (error) {
      console.error('❌ Error rebuilding indexes:', error);
      return { success: false, error: error.message };
    }
  },

  // Get database statistics
  getStats: async () => {
    try {
      const stats = await mongoose.connection.db.stats();
      
      return {
        database: mongoose.connection.name,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: formatBytes(stats.dataSize),
        storageSize: formatBytes(stats.storageSize),
        indexes: stats.indexes,
        indexSize: formatBytes(stats.indexSize),
        avgObjSize: formatBytes(stats.avgObjSize)
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return { error: error.message };
    }
  },

  // Validate collections
  validateCollections: async () => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const results = [];
      
      for (const collection of collections) {
        try {
          const result = await mongoose.connection.db.collection(collection.name).validate();
          results.push({
            collection: collection.name,
            valid: result.valid,
            errors: result.errors || []
          });
        } catch (error) {
          results.push({
            collection: collection.name,
            valid: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error validating collections:', error);
      return { error: error.message };
    }
  }
};

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Enhanced logging for database operations
const setupDatabaseLogging = () => {
  if (process.env.NODE_ENV === 'development') {
    // Log all database operations
    mongoose.set('debug', (coll, method, query, doc) => {
      console.log(`🔍 ${coll}.${method}`, JSON.stringify(query, null, 2));
    });
  }
  
  // Log slow operations in production
  if (process.env.NODE_ENV === 'production') {
    mongoose.set('bufferCommands', false);
    mongoose.set('maxTimeMS', 30000); // 30 second timeout
  }
};

// Connection retry logic
const connectWithRetry = async (maxRetries = 5, retryDelay = 5000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectDB();
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('💀 Max connection attempts reached. Exiting...');
        process.exit(1);
      }
      
      console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Exponential backoff
      retryDelay *= 1.5;
    }
  }
};

module.exports = {
  connectDB,
  connectWithRetry,
  checkDatabaseHealth,
  getConnectionStats,
  maintenanceTasks,
  setupDatabaseLogging,
  gracefulShutdown
};
