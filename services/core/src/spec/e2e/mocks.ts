/**
 * E2E Test Mocks
 * Mock external services to avoid dependencies during testing
 */

process.env.NODE_ENV = 'test';

import { jest } from '@jest/globals';

// Store for OneSignal notifications (for test assertions)
export const oneSignalNotifications: Array<{
  timestamp: number;
  playerIds: string[];
  title: string;
  body: string;
  data: any;
}> = [];

export const mockCreateNotification = jest.fn(async (notification: any) => {
  console.log('[MOCK] OneSignal notification:', notification);
  oneSignalNotifications.push({
    timestamp: Date.now(),
    playerIds: notification.include_player_ids || [],
    title: notification.headings?.en || '',
    body: notification.contents?.en || '',
    data: notification.data || {},
  });
  return {
    id: `mock-notif-${Date.now()}`,
    recipients: notification.include_player_ids?.length || 0
  };
});

// Mock OneSignal Client
class MockOneSignalClient {
  constructor(appId: string, apiKey: string) {
    console.log('[MOCK] OneSignal client initialized');
  }
  createNotification = mockCreateNotification;
}

// Mock the OneSignal module
const mockOneSignal = {
  Client: MockOneSignalClient,
  __esModule: true,
  default: MockOneSignalClient
};

// Helper to clear notification store between tests
export function clearOneSignalNotifications() {
  oneSignalNotifications.length = 0;
  mockCreateNotification.mockClear();
}

// Mock S3 uploads
const mockS3 = {
  UploadImage: async function() {
    console.log('[MOCK] S3 image upload');
    return 'https://mock-s3-url.com/image.jpg';
  },
  UploadVideo: async function() {
    console.log('[MOCK] S3 video upload');
    return 'https://mock-s3-url.com/video.mp4';
  }
};

// Setup module mocks
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  // Mock onesignal-node
  if (id === 'onesignal-node') {
    return mockOneSignal;
  }

  // Mock aws-sdk S3
  if (id === 'aws-sdk') {
    return {
      S3: class MockS3Client {
        constructor(config: any) {}
        upload(params: any) {
          return {
            promise: async () => ({
              Location: `https://mock-s3-url.com/${params.Key}`,
              Bucket: params.Bucket,
              Key: params.Key
            })
          };
        }
      },
      Endpoint: class MockEndpoint {
        constructor(endpoint: string) {}
      }
    };
  }

  return originalRequire.apply(this, arguments);
};

export { mockOneSignal, mockS3 };
