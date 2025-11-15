/**
 * Global test setup - runs BEFORE any test files are loaded
 * Sets environment variables for all tests
 */

// Determine test type based on pattern
const isE2ETest = process.argv.some(arg => arg.includes('e2e') || arg.includes('.e2e.test.ts'));
const isUnitTest = process.argv.some(arg => arg.includes('.spec.ts'));

if (isE2ETest) {
  // E2E test configuration
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = 'mongodb://localhost:27017/campusx_test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';
  process.env.E2E_REDIS_HOST = 'localhost';
  process.env.E2E_REDIS_PORT = '6379';
  process.env.E2E_PORT = '3001';

  // Required env vars for Server.ts validation
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.PORT = '3001';
  process.env.S3_BUCKET = 'test-bucket';
  process.env.S3_ACCESS_KEY = 'test-key';
  process.env.S3_SECRET_KEY = 'test-secret';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
  process.env.FIREBASE_PRIVATE_KEY = 'test-key';
} else if (isUnitTest) {
  // Unit test configuration - no DB/Redis needed
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';

  // Stub required env vars to pass validation if Server.ts is imported
  process.env.MONGO_URI = 'mongodb://localhost:27017/campusx_unit_test';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.PORT = '3002';
  process.env.S3_BUCKET = 'test-bucket';
  process.env.S3_ACCESS_KEY = 'test-key';
  process.env.S3_SECRET_KEY = 'test-secret';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
  process.env.FIREBASE_PRIVATE_KEY = 'test-key';
}
