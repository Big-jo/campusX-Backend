/**
 * Utility Library Tests
 * Tests helper functions and utility methods
 */

import { describe, test, expect, beforeAll, mock } from "bun:test";
import { Utility } from "../../lib/utility";
import jwt from "jsonwebtoken";
import { INTERNAL_SERVER_ERROR } from "http-status-codes";

describe("Utility", () => {
  beforeAll(() => {
    // Ensure JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-jwt-secret-key";
    }
  });

  describe("createToken", () => {
    test("should create valid JWT with all payload fields", () => {
      const payload = {
        userID: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        campus: "Test University",
        role: "student",
      };

      const token = Utility.createToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      expect(decoded.userID).toBe(payload.userID);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.campus).toBe(payload.campus);
      expect(decoded.role).toBe(payload.role);
    });

    test("should create unique tokens for different payloads", () => {
      const token1 = Utility.createToken({ userID: "user1" });
      const token2 = Utility.createToken({ userID: "user2" });

      expect(token1).not.toBe(token2);
    });
  });

  describe("ErrResponse", () => {
    test("should send 500 error response with message", () => {
      const mockRes = {
        status: mock((code: number) => mockRes),
        json: mock((data: any) => mockRes),
      };

      Utility.ErrResponse(mockRes as any, new Error("Test error"));

      expect(mockRes.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Test error" });
    });
  });

  describe("filterRedisPipeline", () => {
    test("should extract values from Redis pipeline tuples", () => {
      const pipelineResult: Array<[Error | null, any]> = [
        [null, "value1"],
        [null, "value2"],
        [null, "value3"],
      ];

      expect(Utility.filterRedisPipeline(pipelineResult)).toEqual(["value1", "value2", "value3"]);
    });

    test("should handle errors in pipeline results", () => {
      const pipelineResult: Array<[Error | null, any]> = [
        [null, "success"],
        [new Error("Redis error"), null],
        [null, 42],
      ];

      expect(Utility.filterRedisPipeline(pipelineResult)).toEqual(["success", null, 42]);
    });
  });

  describe("CacheExpiryTracker", () => {
    test("should add expiry timestamp to Redis sorted set", () => {
      const mockRedis = {
        zadd: mock(() => Promise.resolve(1)),
      };

      Utility.CacheExpiryTracker("test:expiry", "test-member", 1, "hours" as any, mockRedis as any);

      expect(mockRedis.zadd).toHaveBeenCalled();
      const [key, ttl, member] = mockRedis.zadd.mock.calls[0];
      expect(key).toBe("test:expiry");
      expect(member).toBe("test-member");
      expect(typeof ttl).toBe("string"); // UTC timestamp
    });
  });
});
