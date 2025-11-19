/**
 * E2E Test Mocks
 * Mock external services to avoid dependencies during testing
 */

// Mock Firebase Admin before it gets imported
const mockMessaging = {
  send: async (message: any) => {
    console.log('[MOCK] Firebase message sent:', message);
    return 'mock-message-id';
  },
  sendMulticast: async (message: any) => {
    console.log('[MOCK] Firebase multicast sent:', message);
    return {
      successCount: message.tokens?.length || 0,
      failureCount: 0,
      responses: []
    };
  },
  sendToDevice: async (token: string, payload: any) => {
    console.log('[MOCK] Firebase sendToDevice:', { token, payload });
    return {
      results: [{ messageId: 'mock-message-id' }],
      canonicalRegistrationTokenCount: 0,
      failureCount: 0,
      successCount: 1,
      multicastId: 123456
    };
  }
};

const mockFirebaseAdmin = {
  initializeApp: () => {
    console.log('[MOCK] Firebase Admin initialized');
  },
  credential: {
    cert: (serviceAccount: any) => {
      console.log('[MOCK] Firebase credential created');
      return {};
    }
  },
  messaging: () => mockMessaging,
  apps: []
};

// Mock the require call for service-file.json
const mockServiceAccount = {
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'test-key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n',
  client_email: 'test@test-project.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

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
  // Mock firebase-admin
  if (id === 'firebase-admin') {
    return mockFirebaseAdmin;
  }

  // Mock service-file.json
  if (id.includes('service-file.json')) {
    return mockServiceAccount;
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

export { mockFirebaseAdmin, mockMessaging, mockServiceAccount, mockS3 };
