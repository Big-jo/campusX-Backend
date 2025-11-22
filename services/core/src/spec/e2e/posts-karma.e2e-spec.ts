/**
 * Posts Karma & Downvote E2E Tests
 */

import "./mocks";

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://localhost:27017/campusx_prime_test?authSource=admin";
process.env.REDIS_HOST = process.env.E2E_REDIS_HOST || "localhost";
process.env.REDIS_PORT = process.env.E2E_REDIS_PORT || "6379";

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { server } from "../../Server";
import { setupE2E, teardownE2E, clearE2EData } from "./setup";
import { createE2EUser, e2eAuthHeader, createE2EPosts, waitFor } from "./helpers";
import { clearOneSignalNotifications } from "./mocks";
import { OneSignalNotification } from "../../lib/onesignal";
import User from "../../models/User.model";
import Post from "../../models/Post.model";

// Spy on sendPushNotification
const sendPushNotificationSpy = jest.spyOn(OneSignalNotification.prototype, 'sendPushNotification');

const E2E_BASE_URL = `http://localhost:${process.env.E2E_PORT || 3001}`;

describe("E2E: Karma Points & Downvote", () => {
  beforeAll(async () => {
    await setupE2E(server);
  }, 30000);

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await clearE2EData();
    clearOneSignalNotifications();
    sendPushNotificationSpy.mockClear();
  });

  test("should award +1 karma for creating post", async () => {
    const { user, token } = await createE2EUser();
    const karmaBefore = user.userProfile.rep_points || 0;

    await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(token))
      .send({ text: "Test post" });

    const userAfter = await User.findById(user._id).lean();
    expect(userAfter?.userProfile?.rep_points).toBe(karmaBefore + 1);
  });

  test("should award +1 karma on like and trigger notification", async () => {
    const author = await createE2EUser({ onesignal_player_id: 'test-author-player' });
    const liker = await createE2EUser();

    const [postId] = await createE2EPosts(author, 1, E2E_BASE_URL);
    const authorAfter = await User.findById(author.user._id).lean();
    const karmaBefore = authorAfter?.userProfile?.rep_points || 0;

    await request(E2E_BASE_URL)
      .post(`/api/v2/posts/${postId}/like`)
      .set(e2eAuthHeader(liker.token));

    const userAfterLike = await User.findById(author.user._id).lean();
    expect(userAfterLike?.userProfile?.rep_points).toBe(karmaBefore + 1);

    // Wait for job worker to process
    await waitFor(1000);

    // Verify sendPushNotification was called
    expect(sendPushNotificationSpy).toHaveBeenCalled();
  });

  test("should deduct -1 karma on unlike", async () => {
    const author = await createE2EUser();
    const liker = await createE2EUser();

    const [postId] = await createE2EPosts(author, 1, E2E_BASE_URL);

    // Like first
    await request(E2E_BASE_URL)
      .post(`/api/v2/posts/${postId}/like`)
      .set(e2eAuthHeader(liker.token));

    const karmaAfterLike = (await User.findById(author.user._id).lean())?.userProfile?.rep_points || 0;

    // Unlike
    await request(E2E_BASE_URL)
      .delete(`/api/v2/posts/${postId}/like`)
      .set(e2eAuthHeader(liker.token));

    const userAfterUnlike = await User.findById(author.user._id).lean();
    expect(userAfterUnlike?.userProfile?.rep_points).toBe(karmaAfterLike - 1);
  });

  test("should downvote post, deduct -1 karma, and update dislikedBy", async () => {
    const author = await createE2EUser();
    const downvoter = await createE2EUser();

    const [postId] = await createE2EPosts(author, 1, E2E_BASE_URL);

    const authorBeforeDownvote = await User.findById(author.user._id).lean();
    const karmaBefore = authorBeforeDownvote?.userProfile?.rep_points || 0;

    const res = await request(E2E_BASE_URL)
      .post(`/api/v2/posts/${postId}/downvote`)
      .set(e2eAuthHeader(downvoter.token));

    expect(res.status).toBe(200);
    expect(res.body.data.dislikes).toBe(1);

    const userAfter = await User.findById(author.user._id).lean();
    expect(userAfter?.userProfile?.rep_points).toBe(karmaBefore - 1);

    const post = await Post.findById(postId).lean();
    expect(post?.dislikes).toBe(1);
  });

  test("should prevent duplicate downvotes", async () => {
    const author = await createE2EUser();
    const downvoter = await createE2EUser();

    const [postId] = await createE2EPosts(author, 1, E2E_BASE_URL);

    await request(E2E_BASE_URL)
      .post(`/api/v2/posts/${postId}/downvote`)
      .set(e2eAuthHeader(downvoter.token));

    const duplicate = await request(E2E_BASE_URL)
      .post(`/api/v2/posts/${postId}/downvote`)
      .set(e2eAuthHeader(downvoter.token));

    expect(duplicate.status).toBe(400);
    expect(duplicate.body.message).toContain("already downvoted");
  });

  test("should remove downvote and restore +1 karma", async () => {
    const author = await createE2EUser();
    const downvoter = await createE2EUser();

    const [postId] = await createE2EPosts(author, 1, E2E_BASE_URL);
    const authorAfterPost = await User.findById(author.user._id).lean();

    const karmaBefore = authorAfterPost?.userProfile?.rep_points || 0;

    await request(E2E_BASE_URL)
      .post(`/api/v2/posts/${postId}/downvote`)
      .set(e2eAuthHeader(downvoter.token));

    const res = await request(E2E_BASE_URL)
      .delete(`/api/v2/posts/${postId}/downvote`)
      .set(e2eAuthHeader(downvoter.token));


    expect(res.status).toBe(200);
    expect(res.body.data.dislikes).toBe(0);

    const userAfter = await User.findById(author.user._id).lean();
    expect(userAfter?.userProfile?.rep_points).toBe(karmaBefore);
  });

  test("should queue comment notification", async () => {
    const author = await createE2EUser({ onesignal_player_id: 'author-player' });
    const commenter = await createE2EUser();

    const [postId] = await createE2EPosts(author, 1, E2E_BASE_URL);

    await request(E2E_BASE_URL)
      .post("/api/v2/posts/create")
      .set(e2eAuthHeader(commenter.token))
      .send({ text: "Nice post!", parentPost: postId });

    // Wait for job processing
    await waitFor(1000);

    // Verify sendPushNotification was called
    expect(sendPushNotificationSpy).toHaveBeenCalled();
  });
});
