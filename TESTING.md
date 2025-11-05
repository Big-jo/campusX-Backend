# CampusX Testing Guide

Complete testing documentation for the CampusX backend application.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Types](#test-types)
4. [Running Tests](#running-tests)
5. [Test Structure](#test-structure)
6. [Coverage Reports](#coverage-reports)
7. [CI/CD](#cicd)
8. [Troubleshooting](#troubleshooting)

---

## Overview

CampusX uses a comprehensive testing strategy with two types of tests:

- **Unit Tests** (`.spec.ts`): Fast, isolated tests with mocked dependencies
- **E2E Tests** (`.spec-e2e.ts`): Integration tests with real services

### Test Stack

- **Test Runner**: Bun native test runner
- **HTTP Testing**: Supertest
- **Unit Test DB**: MongoDB Memory Server
- **E2E DB**: MongoDB via Docker
- **Cache**: ioredis-mock (unit), Redis via Docker (E2E)
- **Assertions**: Bun's built-in `expect`

### Metrics

| Metric | Value |
|--------|-------|
| **Unit Test Coverage** | 64.33% |
| **Unit Tests** | 53 passing, 8 skipped |
| **E2E Tests** | 63 scenarios |
| **Unit Test Runtime** | ~8.5 seconds |
| **E2E Test Runtime** | ~30-60 seconds |

---

## Quick Start

```bash
# Install dependencies
bun install

# Run unit tests (fast, no Docker)
bun run test

# Run E2E tests (requires Docker)
bun run test:e2e:docker

# Run all tests
bun run test:all

# Watch mode (unit tests)
bun run test:watch

# Generate coverage report
bun run test:coverage
```

---

## Test Types

### 1. Unit Tests (`.spec.ts`)

**Purpose**: Test individual components in isolation
**Speed**: Fast (~8.5s)
**Dependencies**: Mocked (MongoDB Memory Server, ioredis-mock)

**What's tested**:
- Entities (User, Post, Circle, Search)
- Middleware (Auth validation)
- Business logic (Utility functions, PostParser)
- Database models

**Location**: `src/spec/`
- `entities-spec/` - Entity tests
- `middleware/` - Middleware tests
- `lib/` - Business logic tests
- `utils/` - Test utilities

**Coverage**: 64.33%
- 100%: All models, auth middleware, postParser
- 83%: Utility library
- 47-61%: User/Circle entities

### 2. E2E Tests (`.spec-e2e.ts`)

**Purpose**: Test entire system with real services
**Speed**: Slower (~30-60s with Docker startup)
**Dependencies**: Real MongoDB + Redis via Docker Compose

**What's tested**:
- HTTP endpoints end-to-end
- Full auth flow
- Database operations
- Cache interactions
- Business logic integration

**Location**: `src/spec/e2e/`
- `User.spec-e2e.ts` - User routes (26 tests)
- `Post.spec-e2e.ts` - Post routes (18 tests)
- `Circle.spec-e2e.ts` - Circle routes (19 tests)
- `setup.ts` - E2E infrastructure
- `helpers.ts` - E2E utilities

**Coverage**: 63 end-to-end scenarios

---

## Running Tests

### Unit Tests

```bash
# All unit tests
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# Specific test suites
bun run test:unit          # Entities, lib, middleware, utils

# Specific test file
bun test src/spec/entities-spec/User.spec.ts
```

### E2E Tests

**Prerequisites**: Docker and Docker Compose installed

```bash
# Automated: Start Docker → Run tests → Stop Docker
bun run test:e2e:docker

# Manual control (for development)
bun run docker:test:up       # Start services
bun run test:e2e             # Run E2E tests
bun run docker:test:down     # Stop services

# View Docker logs
bun run docker:test:logs

# Run all tests (unit + E2E)
bun run test:all
```

### Environment Variables

Unit tests automatically set:
- `JWT_SECRET=test-jwt-secret-key`

E2E tests use (set in package.json):
```bash
E2E_MONGO_URI=mongodb://test:testpassword@localhost:27017/campusx_test?authSource=admin
E2E_REDIS_HOST=localhost
E2E_REDIS_PORT=6379
JWT_SECRET=test-jwt-secret-key
```

---

## Test Structure

### Unit Test Pattern

```typescript
/**
 * Feature Unit Tests
 * Tests feature in isolation with mocked dependencies
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDB, teardownTestDB, clearTestDB } from "../utils";

describe("Feature", () => {
  beforeAll(async () => {
    await setupTestDB(); // MongoDB Memory Server
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB(); // Isolation
  });

  test("should do something", async () => {
    // Arrange
    const data = await createTestData();

    // Act
    const result = await performAction(data);

    // Assert
    expect(result).toBeDefined();
    expect(result.value).toBe(expected);
  });
});
```

### E2E Test Pattern

```typescript
/**
 * Feature E2E Tests
 * Integration tests with real MongoDB + Redis via Docker
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import request from "supertest";
import { server } from "../../Server";
import { setupE2E, teardownE2E, clearE2EData } from "./setup";
import { createE2EUser, e2eAuthHeader } from "./helpers";

describe("E2E: Feature Routes", () => {
  beforeAll(async () => {
    await setupE2E(); // Real MongoDB + Redis
  }, 30000);

  afterAll(async () => {
    await teardownE2E();
  });

  beforeEach(async () => {
    await clearE2EData();
  });

  test("should test endpoint end-to-end", async () => {
    const user = await createE2EUser();

    const response = await request(server)
      .post("/api/v1/endpoint")
      .set(e2eAuthHeader(user.token))
      .send({ data: "test" });

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });
});
```

---

## Coverage Reports

### Generate Coverage

```bash
bun run test:coverage
```

### Coverage Breakdown

```
All files                           |   64.33%
─────────────────────────────────────────────
src/entities/User.ts                |   47.06%
src/entities/Circle.ts              |   61.54%
src/entities/Post.ts                |   33.33%
src/lib/utility.ts                  |   83.33%
src/lib/postParser.ts               |  100.00%
src/middleware/auth.ts              |  100.00%
src/models/*.ts                     |  100.00%
```

### Coverage Goals

- ✅ **Current**: 64.33%
- ✅ **Target**: 50-60% (exceeded)
- 🎯 **Stretch**: 70%+

### High-Value Coverage Areas

**100% Coverage** (Critical):
- Auth middleware
- All database models
- PostParser (mentions/hashtags)

**80%+ Coverage** (Important):
- Utility functions
- Test infrastructure

**60%+ Coverage** (Good):
- Circle entity

**Areas for Improvement**:
- Post entity (33% → 50%)
- Search entity (0% → needs text index setup)
- Notifications library (0% → 30%)

---

## CI/CD

### GitHub Actions Example

```yaml
name: Tests

on:
  push:
    branches: [main, developement]
  pull_request:
    branches: [main, developement]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test
      - run: bun run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:e2e:docker
      - name: Cleanup
        if: always()
        run: bun run docker:test:down
```

---

## Troubleshooting

### Unit Tests

#### Issue: Tests failing with MongoDB connection error

```bash
# Ensure MongoDB Memory Server can start
rm -rf ~/.cache/mongodb-binaries
bun install
```

#### Issue: Redis mock not working

```bash
# Reinstall ioredis-mock
bun remove ioredis-mock
bun add -d ioredis-mock
```

### E2E Tests

#### Issue: Docker services not starting

```bash
# Check port availability
lsof -i :27017  # MongoDB
lsof -i :6379   # Redis

# Kill conflicting processes
kill -9 <PID>

# Restart Docker
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

#### Issue: Connection timeouts

```bash
# Wait longer for services
docker-compose -f docker-compose.test.yml up -d
sleep 10  # Increase wait time
bun run test:e2e
```

#### Issue: Tests pass individually but fail together

```bash
# Data cleanup issue - verify beforeEach
# Check clearE2EData() is called
# Ensure unique test data (timestamps, UUIDs)
```

### General

#### Issue: Deprecation warnings

```
DeprecationWarning: Mongoose 5.x deprecations
```

**Solution**: Non-blocking, planned for future Mongoose upgrade

#### Issue: JWT_SECRET not set

```bash
# Manually set for tests
JWT_SECRET=test-jwt-secret-key bun test
```

---

## Best Practices

### 1. Test Isolation

✅ **Do**:
- Use `beforeEach` to clear data
- Generate unique test data (timestamps)
- Don't rely on test order

❌ **Don't**:
- Share data between tests
- Hardcode IDs or emails
- Assume test execution order

### 2. Async Operations

✅ **Do**:
- Use `async/await` consistently
- Add `waitFor()` for async operations
- Increase timeouts for slow operations

❌ **Don't**:
- Forget to await promises
- Use callbacks (prefer async/await)
- Set unrealistic timeouts

### 3. Authentication

✅ **Do**:
- Test both authenticated and unauthenticated
- Use helper functions (`authHeader()`, `e2eAuthHeader()`)
- Test token expiry and tampering

❌ **Don't**:
- Skip auth tests
- Use production tokens
- Test only happy path

### 4. Assertions

✅ **Do**:
- Test specific values, not just existence
- Verify error messages
- Check status codes

❌ **Don't**:
- Use vague assertions (`toBeDefined()` only)
- Skip error case testing
- Ignore response structure

### 5. Coverage

✅ **Do**:
- Focus on critical paths
- Test business logic thoroughly
- Document why code is skipped

❌ **Don't**:
- Chase 100% coverage blindly
- Skip edge cases
- Ignore low coverage in critical code

---

## Documentation

- **E2E Testing Guide**: `.local/E2E_TESTING.md`
- **Testing Refactor**: `.local/testing-refactor.md`
- **Session Handoff**: `.local/SESSION_HANDOFF.md`
- **Completion Summary**: `.local/COMPLETION_SUMMARY.md`

---

## Summary

### Unit Tests
- ✅ 53 tests passing
- ✅ 64.33% coverage
- ✅ ~8.5s runtime
- ✅ No external dependencies

### E2E Tests
- ✅ 63 scenarios
- ✅ Full integration coverage
- ✅ Real services via Docker
- ✅ CI-ready

### Commands

```bash
# Quick commands
bun run test              # Unit tests
bun run test:e2e:docker   # E2E tests
bun run test:all          # All tests
bun run test:coverage     # Coverage report

# Development
bun run test:watch        # Unit watch mode
bun run docker:test:up    # Start E2E services
bun run docker:test:down  # Stop E2E services
```

**Need help?** Check troubleshooting section or review test files in `src/spec/`.
