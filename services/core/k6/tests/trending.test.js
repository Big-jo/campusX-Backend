/**
 * K6 Trending Topics Load Test
 * Tests trending posts and topics endpoints
 * Validates that engagement data is properly aggregated
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { config, getLoadTestOptions } from '../config.js';
import {
  authenticatedRequest,
  parseJSON,
  randomSleep,
  errorRate
} from '../utils.js';

export let options = getLoadTestOptions([
  { duration: '20s', target: 10 },
  { duration: '1m', target: 30 },
  { duration: '20s', target: 0 }
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

export function setup() {
  console.log('='.repeat(60));
  console.log('TRENDING TEST - Trending Posts & Topics');
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

  console.log(`✅ Logged in ${authenticatedUsers.length} users\n`);

  return { users: authenticatedUsers };
}

export default function (data) {
  const baseUrl = config.baseUrl;

  if (!data || !data.users || data.users.length === 0) {
    console.error('No authenticated users');
    return;
  }

  const user = data.users[__VU % data.users.length];

  group('trending_posts', () => {
    const trendingRes = authenticatedRequest(
      http,
      'get',
      `${baseUrl}/api/v2/trending?page=1&limit=20`,
      user.token
    );

    const success = check(trendingRes, {
      'trending_posts: status is 200': (r) => r.status === 200,
      'trending_posts: has posts': (r) => {
        const body = parseJSON(r);
        return body && (body.posts || body.trending);
      },
      'trending_posts: loads within 1s': (r) => r.timings.duration < 1000,
      'trending_posts: sorted by engagement': (r) => {
        const body = parseJSON(r);
        if (!body || !body.posts) return true; // Skip check if no posts

        const posts = body.posts;
        if (posts.length < 2) return true;

        // Verify descending order by engagement score
        for (let i = 0; i < posts.length - 1; i++) {
          const current = posts[i].likesCount + posts[i].commentsCount * 2;
          const next = posts[i + 1].likesCount + posts[i + 1].commentsCount * 2;

          if (current < next) {
            console.warn(`Trending posts not properly sorted at index ${i}`);
            return false;
          }
        }

        return true;
      }
    });

    errorRate.add(!success);

    if (!success) {
      console.warn(`Trending posts failed: ${trendingRes.status}`);
    }

    randomSleep(2, 4);
  });

  group('trending_topics', () => {
    const topicsRes = authenticatedRequest(
      http,
      'get',
      `${baseUrl}/api/v2/trending/topics?limit=10`,
      user.token
    );

    const success = check(topicsRes, {
      'trending_topics: status is 200': (r) => r.status === 200,
      'trending_topics: has topics': (r) => {
        const body = parseJSON(r);
        return body && (body.topics || body.hashtags);
      },
      'trending_topics: loads within 500ms': (r) => r.timings.duration < 500,
      'trending_topics: has counts': (r) => {
        const body = parseJSON(r);
        if (!body || !body.topics) return true;

        const topics = body.topics;
        if (topics.length === 0) return true;

        // Verify topics have count/score
        return topics.every(topic =>
          topic.count !== undefined || topic.score !== undefined
        );
      }
    });

    errorRate.add(!success);

    if (!success) {
      console.warn(`Trending topics failed: ${topicsRes.status}`);
    }

    randomSleep(3, 5);
  });

  // Occasionally check topic discovery
  if (Math.random() < 0.2) { // 20% of the time
    group('topic_discovery', () => {
      // Check if hashtags are being detected
      const discoverRes = authenticatedRequest(
        http,
        'get',
        `${baseUrl}/api/v2/search?q=StudentLife&type=hashtag`,
        user.token
      );

      check(discoverRes, {
        'discovery: status is 200': (r) => r.status === 200
      });

      randomSleep(1, 2);
    });
  }

  // Validate caching
  group('trending_cache', () => {
    // Make same request twice to test cache
    const firstReq = authenticatedRequest(
      http,
      'get',
      `${baseUrl}/api/v2/trending?page=1&limit=10`,
      user.token
    );

    const firstTime = firstReq.timings.duration;

    sleep(0.5);

    const secondReq = authenticatedRequest(
      http,
      'get',
      `${baseUrl}/api/v2/trending?page=1&limit=10`,
      user.token
    );

    const secondTime = secondReq.timings.duration;

    check(secondReq, {
      'cache: second request faster or similar': (r) => {
        // Cached requests should be faster or within 50ms
        return secondTime <= firstTime + 50;
      }
    });

    randomSleep(2, 3);
  });
}

export function teardown(data) {
  console.log('\n' + '='.repeat(60));
  console.log('✅ TRENDING TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Validation Points:');
  console.log('  ✓ Trending posts endpoint');
  console.log('  ✓ Trending topics endpoint');
  console.log('  ✓ Proper sorting by engagement');
  console.log('  ✓ Response time < 1s');
  console.log('  ✓ Caching behavior');
  console.log('');
  console.log('Check summary for:');
  console.log('  - Response times');
  console.log('  - Cache hit effectiveness');
  console.log('  - Error rates');
  console.log('');
}
