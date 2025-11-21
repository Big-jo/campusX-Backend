/**
 * Firebase Admin Mock Utilities
 * Provides Firebase Admin mocks for testing
 */

/**
 * Create a mock Firebase Admin instance
 */
export function createMockFirebaseAdmin() {
  return {
    messaging: () => ({
      send: async (message: any) => {
        // Mock successful send
        return "mock-message-id-123";
      },
      sendMulticast: async (message: any) => {
        // Mock successful multicast
        return {
          successCount: message.tokens?.length || 0,
          failureCount: 0,
          responses: [],
        };
      },
      sendAll: async (messages: any[]) => {
        // Mock successful send all
        return {
          successCount: messages.length,
          failureCount: 0,
          responses: [],
        };
      },
    }),
    initializeApp: () => {
      // Mock initialization
    },
    credential: {
      cert: () => ({}),
    },
  };
}

/**
 * Setup Firebase Admin mock globally
 * Call this before tests that use Firebase
 */
export function setupFirebaseMock() {
  // Mock the firebase-admin module
  const mockAdmin = createMockFirebaseAdmin();

  // If running in test environment, we can mock the import
  // This requires the code to check if admin is already initialized
  return mockAdmin;
}
