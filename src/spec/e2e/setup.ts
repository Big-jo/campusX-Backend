/**
 * E2E Test Setup
 * MongoDB Memory Server + Redis via Docker Compose
 */

import mongoose from "mongoose";
import IORedis from "ioredis";
import { Server } from "http";
import { MongoMemoryServer } from "mongodb-memory-server";

let redis: Redis;
let serverInstance: Server | null = null;
let mongoServer: MongoMemoryServer | null = null;

/**
 * Setup E2E test environment with MongoDB Memory Server + Redis
 */
export async function setupE2E(server: Server) {
  // Create and start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to memory server
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  console.log('✓ MongoDB Memory Server connected');

  // Redis connection for test utilities
  redis = new IORedis({
    host: process.env.E2E_REDIS_HOST || "localhost",
    port: parseInt(process.env.E2E_REDIS_PORT || "6379"),
  });

  await redis.ping();

  // Start HTTP server for tests
  const port = Number(process.env.E2E_PORT || 3001);
  return new Promise<void>((resolve) => {
    serverInstance = server.listen(port, () => {
      console.log(`✓ E2E environment ready (MongoDB + Redis + HTTP server on port ${port})`);
      resolve();
    });
  });
}

/**
 * Clear test data between tests
 */
export async function clearE2EData() {
  // Clear all MongoDB collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Clear Redis
  if (redis) {
    await redis.flushall();
  }
}

/**
 * Teardown E2E environment
 */
export async function teardownE2E() {
  // Clear data
  await clearE2EData();

  // Stop HTTP server
  if (serverInstance) {
    await new Promise<void>((resolve) => {
      serverInstance!.close(() => {
        serverInstance = null;
        console.log("✓ HTTP server stopped");
        resolve();
      });
    });
  }

  // Disconnect from Redis
  if (redis) {
    redis.disconnect();
  }

  // Disconnect mongoose and stop MongoDB Memory Server
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }

  console.log("✓ E2E environment cleaned up");
}

/**
 * Get Redis client for tests
 */
export function getRedisClient(): Redis {
  return redis;
}

/**
 * Wait for services to be ready
 */
export async function waitForServices(maxRetries = 30, interval = 1000): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Test MongoDB
      const mongoUri = process.env.E2E_MONGO_URI || "mongodb://test:testpassword@localhost:27017/campusx_test?authSource=admin";
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 2000,
      });
      await mongoose.connection.db.admin().ping();

      // Test Redis
      const testRedis = new IORedis({
        host: process.env.E2E_REDIS_HOST || "localhost",
        port: parseInt(process.env.E2E_REDIS_PORT || "6379"),
        connectTimeout: 2000,
      });
      await testRedis.ping();
      testRedis.disconnect();

      console.log("✓ All services are ready");
      await mongoose.disconnect();
      return;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw new Error(`Services not ready after ${maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}
