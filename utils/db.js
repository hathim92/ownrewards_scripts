const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const dbPath = process.env.DB_PATH;
    if (!dbPath) {
      throw new Error("DB_PATH is not defined in the environment variables.");
    }

    await mongoose.connect(dbPath, {
      readPreference: 'secondaryPreferred'
    });

    isConnected = true;
    console.log("Mongoose connected successfully to ownrewards database.");
    return mongoose.connection;
  } catch (err) {
    console.error("Database connection error:", err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("Mongoose disconnected successfully.");
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
