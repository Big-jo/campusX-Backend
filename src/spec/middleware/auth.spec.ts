/**
 * Auth Middleware Tests
 * Critical security layer - JWT validation
 */
import { describe, test, expect, beforeAll, beforeEach, mock } from "bun:test";
import validation from "../../middleware/auth";
import { generateTestToken, generateExpiredToken, generateInvalidToken } from "../utils";
import { Response, NextFunction } from "express";
import { UNAUTHORIZED } from "http-status-codes";

describe("Auth Middleware", () => {
  const mockUserId = "507f1f77bcf86cd799439011";
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeAll(() => {
    // Ensure JWT_SECRET is set for tests
    if (!process.env.JWT_SECRET && !process.env.SECRET_KEY) {
      process.env.JWT_SECRET = "test-jwt-secret-key";
    }
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      headers: {},
      token: undefined,
    };

    mockRes = {
      status: mock((code: number) => mockRes),
      json: mock((data: any) => mockRes),
    };

    mockNext = mock(() => {});
  });

  describe("validateToken", () => {
    test("should accept valid JWT token", () => {
      const validToken = generateTestToken(mockUserId);
      mockReq.headers.authorization = `Bearer ${validToken}`;

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.token).toBeDefined();
      expect(mockReq.token.userID).toBe(mockUserId);
    });

    test("should reject missing authorization header", () => {
      // No authorization header
      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(UNAUTHORIZED);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Sorry you're not authorized to use this endpooint",
      });
    });

    test("should reject empty authorization header", () => {
      mockReq.headers.authorization = "";

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(UNAUTHORIZED);
    });

    test("should reject malformed authorization header (no Bearer)", () => {
      const validToken = generateTestToken(mockUserId);
      mockReq.headers.authorization = validToken; // Missing "Bearer " prefix

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      // Should trigger error in jwt.verify
    });

    test("should reject invalid JWT signature", () => {
      const invalidToken = generateInvalidToken(mockUserId);
      mockReq.headers.authorization = `Bearer ${invalidToken}`;

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      // Error should be caught and handled by Utility.ErrResponse
    });

    test("should reject expired JWT token", () => {
      const expiredToken = generateExpiredToken(mockUserId);
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      // Error should be caught and handled
    });

    test("should reject malformed JWT token", () => {
      mockReq.headers.authorization = "Bearer invalid.token.format";

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    test("should handle token with tampered payload", () => {
      const validToken = generateTestToken(mockUserId);
      // Tamper with the token by modifying the payload part
      const parts = validToken.split(".");
      if (parts.length === 3) {
        parts[1] = Buffer.from(JSON.stringify({ userID: "hacked" })).toString("base64");
        const tamperedToken = parts.join(".");
        mockReq.headers.authorization = `Bearer ${tamperedToken}`;

        validation.validateToken(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
      }
    });

    test("should extract userID from valid token payload", () => {
      const validToken = generateTestToken(mockUserId);
      mockReq.headers.authorization = `Bearer ${validToken}`;

      validation.validateToken(mockReq, mockRes, mockNext);

      expect(mockReq.token).toBeDefined();
      expect(mockReq.token.userID).toBe(mockUserId);
      expect(typeof mockReq.token.userID).toBe("string");
    });

    test("should handle Authorization header with extra spaces", () => {
      const validToken = generateTestToken(mockUserId);
      mockReq.headers.authorization = `Bearer  ${validToken}`; // Extra space

      validation.validateToken(mockReq, mockRes, mockNext);

      // The split(' ')[1] will capture everything after first space including extra space
      // This will cause JWT verification to fail
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
