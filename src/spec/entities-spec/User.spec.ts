/**
 * User Entity Tests
 * Migrated to Bun test runner
 */
import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { User } from "../../entities/User";
import { IUser } from "../../interfaces";
import UserModel from "../../models/User.model";
import {
  setupTestDB,
  clearTestDB,
  teardownTestDB,
  setupTestRedis,
  teardownTestRedis,
  createTestUser,
  generateUserData,
  getTestUsers,
} from "../utils";

describe("User Entity", () => {
  let testRedis: any;

  beforeAll(async () => {
    await setupTestDB();
    testRedis = setupTestRedis();
  });

  afterAll(async () => {
    await teardownTestDB();
    await teardownTestRedis();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  test("should create a user and return user details", async () => {
    const userData = generateUserData({
      password: "test123",
      userProfile: {
        bio: "Test bio",
        gender: "male",
        university: "Bells University Of Technology",
        avatar: "https://picsum.photos/200/300",
        department: "Engineering",
        lastSeen: new Date(),
      },
    });

    const result = await User.CreateUser(userData);

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.user).toBeDefined();
    expect(result.user.userTag).toBeDefined();
    expect(result.user._id).toBeDefined();
  });

  test("should login and return user token and information", async () => {
    // Create a test user first
    const user = await createTestUser({ password: "test123" });

    // Login with the user's email
    const result = await User.Login(user.user.email, "test123");

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.user).toBeDefined();
    expect(result.user.userTag).toBeDefined();
    expect(result.user.userProfile).toBeDefined();
    expect(result.user.userProfile.university).toBeDefined();
  });

  // TODO: Fix Firebase Admin initialization for this test
  // Skipping for now - requires Firebase Admin mock at module level
  test.skip("should follow a user", async () => {
    // Create two test users
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    // User1 follows User2
    const result = await User.FollowUser(
      user1.user._id,
      user2.user._id,
      testRedis,
    );

    expect(result).toBeDefined();
    expect(result).not.toHaveProperty("error");
  });

  test("should get user info with self search key", async () => {
    // Create a test user
    const user = await createTestUser();

    // Get user's own info
    const result = await User.GetUser("self", user.user._id, user.user._id);

    expect(result.self).toBeDefined();
    expect(result.self.name).toBeDefined();
    expect(result.self.userProfile).toBeDefined();
    expect(result.self.userTag).toBeDefined();
    expect(result.self.userProfile.avatar).toBeDefined();
  });

  test("should get another user's info with the user key", async () => {
    // Create two test users
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    // User1 views User2's profile
    const result = await User.GetUser("user", user1.user._id, user2.user._id);

    expect(result.user).toBeDefined();
    expect(result.user.name).toBeDefined();
    expect(result.user.userProfile).toBeDefined();
    expect(result.user.userTag).toBeDefined();
    expect(result.user.userProfile.avatar).toBeDefined();
    expect(result.user.userProfile.bio).toBeDefined();
    expect(result.user.userProfile.gender).toBeDefined();
    expect(result.user.userProfile.university).toBeDefined();
    expect(result.isFollowing).toBeDefined();
    expect(typeof result.isFollowing).toBe("boolean");
  });

  test("should return users in the same campus", async () => {
    const university = "Bells University Of Technology";

    // Create multiple users from the same university
    await createTestUser({
      userProfile: {
        university,
        bio: "Test bio",
        gender: "male",
        department: "Engineering",
        lastSeen: new Date(),
      },
    });
    await createTestUser({
      userProfile: {
        university,
        bio: "Test bio",
        gender: "female",
        department: "Science",
        lastSeen: new Date(),
      },
    });

    const users = await getTestUsers(1);
    const result = await User.ConnectUser(
      users[0]._id,
      "sameCampus",
      university,
      null,
    );

    expect(result).toBeDefined();
    expect(result.connectUsers).toBeDefined();
    expect(Array.isArray(result.connectUsers)).toBe(true);
    expect(result.connectUsers.length).toBeGreaterThan(0);
  });
});
