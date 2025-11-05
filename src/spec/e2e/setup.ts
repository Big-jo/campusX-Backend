/**
 * E2E Test Setup
 * Real services (MongoDB, Redis) via Docker Compose
 */

import mongoose from "mongoose";
import IORedis from "ioredis";
import { Server } from "http";

let redis: IORedis.Redis;
let serverInstance: Server | null = null;

/**
 * Setup E2E test environment with real services
 * Must be run after Docker Compose services are up
 * Note: Server.ts already connects to MongoDB, so we just verify, setup Redis, and start HTTP server
 */
export async function setupE2E(server: Server) {
  // Wait for mongoose connection from Server.ts
  let retries = 0;
  while (mongoose.connection.readyState !== 1 && retries < 30) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB connection not ready after Server.ts import");
  }

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
  // Clear data but keep connections (Server.ts manages them)
  await clearE2EData();

  // Stop HTTP server
  if (serverInstance) {
    return new Promise<void>((resolve) => {
      serverInstance!.close(() => {
        serverInstance = null;
        console.log("✓ HTTP server stopped");
        resolve();
      });
    });
  }

  // Disconnect from Redis test client only
  if (redis) {
    redis.disconnect();
  }

  console.log("✓ E2E environment cleaned up");
}

/**
 * Get Redis client for tests
 */
export function getRedisClient(): IORedis.Redis {
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
        throw new Error(`Services not ready after ${maxRetries} retries: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}
