/**
 * Test Infrastructure Verification
 * Ensures test utilities are working correctly
 */
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";
import { setupTestDB, clearTestDB, teardownTestDB } from "./test-db";
import { setupTestRedis, clearTestRedis, teardownTestRedis } from "./test-redis";
import { createTestUser, generateUserData } from "./factories";
import { TEST_USER_PASSWORD } from "./fixtures";

describe("Test Infrastructure Setup", () => {
  beforeAll(async () => {
    await setupTestDB();
    setupTestRedis();
  });

  afterAll(async () => {
    await teardownTestDB();
    await teardownTestRedis();
  });

  afterEach(async () => {
    await clearTestDB();
    await clearTestRedis();
  });

  test("should connect to MongoDB Memory Server and create user", async () => {
    const user = await createTestUser();
    expect(user).toBeDefined();
    expect(user.user).toBeDefined();
    expect(user.token).toBeDefined();
    expect(user.user._id).toBeDefined();
    expect(user.user.email).toBeDefined();
  });

  test("should generate user data", () => {
    const userData = generateUserData();
    expect(userData.name).toBeDefined();
    expect(userData.email).toBeDefined();
    expect(userData.userTag).toBeDefined();
    expect(userData.password).toEqual(TEST_USER_PASSWORD);
  });

  test("should clear database between tests", async () => {
    const user1 = await createTestUser();
    expect(user1).toBeDefined();

    await clearTestDB();

    // After clearing, should be able to create another user
    const user2 = await createTestUser();
    expect(user2).toBeDefined();
  });

  test("should setup Redis mock", () => {
    const redis = setupTestRedis();
    expect(redis).toBeDefined();
    expect(typeof redis.set).toBe("function");
    expect(typeof redis.get).toBe("function");
  });
});
