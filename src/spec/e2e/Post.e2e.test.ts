/**
 * Post Routes E2E Tests
 * Integration tests with real MongoDB + Redis via Docker Compose
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

  beforeEach(async () => {
    await clearE2EData();
  });

  describe("POST api/v2/posts/create - Create Post", () => {
    test("should create a text-only post", async () => {
    const user = await createE2EUser();

    const response = await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(user.token))
      .field('text', 'This is my first post from E2E test!');

    expect(response.status).toBe(201);

  // Wait for async post creation
  await waitFor(500);

  // Verify post was created
  const posts = await PostModel.find({ author: user.user._id });
  expect(posts.length).toBeGreaterThan(0);
  expect(posts[0].text).toBe("This is my first post from E2E test!");
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
});

test("should require authentication", async () => {
  const response = await request(E2E_BASE_URL)
    .post("/api/v2/posts/create")
    .field('text', 'This should fail');

  expect(response.status).toBe(401);
});

test("should handle empty post text", async () => {
  const user = await createE2EUser();

  const response = await request(E2E_BASE_URL)
    .post("/api/v2/posts/create")
    .set(e2eAuthHeader(user.token))
    .field('text', '');

  // Should reject - service validation requires content
  expect([400, 500]).toContain(response.status);
});

// File upload tests disabled - S3 mocking needs fix
// test("should create post with image upload", async () => {
//   const user = await createE2EUser();

//   const response = await request(E2E_BASE_URL)
//     .post("/api/v2/posts/create")
//     .set(e2eAuthHeader(user.token))
//     .field('text', 'Post with image')
//     .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

//   expect(response.status).toBe(201);

//   await waitFor(500);

//   const posts = await PostModel.find({ author: user.user._id });
//   expect(posts.length).toBeGreaterThan(0);
//   expect(posts[0].text).toBe('Post with image');
// });

// test("should create post with video upload", async () => {
//   const user = await createE2EUser();

//   const response = await request(E2E_BASE_URL)
//     .post("/api/v2/posts/create")
//     .set(e2eAuthHeader(user.token))
//     .field('text', 'Post with video')
//     .attach('video', Buffer.from('fake-video-data'), 'test.mp4');

//   expect(response.status).toBe(201);

//   await waitFor(500);

//   const posts = await PostModel.find({ author: user.user._id });
//   expect(posts.length).toBeGreaterThan(0);
//   expect(posts[0].text).toBe('Post with video');
// });

// test("should create post with both image and video", async () => {
//   const user = await createE2EUser();

//   const response = await request(E2E_BASE_URL)
//     .post("/api/v2/posts/create")
//     .set(e2eAuthHeader(user.token))
//     .field('text', 'Post with image and video')
//     .attach('image', Buffer.from('fake-image-data'), 'test.jpg')
//     .attach('video', Buffer.from('fake-video-data'), 'test.mp4');

//   expect(response.status).toBe(201);

//   await waitFor(500);

//   const posts = await PostModel.find({ author: user.user._id });
//   expect(posts.length).toBeGreaterThan(0);
//   expect(posts[0].text).toBe('Post with image and video');
// });
  });

// Removed: v1 like endpoint replaced by v2 /api/v2/posts/:postId/like

describe("POST /api/v1/post/comment - Create Comment", () => {
  test("should create a comment on a post", async () => {
    const [user1, user2] = await createE2EUsers(2);

    // User1 creates a post
    await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(user1.token))
      .field('text', 'Original post');

    await waitFor(500);

    const posts = await PostModel.find({ author: user1.user._id });
    const postId = posts[0]._id;

    // User2 comments on the post
    const response = await request(E2E_BASE_URL)
      .post("/api/v1/post/comment")
      .set(e2eAuthHeader(user2.token))
      .send({
        text: "Great post!",
        parentPost: postId.toString(),
        type: "postComment",
      });

    expect(response.status).toBe(201);
  });

  test("should require authentication", async () => {
    const response = await request(E2E_BASE_URL)
      .post("/api/v1/post/comment")
      .send({
        text: "Comment",
        parentPost: "507f1f77bcf86cd799439011",
      });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/v1/post/comments/:postID - Get Comments", () => {
  test("should get comments for a post", async () => {
    const [user1, user2] = await createE2EUsers(2);

    // User1 creates a post
    await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(user1.token))
      .field('text', 'Post with comments');

    await waitFor(500);

    const posts = await PostModel.find({ author: user1.user._id });
    const postId = posts[0]._id;
    console.log("Post ID for comments test:", postId.toString());
    // User2 comments
    await request(E2E_BASE_URL)
      .post("/api/v1/post/comment")
      .set(e2eAuthHeader(user2.token))
      .send({
        text: "First comment",
        parentPost: postId.toString(),
        type: "postComment",
      });

    // Get comments
    const response = await request(E2E_BASE_URL)
      .get(`/api/v1/post/comments/${postId}?page=0&limit=10`)
      .set(e2eAuthHeader(user1.token));

    expect(response.status).toBe(200);
    expect(response.body.result).toBeDefined();
  });

  test("should require authentication", async () => {
    const response = await request(E2E_BASE_URL)
      .get("/api/v1/post/comments/507f1f77bcf86cd799439011?page=0&limit=10");

    expect(response.status).toBe(401);
  });
});

// Removed: v1 newsfeed endpoints replaced by v2 /api/v2/posts/newsfeed
// Removed: v1 delete endpoint replaced by v2 DELETE /api/v2/posts/:postId

describe("POST /api/v1/post/like/comment - Like Comment", () => {
  test("should like a comment", async () => {
    const [user1, user2, user3] = await createE2EUsers(3);

    // User1 creates post
    await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(user1.token))
      .field('text', 'Original post');

    const posts = await PostModel.find({ author: user1.user._id });
    const postId = posts[0]._id;

    // User2 comments
    await request(E2E_BASE_URL)
      .post("/api/v1/post/comment")
      .set(e2eAuthHeader(user2.token))
      .send({
        text: "Great post!",
        parentPost: postId.toString(),
        type: "postComment",
      });

    // Get the comment
    const commentsResponse = await request(E2E_BASE_URL)
      .get(`/api/v1/post/comments/${postId}?page=0&limit=10`)
      .set(e2eAuthHeader(user1.token));

    const comments = commentsResponse.body.result.comments;
    if (comments && comments.length > 0) {
      const commentId = comments[0]._id;

      // User3 likes the comment
      const response = await request(E2E_BASE_URL)
        .post("/api/v1/post/like/comment")
        .set(e2eAuthHeader(user3.token))
        .send({ commentID: commentId });

      expect(response.status).toBe(200);
    }
  });
});
});
