/**
 * E2E Test Helpers
 * Utilities for integration tests
 */

import { IUser } from "../../interfaces/IUser";
import { User } from "../../entities/User";
import jwt from "jsonwebtoken";

/**
 * Create a real user via entity (full integration)
 */
export async function createE2EUser(overrides: Partial<IUser> = {}) {
  const defaultUser: IUser = {
    email: `test-${Date.now()}@example.com`,
    name: `Test User ${Date.now()}`,
    password: "TestPassword123!",
    phone_number: `+1${Math.floor(Math.random() * 10000000000)}`,
    userTag: `testuser${Date.now()}`,
    campus: overrides.campus || "Test University",
    ...overrides,
  } as IUser;

  const result = await User.CreateUser(defaultUser);

  if (result.exists) {
    throw new Error(`User creation failed: User already exists`);
  }

  return {
    user: result.user,
    token: result.token,
  };
}

/**
 * Generate auth header for E2E requests
 */
export function e2eAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Login user and get token
 */
export async function loginE2EUser(email: string, password: string) {
  const result = await User.Login(email, password);

  if (!result.token) {
    throw new Error("Login failed");
  }

  return {
    user: result.user,
    token: result.token,
  };
}

/**
 * Extract user ID from token
 */
export function getUserIdFromToken(token: string): string {
  const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    throw new Error("JWT_SECRET not set");
  }

  const decoded = jwt.verify(token, secret) as any;
  return decoded.userID || decoded.id;
}

/**
 * Create multiple test users at once
 */
export async function createE2EUsers(count: number): Promise<Array<{ user: any; token: string }>> {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createE2EUser({
      userTag: `testuser${Date.now()}_${i}`,
      email: `test${Date.now()}_${i}@example.com`,
    });
    users.push(user);
  }
  return users;
}

/**
 * Wait for async operations to complete
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await waitFor(delay * Math.pow(2, attempt));
      }
    }
  }

  throw lastError!;
}
