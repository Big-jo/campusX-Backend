# Test Commands Quick Reference

Quick reference for running tests in CampusX.

---

## 🎯 Most Common Commands

```bash
# Run unit tests (fast, ~9 seconds)
bun run test

# Run E2E tests (requires Docker, ~30-60 seconds)
bun run test:e2e:docker

# Run all tests
bun run test:all

# Generate coverage report
bun run test:coverage
```

---

## 📦 Unit Tests

```bash
# All unit tests
bun run test

# Watch mode (re-run on file changes)
bun run test:watch

# Coverage report
bun run test:coverage

# Run specific test suite
bun run test:unit           # Entities, lib, middleware, utils

# Run single test file
bun test src/spec/entities-spec/User.spec.ts
bun test src/spec/lib/utility.spec.ts
bun test src/spec/middleware/auth.spec.ts
```

**What gets tested**:
- Entities (User, Post, Circle, Search)
- Middleware (Auth)
- Business logic (Utility, PostParser)
- All with mocked dependencies

**Runtime**: ~9 seconds
**Coverage**: 64.33%

---

## 🐳 E2E Tests

### Automated (Recommended)

```bash
# Start Docker → Run tests → Stop Docker
bun run test:e2e:docker
```

### Manual Control (for development)

```bash
# Start Docker services
bun run docker:test:up

# Wait for services (optional, but recommended)
sleep 5

# Run E2E tests
bun run test:e2e

# View Docker logs (in another terminal)
bun run docker:test:logs

# Stop Docker services when done
bun run docker:test:down
```

### Run Specific E2E Test File

```bash
# Start services first
bun run docker:test:up
sleep 5

# Run specific test
E2E_MONGO_URI=mongodb://test:testpassword@localhost:27017/campusx_test?authSource=admin \
E2E_REDIS_HOST=localhost \
E2E_REDIS_PORT=6379 \
JWT_SECRET=test-jwt-secret-key \
bun test src/spec/e2e/User.spec-e2e.ts

# Stop when done
bun run docker:test:down
```

**What gets tested**:
- User routes (26 scenarios)
- Post routes (18 scenarios)
- Circle routes (19 scenarios)
- Full HTTP → Database → Cache flow

**Runtime**: ~30-60 seconds (including Docker startup)
**Coverage**: 63 end-to-end scenarios

---

## 🔍 Debugging

```bash
# View Docker service logs
bun run docker:test:logs

# Check Docker services status
docker ps

# Test MongoDB connection
mongosh mongodb://test:testpassword@localhost:27017/campusx_test?authSource=admin

# Test Redis connection
redis-cli ping

# Clean up all Docker resources
bun run docker:test:down
docker system prune -a  # Remove all unused Docker resources
```

---

## 🆘 Troubleshooting

### Unit Tests Failing

```bash
# Clear MongoDB Memory Server cache
rm -rf ~/.cache/mongodb-binaries

# Reinstall dependencies
bun install

# Run tests with verbose output
JWT_SECRET=test-jwt-secret-key bun test --verbose
```

### E2E Tests Failing

```bash
# Check if ports are free
lsof -i :27017  # MongoDB
lsof -i :6379   # Redis

# Kill processes if needed
kill -9 <PID>

# Restart Docker services
bun run docker:test:down
bun run docker:test:up
sleep 10  # Wait longer
bun run test:e2e
```

### Services Won't Start

```bash
# Remove old containers
docker-compose -f docker-compose.test.yml down -v

# Pull fresh images
docker-compose -f docker-compose.test.yml pull

# Start services
docker-compose -f docker-compose.test.yml up -d
```

---

## 📊 Coverage Analysis

```bash
# Generate coverage report
bun run test:coverage

# View coverage in browser (if tool supports it)
# Check output directory for HTML report
```

**Current Coverage**: 64.33%

**High Coverage** (80-100%):
- All models (100%)
- Auth middleware (100%)
- PostParser (100%)
- Utility library (83%)

**Medium Coverage** (40-60%):
- User entity (47%)
- Circle entity (61%)

---

## 🚀 CI/CD Commands

```bash
# What CI should run for PRs
bun run test              # Unit tests
bun run test:coverage     # Coverage check

# What CI should run on merge to main
bun run test:all          # Unit + E2E
```

---

## 📝 File Patterns

- **Unit tests**: `*.spec.ts` (e.g., `User.spec.ts`)
- **E2E tests**: `*.spec-e2e.ts` (e.g., `User.spec-e2e.ts`)
- **Test utilities**: `src/spec/utils/*`
- **E2E setup**: `src/spec/e2e/setup.ts`, `src/spec/e2e/helpers.ts`

---

## 🎓 Quick Tips

1. **Start with unit tests** - they're faster
2. **Use watch mode** during development
3. **Keep Docker services running** when running E2E tests multiple times
4. **Check coverage** before submitting PRs
5. **Read error messages** - they're usually helpful

---

## 📚 Documentation

- **Main Guide**: `TESTING.md`
- **E2E Guide**: `.local/E2E_TESTING.md`
- **Implementation**: `.local/E2E_IMPLEMENTATION_SUMMARY.md`

---

## ⚡ Power User Shortcuts

```bash
# Alias suggestions (add to ~/.zshrc or ~/.bashrc)
alias test='bun run test'
alias testw='bun run test:watch'
alias teste2e='bun run test:e2e:docker'
alias testall='bun run test:all'
alias testcov='bun run test:coverage'
alias dockerup='bun run docker:test:up'
alias dockerdown='bun run docker:test:down'
alias dockerlogs='bun run docker:test:logs'

# Then use:
test        # Run unit tests
testw       # Watch mode
teste2e     # Run E2E
testall     # All tests
```

---

**Need help?** Check `TESTING.md` or `.local/E2E_TESTING.md`
