const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const INITIAL_RETRY_MS = 2000;

let isConnecting = false;

/**
 * Connect to MongoDB Atlas with retry mechanism and graceful shutdown
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('FATAL: MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }

  if (isConnecting) return;
  isConnecting = true;

  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`MongoDB Atlas connected successfully: ${conn.connection.host}/${conn.connection.name}`);
      isConnecting = false;

      // Register connection event listeners
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB connection lost. Attempting reconnection...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully.');
      });

      return conn;
    } catch (error) {
      retries++;
      console.warn(`MongoDB Atlas attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`);

      // Try local MongoDB fallback on attempt 2+ if available
      if (retries >= 2) {
        try {
          console.log('Attempting local MongoDB fallback on 127.0.0.1:27017...');
          const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/mech_online', {
            serverSelectionTimeoutMS: 2000,
          });
          console.log(`MongoDB connected via local fallback: ${localConn.connection.host}/${localConn.connection.name}`);
          isConnecting = false;
          return localConn;
        } catch (localErr) {
          // Continue retrying
        }
      }

      if (retries >= MAX_RETRIES) {
        console.error('FATAL: Maximum MongoDB connection retries reached. Shutting down process.');
        process.exit(1);
      }

      const backoffDelay = INITIAL_RETRY_MS * Math.pow(1.5, retries - 1);
      console.log(`Retrying in ${(backoffDelay / 1000).toFixed(1)}s...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
};


/**
 * Graceful shutdown for MongoDB connection
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed gracefully.');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
  }
};

// Handle process termination signals
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = { connectDB, closeDB };
