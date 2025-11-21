/**
 * Authentication Test Utilities
 * JWT token generation and auth helpers for testing
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Use a test secret (not the production one)
const TEST_JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "test-secret-key";

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(userId: string | mongoose.Types.ObjectId, expiresIn: string = "1h"): string {
  const payload = {
    userID: userId.toString(),
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn });
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredToken(userId: string | mongoose.Types.ObjectId): string {
  const payload = {
    userID: userId.toString(),
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: "1h" });
}

/**
 * Generate a token with invalid signature
 */
export function generateInvalidToken(userId: string | mongoose.Types.ObjectId): string {
  const payload = {
    userID: userId.toString(),
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, "wrong-secret", { expiresIn: "1h" });
}

/**
 * Decode a JWT token without verification (for testing)
 */
export function decodeTestToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Verify a JWT token (for testing)
 */
export function verifyTestToken(token: string): any {
  try {
    return jwt.verify(token, TEST_JWT_SECRET);
  } catch (error) {
    throw error;
  }
}

/**
 * Create authorization header for Supertest requests
 */
export function authHeader(userId: string | mongoose.Types.ObjectId): { Authorization: string } {
  const token = generateTestToken(userId);
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Create authorization header with custom token
 */
export function authHeaderWithToken(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}
