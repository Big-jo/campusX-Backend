/**
 * Post Routes E2E Tests
 * Integration tests with real MongoDB + Redis via Docker Compose
 *
 * Environment configuration is handled by test.setup.ts (loaded via bunfig.toml)
 */

// Import mocks FIRST to setup module mocking
import "./mocks";

// Import dependencies
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import { server } from "../../Server";
import { setupE2E, teardownE2E, clearE2EData } from "./setup";
import { createE2EUser, e2eAuthHeader, createE2EUsers, waitFor } from "./helpers";
import { Post } from "../../entities/Post";
import PostModel from "../../models/Post.model";

const E2E_BASE_URL = `http://localhost:${process.env.E2E_PORT || 3001}`;
const moduleURl = 'api/v2/posts';

describe("E2E: Post Routes", () => {
  beforeAll(async () => {
    await setupE2E(server);
  }, 30000);

  afterAll(async () => {
    await teardownE2E();
  });

  // Note: beforeEach removed - sequential tests manage their own data

  describe("V2 Unified Posts API - Create Post", () => {
    beforeEach(async () => {
      await clearE2EData();
    });

    test("should create regular post with type=post", async () => {
    const user = await createE2EUser();

    const response = await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(user.token))
      .field('text', 'This is my first post from E2E test!');

    expect(response.status).toBe(201);

  // Wait for async post creation
  await waitFor(500);

  // Verify post was created with type='post'
  const posts = await PostModel.find({ author: user.user._id });
  expect(posts.length).toBeGreaterThan(0);
  expect(posts[0].text).toBe("This is my first post from E2E test!");
  expect(posts[0].type).toBe('post');
});

test("should create post with mentions and hashtags", async () => {
  const [user1, user2] = await createE2EUsers(2);

  const postText = `Hey @${user2.user.userTag} check out #campuslife #testing`;

  const response = await request(E2E_BASE_URL)
    .post("/api/v2/posts/create")
    .set(e2eAuthHeader(user1.token))
    .field('text', postText);

  expect(response.status).toBe(201);

  await waitFor(500);

  const posts = await PostModel.find({ author: user1.user._id });
  expect(posts.length).toBeGreaterThan(0);
  expect(posts[0].text).toContain("@");
  expect(posts[0].text).toContain("#");
  expect(posts[0].type).toBe('post');
});

test("should require authentication", async () => {
  const response = await request(E2E_BASE_URL)
    .post("/api/v2/posts/create")
    .field('text', 'This should fail');

  expect(response.status).toBe(401);
});

  });

  // Sequential E2E flow where each test builds on previous state
  describe("V2 Unified Posts API - Comments & Interactions (Sequential)", () => {
    let testUser: any;
    let testPost: any;
    let testComment: any;
    let testReply: any;

    beforeAll(async () => {
      // Clear data first, then create user
      await clearE2EData();
    });

    // Create user in first test to ensure it happens AFTER clearE2EData completes
    test("Step 1: Create regular post", async () => {
      // Create test user on demand
      if (!testUser) {
        testUser = await createE2EUser();
      }

      const response = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(testUser.token))
        .field('text', 'Test post for comments');

      expect(response.status).toBe(201);
      await waitFor(500);

      const posts = await PostModel.find({ author: testUser.user._id });
      testPost = posts[0];
      expect(testPost.type).toBe('post');
      expect(testPost.text).toBe('Test post for comments');
    });

    test("Step 2: Create comment on post via unified endpoint", async () => {
      const response = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(testUser.token))
        .field('text', 'This is a comment')
        .field('parentPost', testPost._id.toString());

      expect(response.status).toBe(201);
      await waitFor(500);

      // Find comment in database
      const comments = await PostModel.find({
        type: 'comment',
        parentPost: testPost._id.toString()
      });
      testComment = comments[0];

      expect(testComment).toBeDefined();
      expect(testComment.type).toBe('comment');
      expect(testComment.parentPost).toBe(testPost._id.toString());
      expect(testComment.text).toBe('This is a comment');

      // Verify parent post comment count incremented
      const updatedPost = await PostModel.findById(testPost._id);
      expect(updatedPost?.comments).toBe(1);
    });

    test("Step 3: Create nested reply (comment on comment)", async () => {
      const response = await request(E2E_BASE_URL)
        .post("/api/v2/posts/create")
        .set(e2eAuthHeader(testUser.token))
        .send({
          text: 'Reply to comment',
          parentPost: testComment._id.toString()
        });

      expect(response.status).toBe(201);
      await waitFor(500);

      // Find reply
      const replies = await PostModel.find({
        type: 'comment',
        parentPost: testComment._id.toString()
      });
      testReply = replies[0];

      expect(testReply).toBeDefined();
      expect(testReply.type).toBe('comment');
      expect(testReply.parentPost).toBe(testComment._id.toString());
      expect(testReply.text).toBe('Reply to comment');
    });

    test("Step 4: Fetch comments via query params", async () => {
      const response = await request(E2E_BASE_URL)
        .get(`/api/v2/posts`)
        .query({ parentPost: testPost._id.toString() })
        .set(e2eAuthHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].type).toBe('comment');
      expect(response.body[0].parentPost).toBe(testPost._id.toString());
    });

    test("Step 5: Like comment via unified like endpoint", async () => {
      const response = await request(E2E_BASE_URL)
        .post(`/api/v2/posts/${testComment._id}/like`)
        .set(e2eAuthHeader(testUser.token));

      expect(response.status).toBe(200);

      // Verify like count incremented
      const likedComment = await PostModel.findById(testComment._id);
      expect(likedComment?.likes).toBe(1);
    });

    test("Step 6: Delete comment and cascade to replies", async () => {
      const response = await request(E2E_BASE_URL)
        .delete(`/api/v2/posts/${testComment._id}`)
        .set(e2eAuthHeader(testUser.token));

      expect(response.status).toBe(200);

      // Verify comment deleted
      const deletedComment = await PostModel.findById(testComment._id);
      expect(deletedComment).toBeNull();

      // Verify reply also deleted (cascade)
      const deletedReply = await PostModel.findById(testReply._id);
      expect(deletedReply).toBeNull();
    });
  });
});
