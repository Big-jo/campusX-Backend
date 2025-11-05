/**
 * Redis Mock Utilities
 * Provides in-memory Redis mock for isolated testing
 */
import RedisMock from "ioredis-mock";

let redisClient: RedisMock | null = null;

/**
 * Create and return mock Redis client
 */
export function setupTestRedis(): RedisMock {
  redisClient = new RedisMock();
  return redisClient;
}

/**
 * Clear all Redis data
 */
export async function clearTestRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.flushall();
  }
}

/**
 * Teardown Redis mock
 */
export async function teardownTestRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Get current Redis mock client
 */
export function getTestRedis(): RedisMock | null {
  return redisClient;
}

/**
 * Create a new isolated Redis mock (for dependency injection)
 */
export function createMockRedis(): RedisMock {
  return new RedisMock();
}
