/**
 * Test Fixtures
 * Common test data and configuration
 */

/**
 * Default test user credentials
 */
export const TEST_USER_PASSWORD = "test123";

/**
 * Common test universities
 */
export const TEST_UNIVERSITIES = [
  "Bells University Of Technology",
  "University of Lagos",
  "Covenant University",
  "Obafemi Awolowo University",
];

/**
 * Common test campuses
 */
export const TEST_CAMPUSES = [
  "Main Campus",
  "Engineering Campus",
  "Medical Campus",
  "Arts Campus",
];

/**
 * Test image URLs
 */
export const TEST_IMAGES = {
  avatar: "https://picsum.photos/200/300",
  post: "https://picsum.photos/400/400",
  banner: "https://picsum.photos/800/200",
};

/**
 * Test S3 file keys
 */
export const TEST_S3_KEYS = {
  avatar: "test/avatars/test-avatar.jpg",
  post: "test/posts/test-post.jpg",
};

/**
 * Common test error messages
 */
export const TEST_ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  NOT_FOUND: "Not found",
  INVALID_TOKEN: "Invalid token",
  MISSING_TOKEN: "Missing token",
};

/**
 * Test timeouts (in milliseconds)
 */
export const TEST_TIMEOUTS = {
  SHORT: 2000,
  MEDIUM: 5000,
  LONG: 10000,
};

/**
 * Common test request headers
 */
export const TEST_HEADERS = {
  JSON: {
    "Content-Type": "application/json",
  },
  MULTIPART: {
    "Content-Type": "multipart/form-data",
  },
};
