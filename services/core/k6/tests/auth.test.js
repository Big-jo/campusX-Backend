/**
 * K6 Authentication Load Test
 * Tests user registration and login endpoints
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { config, getLoadTestOptions } from '../config.js';
import {
  checkResponse,
  parseJSON,
  randomSleep,
  generateUserProfile,
  errorRate
} from '../utils.js';

export let options = getLoadTestOptions();

// Shared data between VUs
const users = [];

export function setup() {
  console.log('='.repeat(60));
  console.log('AUTH LOAD TEST - User Registration & Login');
  console.log('='.repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Target Users: ${config.testUsers.count}`);
  console.log('');
}

export default function () {
  const baseUrl = config.baseUrl;
  const userProfile = generateUserProfile();
  const password = config.testUsers.password;

  group('user_registration', () => {
    const registerPayload = {
      email: userProfile.email,
      name: userProfile.name,
      password,
      phoneNumber: userProfile.phoneNumber,
      userTag: userProfile.username
    };

    const registerRes = http.post(
      `${baseUrl}/api/v1/users/create`,
      JSON.stringify(registerPayload),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const registerSuccess = check(registerRes, {
      'registration: status is 201': (r) => r.status === 201,
      'registration: has result': (r) => {
        const body = parseJSON(r);
        return body && body.result;
      }
    });

    errorRate.add(!registerSuccess);

    if (!registerSuccess) {
      console.warn(`Registration failed for ${userProfile.username}: ${registerRes.status}`);
    }

    randomSleep(1, 2);
  });

  group('user_login', () => {
    const loginPayload = {
      email: userProfile.email,
      password
    };

    const loginRes = http.post(
      `${baseUrl}/api/v1/users/login`,
      JSON.stringify(loginPayload),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const loginSuccess = check(loginRes, {
      'login: status is 201': (r) => r.status === 201,
      'login: has token': (r) => {
        const body = parseJSON(r);
        return body && body.token;
      },
      'login: has user': (r) => {
        const body = parseJSON(r);
        return body && body.user;
      }
    });

    errorRate.add(!loginSuccess);

    if (loginSuccess) {
      const body = parseJSON(loginRes);
      // Store token for use in other tests
      users.push({
        email: userProfile.email,
        username: userProfile.username,
        token: body.token,
        userId: body.user._id || body.user.id
      });
    } else {
      console.warn(`Login failed for ${userProfile.username}: ${loginRes.status}`);
    }

    randomSleep(1, 2);
  });
}

export function teardown(data) {
  console.log('\n' + '='.repeat(60));
  console.log('✅ AUTH LOAD TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total users created: ${users.length}`);
  console.log('');
}
