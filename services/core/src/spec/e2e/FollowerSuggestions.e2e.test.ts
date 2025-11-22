/**
 * Follower Suggestions E2E Tests
 * Integration tests for graph-based follower recommendation system
 *
 * Environment configuration is handled by test.setup.ts (loaded via bunfig.toml)
 */

// Override Redis config for test environment
process.env.REDIS_HOST = process.env.E2E_REDIS_HOST || "localhost";
process.env.REDIS_PORT = process.env.E2E_REDIS_PORT || "6379";
process.env.REDIS_PASS = "";
process.env.REDIS_USER = "";

// Import mocks FIRST to setup module mocking
import "./mocks";

// Import dependencies
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import { server } from "../../Server";
import { setupE2E, teardownE2E, clearE2EData } from "./setup";
import { createE2EUser, e2eAuthHeader, createE2EUsers } from "./helpers";
import User from "../../models/User.model";
import Follower from "../../models/Follower.model";

const E2E_BASE_URL = `http://localhost:${process.env.E2E_PORT || 3001}`;

describe("E2E: Follower Suggestions", () => {
  beforeAll(async () => {
    await setupE2E(server);
  }, 30000);

  afterAll(async () => {
    await teardownE2E();
  }, 60000);

  beforeEach(async () => {
    await clearE2EData();
  });

  describe("GET /api/v2/users/suggestions - Get Follower Suggestions", () => {
    test("should return empty suggestions for user with no followings", async () => {
      const user = await createE2EUser({
        userProfile: {
          university: "Test University",
          department: "Engineering",
          gender: "other",
          bio: "Test bio",
          rep_points: 50,
          lastSeen: new Date(),
        },
      });

      const response = await request(E2E_BASE_URL)
        .get("/api/v2/users/suggestions?limit=20&offset=0")
        .set(e2eAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    test("should return friends-of-friends suggestions with correct scoring", async () => {
      // Create users: currentUser -> userA -> userB
      // userB should be suggested to currentUser
      const [currentUser, userA, userB, userC] = await createE2EUsers(4);

      // Update users with campus and rep_points
      await User.findByIdAndUpdate(currentUser.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 100,
          "userProfile.lastSeen": new Date(),
        },
      });

      await User.findByIdAndUpdate(userA.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 80,
          "userProfile.lastSeen": new Date(),
        },
      });

      await User.findByIdAndUpdate(userB.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 150,
          "userProfile.lastSeen": new Date(),
        },
      });

      await User.findByIdAndUpdate(userC.user._id, {
        $set: {
          "userProfile.university": "Campus B",
          "userProfile.rep_points": 120,
          "userProfile.lastSeen": new Date(),
        },
      });

      // Create follow relationships
      // currentUser follows userA
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(currentUser.token))
        .send({ targetUserID: userA.user._id });

      // userA follows userB and userC
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(userA.token))
        .send({ targetUserID: userB.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(userA.token))
        .send({ targetUserID: userC.user._id });

      // Trigger suggestions computation (force refresh)
      const response = await request(E2E_BASE_URL)
        .get("/api/v2/users/suggestions?limit=20&offset=0&refresh=true")
        .set(e2eAuthHeader(currentUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // userB and userC should be suggested
      const suggestedIds = response.body.data.map((s: any) => s.user._id.toString());
      expect(suggestedIds).toContain(userB.user._id.toString());
      expect(suggestedIds).toContain(userC.user._id.toString());

      // Verify suggestion structure
      const suggestion = response.body.data[0];
      expect(suggestion).toHaveProperty("user");
      expect(suggestion).toHaveProperty("score");
      expect(suggestion).toHaveProperty("mutualFollowers");
      expect(suggestion).toHaveProperty("reasons");
      expect(suggestion.reasons).toContain("mutual_followers");
    });

    test("should prioritize same-campus users over cross-campus", async () => {
      const [currentUser, sameCampusUser, crossCampusUser, mutualFollower] = await createE2EUsers(4);

      // Setup campus affiliations
      await User.findByIdAndUpdate(currentUser.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 100,
          "userProfile.lastSeen": new Date(),
        },
      });

      await User.findByIdAndUpdate(sameCampusUser.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 50,
          "userProfile.lastSeen": new Date(),
        },
      });

      await User.findByIdAndUpdate(crossCampusUser.user._id, {
        $set: {
          "userProfile.university": "Campus B",
          "userProfile.rep_points": 200, // Higher rep but different campus
          "userProfile.lastSeen": new Date(),
        },
      });

      await User.findByIdAndUpdate(mutualFollower.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 80,
          "userProfile.lastSeen": new Date(),
        },
      });

      // Create follow graph: currentUser -> mutualFollower -> [sameCampus, crossCampus]
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(currentUser.token))
        .send({ targetUserID: mutualFollower.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(mutualFollower.token))
        .send({ targetUserID: sameCampusUser.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(mutualFollower.token))
        .send({ targetUserID: crossCampusUser.user._id });

      // Get suggestions
      const response = await request(E2E_BASE_URL)
        .get("/api/v2/users/suggestions?limit=20&offset=0&refresh=true")
        .set(e2eAuthHeader(currentUser.token));

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Find scores for same-campus vs cross-campus
      const sameCampusSuggestion = response.body.data.find(
        (s: any) => s.user._id.toString() === sameCampusUser.user._id.toString()
      );
      const crossCampusSuggestion = response.body.data.find(
        (s: any) => s.user._id.toString() === crossCampusUser.user._id.toString()
      );

      // Same campus should score higher despite lower rep_points
      expect(sameCampusSuggestion).toBeDefined();
      expect(crossCampusSuggestion).toBeDefined();
      expect(sameCampusSuggestion.score).toBeGreaterThan(crossCampusSuggestion.score);
      expect(sameCampusSuggestion.reasons).toContain("same_campus");
      expect(crossCampusSuggestion.reasons).toContain("connected_campus");
    });

    test("should boost suggestions based on activity and rep_points", async () => {
      const [currentUser, activeHighRepUser, inactiveUser, mutualFollower] = await createE2EUsers(4);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Setup users
      await User.findByIdAndUpdate(currentUser.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 100,
          "userProfile.lastSeen": now,
        },
      });

      await User.findByIdAndUpdate(activeHighRepUser.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 200, // High rep, recently active
          "userProfile.lastSeen": now,
        },
      });

      await User.findByIdAndUpdate(inactiveUser.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 50, // Lower rep, inactive
          "userProfile.lastSeen": oneWeekAgo,
        },
      });

      await User.findByIdAndUpdate(mutualFollower.user._id, {
        $set: {
          "userProfile.university": "Campus A",
          "userProfile.rep_points": 80,
          "userProfile.lastSeen": now,
        },
      });

      // Create follow graph
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(currentUser.token))
        .send({ targetUserID: mutualFollower.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(mutualFollower.token))
        .send({ targetUserID: activeHighRepUser.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(mutualFollower.token))
        .send({ targetUserID: inactiveUser.user._id });

      // Get suggestions
      const response = await request(E2E_BASE_URL)
        .get("/api/v2/users/suggestions?limit=20&offset=0&refresh=true")
        .set(e2eAuthHeader(currentUser.token));

      expect(response.status).toBe(200);

      const activeHighRepSuggestion = response.body.data.find(
        (s: any) => s.user._id.toString() === activeHighRepUser.user._id.toString()
      );
      const inactiveSuggestion = response.body.data.find(
        (s: any) => s.user._id.toString() === inactiveUser.user._id.toString()
      );

      // Active high-rep user should score higher
      expect(activeHighRepSuggestion).toBeDefined();
      expect(inactiveSuggestion).toBeDefined();
      expect(activeHighRepSuggestion.score).toBeGreaterThan(inactiveSuggestion.score);
      expect(activeHighRepSuggestion.activityScore).toBeGreaterThan(inactiveSuggestion.activityScore);
    });

    test("should support pagination and not suggest already-followed users", async () => {
      const [currentUser, alreadyFollowed, ...otherUsers] = await createE2EUsers(6);

      // Setup all users on same campus
      for (const user of [currentUser, alreadyFollowed, ...otherUsers]) {
        await User.findByIdAndUpdate(user.user._id, {
          $set: {
            "userProfile.university": "Campus A",
            "userProfile.rep_points": 100,
            "userProfile.lastSeen": new Date(),
          },
        });
      }

      // Create mutual follower who follows everyone
      const mutualFollower = otherUsers[0];
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(currentUser.token))
        .send({ targetUserID: mutualFollower.user._id });

      // currentUser already follows this one
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(currentUser.token))
        .send({ targetUserID: alreadyFollowed.user._id });

      // mutualFollower follows everyone else
      for (const user of [alreadyFollowed, ...otherUsers.slice(1)]) {
        await request(E2E_BASE_URL)
          .post("/api/v1/users/follow")
          .set(e2eAuthHeader(mutualFollower.token))
          .send({ targetUserID: user.user._id });
      }

      // Get suggestions
      const response = await request(E2E_BASE_URL)
        .get("/api/v2/users/suggestions?limit=2&offset=0&refresh=true")
        .set(e2eAuthHeader(currentUser.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2); // Pagination limit

      // Should NOT suggest already-followed user
      const suggestedIds = response.body.data.map((s: any) => s.user._id.toString());
      expect(suggestedIds).not.toContain(alreadyFollowed.user._id.toString());
      expect(suggestedIds).not.toContain(mutualFollower.user._id.toString());
      expect(suggestedIds).not.toContain(currentUser.user._id.toString()); // Not self

      // Test pagination offset
      const response2 = await request(E2E_BASE_URL)
        .get("/api/v2/users/suggestions?limit=2&offset=2")
        .set(e2eAuthHeader(currentUser.token));

      expect(response2.status).toBe(200);
      expect(response2.body.meta.offset).toBe(2);
    });
  });
});
