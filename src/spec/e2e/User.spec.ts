/**
 * User Routes E2E Tests
 * Integration tests with real MongoDB + Redis via Docker Compose
 */

// STEP 1: Import mocks FIRST to setup module mocking
import "./mocks";

// STEP 2: Set env vars BEFORE importing Server to avoid wrong DB connection
process.env.MONGO_URI = process.env.E2E_MONGO_URI || "mongodb://test:testpassword@localhost:27017/campusx_test?authSource=admin";
process.env.REDIS_HOST = process.env.E2E_REDIS_HOST || "localhost";
process.env.REDIS_PORT = process.env.E2E_REDIS_PORT || "6379";

// STEP 3: Import dependencies
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import request from "supertest";
import { server } from "../../Server";
import { setupE2E, teardownE2E, clearE2EData } from "./setup";
import { createE2EUser, e2eAuthHeader, createE2EUsers } from "./helpers";

const E2E_BASE_URL = `http://localhost:${process.env.E2E_PORT || 3001}`;

describe("E2E: User Routes", () => {
  beforeAll(async () => {
    await setupE2E(server);
  }, 30000);

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await clearE2EData();
  });

  describe("POST /api/v1/users/create - User Registration", () => {
    test("should register a new user successfully", async () => {
      const uniqueEmail = `newuser-${Date.now()}@example.com`;
      const uniqueTag = `newuser${Date.now()}`;

      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/create")
        .send({
          name: "New User",
          email: uniqueEmail,
          password: "SecurePassword123!",
          phoneNumber: "+1234567890",
          userTag: uniqueTag,
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User created");
      expect(response.body.result.user).toBeDefined();
      expect(response.body.result.user.email).toBe(uniqueEmail);
      expect(response.body.result.token).toBeDefined();
    });

    test("should reject duplicate email", async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      const tag1 = `user${Date.now()}_1`;
      const tag2 = `user${Date.now()}_2`;

      // Create first user
      await request(E2E_BASE_URL)
        .post("/api/v1/users/create")
        .send({
          name: "First User",
          email: email,
          password: "Password123!",
          phoneNumber: "+1234567890",
          userTag: tag1,
        });

      // Attempt duplicate
      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/create")
        .send({
          name: "Second User",
          email: email,
          password: "Password123!",
          phoneNumber: "+1234567891",
          userTag: tag2,
        });

      expect(response.status).toBe(400);
      expect(response.body.exists).toBe(true);
    });

    test("should reject duplicate userTag", async () => {
      const userTag = `duplicatetag${Date.now()}`;
      const email1 = `user1-${Date.now()}@example.com`;
      const email2 = `user2-${Date.now()}@example.com`;

      // Create first user
      await request(E2E_BASE_URL)
        .post("/api/v1/users/create")
        .send({
          name: "First User",
          email: email1,
          password: "Password123!",
          phoneNumber: "+1234567890",
          userTag: userTag,
        });

      // Attempt duplicate userTag
      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/create")
        .send({
          name: "Second User",
          email: email2,
          password: "Password123!",
          phoneNumber: "+1234567891",
          userTag: userTag,
        });

      expect(response.status).toBe(400);
      expect(response.body.exists).toBe(true);
    });
  });

  describe("POST /api/v1/users/login - User Login", () => {
    test("should login with correct credentials", async () => {
      const email = `logintest-${Date.now()}@example.com`;
      const password = "LoginPassword123!";

      // Create user first
      await createE2EUser({ email, password });

      // Login
      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/login")
        .send({ email, password });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("login successful");
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(email);
    });

    test("should reject wrong password", async () => {
      const email = `wrongpass-${Date.now()}@example.com`;
      await createE2EUser({ email, password: "CorrectPassword123!" });

      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/login")
        .send({ email, password: "WrongPassword123!" });

      expect(response.status).toBe(400);
      expect(response.body.exist).toBe(false);
    });

    test("should reject non-existent user", async () => {
      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/login")
        .send({
          email: "nonexistent@example.com",
          password: "SomePassword123!",
        });

      expect(response.status).toBe(400);
      expect(response.body.exist).toBe(false);
    });
  });

  describe("POST /api/v1/users/follow - Follow User", () => {
    test("should follow and prevent duplicate follows", async () => {
      const [user1, user2] = await createE2EUsers(2);

      // First follow should succeed
      const response1 = await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(user1.token))
        .send({ targetUserID: user2.user._id });

      expect(response1.status).toBe(200);

      // Duplicate follow should be rejected
      const response2 = await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(user1.token))
        .send({ targetUserID: user2.user._id });

      expect(response2.status).toBe(400);
    });
  });

  describe("POST /api/v1/users/unfollow - Unfollow User", () => {
    test("should allow user to unfollow", async () => {
      const [user1, user2] = await createE2EUsers(2);

      // Follow first
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(user1.token))
        .send({ targetUserID: user2.user._id });

      // Unfollow
      const response = await request(E2E_BASE_URL)
        .post("/api/v1/users/unfollow")
        .set(e2eAuthHeader(user1.token))
        .send({ targetUserID: user2.user._id });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/v1/users/getUser/:searchKey - Get User Info", () => {
    test("should get user profile, followers, and followings", async () => {
      const [user1, user2] = await createE2EUsers(2);

      // Get profile
      const profile = await request(server)
        .get(`/api/v1/users/getUser/user?targetID=${user2.user._id}`)
        .set(e2eAuthHeader(user1.token));

      expect(profile.status).toBe(200);
      expect(profile.body.result).toBeDefined();

      // Get followers
      const followers = await request(server)
        .get(`/api/v1/users/getUser/followers?targetID=${user2.user._id}`)
        .set(e2eAuthHeader(user1.token));

      expect(followers.status).toBe(200);

      // Get followings
      const followings = await request(server)
        .get(`/api/v1/users/getUser/followings?targetID=${user2.user._id}`)
        .set(e2eAuthHeader(user1.token));

      expect(followings.status).toBe(200);
    });
  });

  describe("POST /api/v1/users/update - Update User Info", () => {
    test("should update user bio and name", async () => {
      const user = await createE2EUser();

      // Update bio
      const response1 = await request(E2E_BASE_URL)
        .post("/api/v1/users/update")
        .set(e2eAuthHeader(user.token))
        .send({ update: { bio: "Updated bio" } });

      expect(response1.status).toBe(200);
      expect(response1.body.msg).toBe("Updated");
      expect(response1.body.token).toBeDefined();

      // Update name with new token
      const response2 = await request(E2E_BASE_URL)
        .post("/api/v1/users/update")
        .set(e2eAuthHeader(response1.body.token))
        .send({ update: { name: "Updated Name" } });

      expect(response2.status).toBe(200);
    });
  });

  describe("GET /api/v1/users/userTag/:tag - Check UserTag Availability", () => {
    test("should check userTag availability", async () => {
      const user = await createE2EUser();
      const uniqueTag = `available${Date.now()}`;

      // Existing userTag should be unavailable
      const response1 = await request(E2E_BASE_URL)
        .get(`/api/v1/users/userTag/${user.user.userTag}`);

      expect(response1.status).toBe(200);
      expect(response1.body.available).toBe(false);

      // New userTag should be available
      const response2 = await request(E2E_BASE_URL)
        .get(`/api/v1/users/userTag/${uniqueTag}`);

      expect(response2.status).toBe(200);
      expect(response2.body.available).toBe(true);
    });
  });

  describe("GET /api/v1/users/connect - Get Connection Suggestions", () => {
    test("should get connection suggestions", async () => {
      const user = await createE2EUser();

      const response = await request(E2E_BASE_URL)
        .get("/api/v1/users/connect?offset=0&filter=all")
        .set(e2eAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
    });
  });
});
