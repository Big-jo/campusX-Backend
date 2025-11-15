/**
 * Newsfeed E2E Tests
 * Tests v2 newsfeed with fan-out write and long polling
 *
 * Environment configuration is handled by test.setup.ts (loaded via bunfig.toml)
 */

// Import mocks FIRST to setup module mocking
import "./mocks";

// Import dependencies
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import request from "supertest";
import { server } from "../../Server";
import { setupE2E, teardownE2E, clearE2EData } from "./setup";
import { createE2EUser, e2eAuthHeader, createE2EUsers, waitFor, createE2EPosts } from "./helpers";
import RedisClient from "../../lib/redis";

const E2E_BASE_URL = `http://localhost:${process.env.E2E_PORT || 3001}`;

describe("E2E: V2 Newsfeed", () => {
  beforeAll(async () => {
    await setupE2E(server);
  }, 30000);

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await clearE2EData();

    // Clear Redis v2 newsfeed keys
    const redis = RedisClient.getInstance();
    const keys = await redis.keys('v2:newsfeed:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe("POST /api/v2/posts/create - Fan-out Write", () => {
    test("should fan out post to all followers' timelines", async () => {
      // Create 3 users: author, follower1, follower2
      const [author, follower1, follower2] = await createE2EUsers(3);

      // follower1 and follower2 follow author
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(follower1.token))
        .send({ targetUserID: author.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(follower2.token))
        .send({ targetUserID: author.user._id });

      // Author creates post
      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(author.token))
        .send({
          text: "Test post for fan-out"
        });

      expect(postResponse.status).toBe(201);
      expect(postResponse.body.data.post).toBeDefined();
      const postId = postResponse.body.data.post.id;

      // Wait for fan-out to complete
      await waitFor(1000);

      // Verify post in follower1's timeline
      const feed1 = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(follower1.token));

      expect(feed1.status).toBe(200);
      expect(feed1.body.data.posts).toBeDefined();
      const hasPostInFeed1 = feed1.body.data.posts.some((p: any) => p._id === postId);
      expect(hasPostInFeed1).toBe(true);

      // Verify post in follower2's timeline
      const feed2 = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(follower2.token));

      expect(feed2.status).toBe(200);
      const hasPostInFeed2 = feed2.body.data.posts.some((p: any) => p._id === postId);
      expect(hasPostInFeed2).toBe(true);

      // Verify post in author's own timeline
      const authorFeed = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(author.token));

      expect(authorFeed.status).toBe(200);
      const hasPostInAuthorFeed = authorFeed.body.data.posts.some((p: any) => p._id === postId);
      expect(hasPostInAuthorFeed).toBe(true);
    });

    test("should handle post creation without followers", async () => {
      const user = await createE2EUser();

      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(user.token))
        .send({
          text: "Solo post"
        });

      expect(postResponse.status).toBe(201);
      await waitFor(500);

      // User should see own post
      const feed = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(user.token));

      expect(feed.status).toBe(200);
      expect(feed.body.data.posts.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v2/posts/newsfeed/poll - Long Polling", () => {
    test("should return immediately when new posts available", async () => {
      const [author, follower] = await createE2EUsers(2);

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(follower.token))
        .send({ targetUserID: author.user._id });

      const startTime = Date.now();

      // Start polling (will block) - reduced timeout to 5s for testing
      const pollPromise = request(E2E_BASE_URL)
        .get(`/api/v2/posts/newsfeed/poll?since=${Date.now()}&timeout=5`)
        .set(e2eAuthHeader(follower.token));

      // Create post after 2 seconds
      await waitFor(2000);
      await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(author.token))
        .send({
          text: "New post during poll"
        });

      const response = await pollPromise;
      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(6000); // Returned in <6s with 5s timeout
    }, 15000);

    test("should timeout when no new posts", async () => {
      const user = await createE2EUser();

      const startTime = Date.now();
      const response = await request(E2E_BASE_URL)
        .get(`/api/v2/posts/newsfeed/poll?since=${Date.now()}&timeout=5`)
        .set(e2eAuthHeader(user.token));

      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.posts.length).toBe(0);
      expect(elapsed).toBeGreaterThanOrEqual(4500); // Waited ~5s timeout
    }, 10000);
  });

  describe("GET /api/v2/posts/newsfeed - Pagination", () => {
    test("should paginate timeline correctly", async () => {
      const user = await createE2EUser();

      // Create 50 posts
      await createE2EPosts(user, 50, E2E_BASE_URL);
      await waitFor(2000); // Wait for fan-out

      // Get first page (20 posts)
      const page1 = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed?limit=20")
        .set(e2eAuthHeader(user.token));

      expect(page1.status).toBe(200);
      expect(page1.body.data.posts.length).toBe(20);
      expect(page1.body.data.hasMore).toBe(true);
      expect(page1.body.data.nextCursor).toBeDefined();

      // Get second page
      const page2 = await request(E2E_BASE_URL)
        .get(`/api/v2/posts/newsfeed?limit=20&cursor=${page1.body.data.nextCursor}`)
        .set(e2eAuthHeader(user.token));

      expect(page2.status).toBe(200);
      expect(page2.body.data.posts.length).toBe(20);
      expect(page2.body.data.hasMore).toBe(true);

      // Get third page
      const page3 = await request(E2E_BASE_URL)
        .get(`/api/v2/posts/newsfeed?limit=20&cursor=${page2.body.data.nextCursor}`)
        .set(e2eAuthHeader(user.token));

      expect(page3.status).toBe(200);
      expect(page3.body.data.posts.length).toBe(10); // Remaining posts
      expect(page3.body.data.hasMore).toBe(false);
    }, 30000);
  });

  describe("Timeline Limits", () => {
    test("should limit timeline to 500 posts", async () => {
      const [author, follower] = await createE2EUsers(2);

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(follower.token))
        .send({ targetUserID: author.user._id });

      // Create 550 posts (in batches to avoid timeout)
      for (let batch = 0; batch < 11; batch++) {
        await createE2EPosts(author, 50, E2E_BASE_URL);
        await waitFor(1000);
      }

      await waitFor(2000); // Wait for final fan-out

      // Check follower's timeline size via Redis
      const redis = RedisClient.getInstance();
      const timelineSize = await redis.zcard(`v2:newsfeed:timeline:${follower.user._id}`);

      expect(timelineSize).toBeLessThanOrEqual(500);
    }, 120000);
  });

  describe("DELETE /api/v2/posts/:postId - Remove from Timelines", () => {
    test("should remove deleted post from all followers' timelines", async () => {
      const [author, follower1, follower2] = await createE2EUsers(3);

      // Setup follows
      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(follower1.token))
        .send({ targetUserID: author.user._id });

      await request(E2E_BASE_URL)
        .post("/api/v1/users/follow")
        .set(e2eAuthHeader(follower2.token))
        .send({ targetUserID: author.user._id });

      // Create post
      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(author.token))
        .send({
          text: "To be deleted"
        });

      const postId = postResponse.body.data.post.id;
      await waitFor(1000);

      // Verify post exists in timelines
      const feedBefore = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(follower1.token));

      expect(feedBefore.body.data.posts.some((p: any) => p._id === postId)).toBe(true);

      // Delete post
      const deleteResponse = await request(E2E_BASE_URL)
        .delete(`/api/v2/posts/${postId}`)
        .set(e2eAuthHeader(author.token));

      expect(deleteResponse.status).toBe(200);
      await waitFor(1000);

      // Verify removed from follower1's timeline
      const feed1 = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(follower1.token));

      expect(feed1.body.data.posts.every((p: any) => p._id !== postId)).toBe(true);

      // Verify removed from follower2's timeline
      const feed2 = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(follower2.token));

      expect(feed2.body.data.posts.every((p: any) => p._id !== postId)).toBe(true);
    });

    test("should reject deletion by non-author", async () => {
      const [author, nonAuthor] = await createE2EUsers(2);

      // Author creates post
      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(author.token))
        .send({
          text: "Author's post"
        });

      const postId = postResponse.body.data.post.id;
      await waitFor(500);

      // Non-author tries to delete
      const deleteResponse = await request(E2E_BASE_URL)
        .delete(`/api/v2/posts/${postId}`)
        .set(e2eAuthHeader(nonAuthor.token));

      expect(deleteResponse.status).toBe(400);
    });
  });

  describe("Self Timeline", () => {
    test("should include own posts in timeline", async () => {
      const user = await createE2EUser();

      // Create post
      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(user.token))
        .send({
          text: "My post"
        });

      const postId = postResponse.body.data.post.id;
      await waitFor(1000);

      // Check own timeline
      const feed = await request(E2E_BASE_URL)
        .get("/api/v2/posts/newsfeed")
        .set(e2eAuthHeader(user.token));

      expect(feed.status).toBe(200);
      expect(feed.body.data.posts.some((p: any) => p._id === postId)).toBe(true);
    });
  });

  describe("POST /api/v2/posts/:postId/like - Like Post", () => {
    test("should like and unlike a post", async () => {
      const [author, liker] = await createE2EUsers(2);

      // Create post
      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(author.token))
        .send({
          text: "Like this post"
        });

      const postId = postResponse.body.data.post.id;

      // Like the post
      const likeResponse = await request(E2E_BASE_URL)
        .post(`/api/v2/posts/${postId}/like`)
        .set(e2eAuthHeader(liker.token));

      expect(likeResponse.status).toBe(200);
      expect(likeResponse.body.data.likes).toBe(1);

      // Unlike the post
      const unlikeResponse = await request(E2E_BASE_URL)
        .delete(`/api/v2/posts/${postId}/like`)
        .set(e2eAuthHeader(liker.token));

      expect(unlikeResponse.status).toBe(200);
      expect(unlikeResponse.body.data.likes).toBe(0);
    });

    test("should reject duplicate likes", async () => {
      const [author, liker] = await createE2EUsers(2);

      const postResponse = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(author.token))
        .send({
          text: "Like once"
        });

      const postId = postResponse.body.data.post.id;

      // First like
      await request(E2E_BASE_URL)
        .post(`/api/v2/posts/${postId}/like`)
        .set(e2eAuthHeader(liker.token));

      // Duplicate like
      const duplicateResponse = await request(E2E_BASE_URL)
        .post(`/api/v2/posts/${postId}/like`)
        .set(e2eAuthHeader(liker.token));

      expect(duplicateResponse.status).toBe(400);
    });
  });
});
