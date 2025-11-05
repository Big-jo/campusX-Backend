/**
 * Post Entity Tests
 * Migrated to Bun test runner
 */
import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { Post } from "../../entities/Post";
import { IPost, IComment } from "../../interfaces";
import PostModel from "../../models/Post.model";
import CommentModel from "../../models/Comment.model";
import faker from "faker";
import {
  setupTestDB,
  clearTestDB,
  teardownTestDB,
  setupTestRedis,
  teardownTestRedis,
  createTestUser,
  createTestPost,
  generatePostData,
} from "../utils";

describe("Post Entity", () => {
  let testRedis: any;
  let testUser: any;
  let testPost: any;

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

  test("should create a post", async () => {
    // Create a test user first
    const user = await createTestUser();

    // Create post data
    const postData: IPost = {
      author: user.user._id.toString(),
      text: faker.lorem.sentences(2),
      campus: "Bells University Of Technology",
      parentPost: "",
    };

    // Create the post
    await Post.CreatePost(postData, postData.author, testRedis, { campusReflect: "true" });

    // Verify post was created
    const result = await PostModel.findOne({ text: postData.text }).exec();
    expect(result).toBeDefined();
    expect(result?.text).toBe(postData.text);
    expect(result?.author).toBeDefined();
    expect(result?.createdAt).toBeDefined();
  });

  describe("Post Interactions", () => {
    beforeAll(async () => {
      // Create user and post for interaction tests
      testUser = await createTestUser();
      const postData = generatePostData(testUser.user._id.toString(), {
        campus: "Bells University Of Technology",
      });
      await Post.CreatePost(postData, postData.author, testRedis, { campusReflect: "true" });
      testPost = await PostModel.findOne({ text: postData.text }).exec();
    });

    // TODO: Fix Firebase dependency - LikePost sends notifications
    test.skip("should like a post", async () => {
      const result = await Post.LikePost(
        testUser.user._id,
        testPost._id,
        "post",
        testRedis,
        null,
      );

      expect(result).toBeDefined();
      expect(result.result).toBe("liked");
    });

    // TODO: Fix Firebase dependency - Comment sends notifications
    test.skip("should comment on a post", async () => {
      const commentUser = await createTestUser();

      const commentObject: IComment = {
        campus: "Bells University Of Technology",
        parentPost: testPost._id,
        userTag: commentUser.user.userTag,
        author: commentUser.user._id,
        text: faker.lorem.lines(2),
        authorAvatar: commentUser.user.userProfile.avatar,
        type: "comment",
      };

      await Post.Comment(commentObject, "mock-fcm-token", testRedis);

      const comment = await CommentModel.findOne({ text: commentObject.text });
      expect(comment).toBeDefined();
      expect(comment?.text).toBe(commentObject.text);
    });

    test("should get comments for a post", async () => {
      // Create a comment first (directly in DB to avoid Firebase)
      const commentUser = await createTestUser();
      await CommentModel.create({
        parentPost: testPost._id,
        author: commentUser.user._id,
        text: faker.lorem.lines(2),
        type: "postComment",
        createdAt: Date.now(),
      });

      const result = await Post.GetComments(testPost._id, testUser.user._id, 10, 1);

      expect(result).toBeDefined();
      expect(result.comments).toBeDefined();
      expect(Array.isArray(result.comments)).toBe(true);

      if (result.comments.length > 0) {
        expect(result.comments[0]).toHaveProperty("createdAt");
        expect(result.comments[0]).toHaveProperty("author");
        expect(result.comments[0]).toHaveProperty("text");
        expect(result.comments[0]).toHaveProperty("parentPost");
      }
    });
  });

  // TODO: Uncomment and test these scenarios when Firebase is properly mocked
  // describe("Advanced Comment Operations", () => {
  //   test("should like a comment", async () => {
  //     // Test implementation
  //   });
  //
  //   test("should reply to a comment", async () => {
  //     // Test implementation
  //   });
  //
  //   test("should mention user in a post", async () => {
  //     // Test implementation
  //   });
  //
  //   test("should mention user in a comment", async () => {
  //     // Test implementation
  //   });
  // });

  // TODO: Test user feed functionality
  // describe("User Feed", () => {
  //   test("should get user feed with most recent posts", async () => {
  //     // Test implementation
  //   });
  // });
});
