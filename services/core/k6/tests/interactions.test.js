/**
 * K6 Interactions Load Test
 * Tests likes, comments, shares with realistic distribution
 * Validates interest tracking and ML service integration
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { config, getLoadTestOptions } from '../config.js';
import {
  authenticatedRequest,
  parseJSON,
  randomSleep,
  getWeightedAction,
  generateComment,
  interactionTime,
  interactionCount,
  errorRate
} from '../utils.js';

export let options = getLoadTestOptions([
  { duration: '30s', target: 20 },
  { duration: '3m', target: 50 }, // Sustained interaction load
  { duration: '30s', target: 0 }
]);

const users = new SharedArray('users', function () {
  const userCount = parseInt(__ENV.USER_COUNT) || 10;
  const seedUsers = [];

  for (let i = 0; i < userCount; i++) {
    seedUsers.push({
      email: `testuser${i}@unilag.edu.ng`,
      password: 'Test@123'
    });
  }

  return seedUsers;
});

let authenticatedUsers = [];
let availablePosts = [];

export function setup() {
  console.log('='.repeat(60));
  console.log('INTERACTIONS TEST - Likes, Comments, Shares');
  console.log('='.repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log('');

  const baseUrl = config.baseUrl;

  // Login users
  console.log('📝 Logging in users...');
  for (const user of users) {
    const loginRes = http.post(
      `${baseUrl}/api/v1/users/login`,
      JSON.stringify({
        email: user.email,
        password: user.password
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (loginRes.status === 201) {
      const body = JSON.parse(loginRes.body);
      authenticatedUsers.push({
        email: user.email,
        token: body.token,
        userId: body.user._id || body.user.id
      });
    }
  }

  console.log(`✅ Logged in ${authenticatedUsers.length} users`);

  // Get available posts from newsfeed
  console.log('📱 Fetching posts for interaction...');
  if (authenticatedUsers.length > 0) {
    const feedRes = authenticatedRequest(
      http,
      'get',
      `${baseUrl}/api/v2/posts/newsfeed?page=1&limit=50`,
      authenticatedUsers[0].token
    );

    if (feedRes.status === 200) {
      const body = JSON.parse(feedRes.body);
      if (body.posts && body.posts.length > 0) {
        availablePosts = body.posts.map(p => ({
          id: p._id || p.id,
          content: p.content
        }));
        console.log(`✅ Found ${availablePosts.length} posts\n`);
      }
    }
  }

  return {
    users: authenticatedUsers,
    posts: availablePosts
  };
}

export default function (data) {
  const baseUrl = config.baseUrl;

  if (!data || !data.users || data.users.length === 0) {
    console.error('No authenticated users');
    return;
  }

  if (!data.posts || data.posts.length === 0) {
    console.error('No posts available for interaction');
    return;
  }

  const user = data.users[__VU % data.users.length];
  const post = data.posts[Math.floor(Math.random() * data.posts.length)];

  // Get weighted random action based on realistic distribution
  const action = getWeightedAction();

  if (action === 'view') {
    // Just viewing - fetch post details
    group('view_post', () => {
      const viewRes = authenticatedRequest(
        http,
        'get',
        `${baseUrl}/api/v2/posts/${post.id}`,
        user.token
      );

      const success = check(viewRes, {
        'view: status is 200': (r) => r.status === 200
      });

      errorRate.add(!success);
      randomSleep(2, 5);
    });

  } else if (action === 'like') {
    // Like the post
    group('like_post', () => {
      const startTime = Date.now();
      const likeRes = authenticatedRequest(
        http,
        'post',
        `${baseUrl}/api/v2/posts/${post.id}/like`,
        user.token
      );
      const duration = Date.now() - startTime;

      const success = check(likeRes, {
        'like: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'like: response time < 200ms': (r) => duration < 200
      });

      errorRate.add(!success);
      interactionTime.add(duration);

      if (success) {
        interactionCount.add(1);
      }

      randomSleep(1, 3);
    });

  } else if (action === 'comment') {
    // Comment on post
    group('comment_post', () => {
      const commentText = generateComment();

      const startTime = Date.now();
      const commentRes = authenticatedRequest(
        http,
        'post',
        `${baseUrl}/api/v2/posts/${post.id}/comment`,
        user.token,
        { content: commentText }
      );
      const duration = Date.now() - startTime;

      const success = check(commentRes, {
        'comment: status is 200 or 201': (r) => r.status === 200 || r.status === 201
      });

      errorRate.add(!success);
      interactionTime.add(duration);

      if (success) {
        interactionCount.add(1);
      }

      randomSleep(2, 4);
    });

  } else if (action === 'share') {
    // Share/repost
    group('share_post', () => {
      const startTime = Date.now();
      const shareRes = authenticatedRequest(
        http,
        'post',
        `${baseUrl}/api/v2/posts/${post.id}/share`,
        user.token
      );
      const duration = Date.now() - startTime;

      const success = check(shareRes, {
        'share: status is 200 or 201': (r) => r.status === 200 || r.status === 201
      });

      errorRate.add(!success);
      interactionTime.add(duration);

      if (success) {
        interactionCount.add(1);
      }

      randomSleep(3, 6);
    });
  }

  // Occasionally check user interests (validates ML service integration)
  if (Math.random() < 0.1) { // 10% of the time
    group('check_interests', () => {
      const interestsRes = authenticatedRequest(
        http,
        'get',
        `${baseUrl}/api/v2/users/me`,
        user.token
      );

      check(interestsRes, {
        'interests: status is 200': (r) => r.status === 200,
        'interests: has user data': (r) => {
          const body = parseJSON(r);
          return body && body.user;
        }
      });

      randomSleep(1, 2);
    });
  }
}

export function teardown(data) {
  console.log('\n' + '='.repeat(60));
  console.log('✅ INTERACTIONS TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Interaction Distribution:');
  console.log('  - Views: ~60% (view only)');
  console.log('  - Likes: ~25%');
  console.log('  - Comments: ~10%');
  console.log('  - Shares: ~5%');
  console.log('');
  console.log('Check summary for:');
  console.log('  - Total interactions made');
  console.log('  - Interaction response times');
  console.log('  - Interest tracking integration');
  console.log('');
}
