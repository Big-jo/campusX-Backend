/**
 * Example Unit Test
 * Unit tests run in isolation without DB/Redis connections
 *
 * Unit tests should:
 * - Test individual functions/methods
 * - Mock external dependencies
 * - Run fast without I/O
 * - Use .spec.ts file extension
 */

import { describe, test, expect } from "@jest/globals";

describe("Example Unit Test", () => {
  test("basic test example", () => {
    expect(1 + 1).toBe(2);
  });

  test("should demonstrate mocking", () => {
    // Example: mock a function
    const mockFn = (x: number) => x * 2;
    expect(mockFn(5)).toBe(10);
  });
});
