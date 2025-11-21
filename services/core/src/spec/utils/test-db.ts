/**
 * MongoDB Memory Server Utilities
 * Provides in-memory MongoDB for isolated testing
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | null = null;

/**
 * Start MongoDB Memory Server and connect mongoose
 */
export async function setupTestDB(): Promise<void> {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Create new in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri);
}

/**
 * Clear all collections (between tests)
 */
export async function clearTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Teardown MongoDB Memory Server and disconnect
 */
export async function teardownTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

/**
 * Get test database connection
 */
export function getTestDB() {
  return mongoose.connection;
}
