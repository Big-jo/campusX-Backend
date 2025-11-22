# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root files for yarn workspaces
COPY package.json yarn.lock ./
COPY services/core/package.json ./services/core/

# Install all workspace dependencies
RUN yarn install --frozen-lockfile

# Copy source code and config from service directory
COPY services/core/src ./services/core/src
COPY services/core/tsconfig.json ./services/core/
COPY services/core/tsconfig.prod.json ./services/core/
COPY services/core/register-paths.js ./services/core/

# Build TypeScript using production config
RUN yarn workspace @campusx/core tsc -p tsconfig.prod.json

# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app

# Copy workspace files for production install
COPY package.json yarn.lock ./
COPY services/core/package.json ./services/core/

# Install dependencies
RUN yarn install --frozen-lockfile && \
    yarn cache clean

# Copy built application from builder
COPY --from=builder /app/services/core/dist ./dist

# Copy path resolver and tsconfig for runtime path resolution
COPY --from=builder /app/services/core/register-paths.js ./
COPY --from=builder /app/services/core/tsconfig.json ./

# Expose port (Railway uses PORT env var)
EXPOSE ${PORT:-3000}

# Set production environment
ENV NODE_ENV=production

# Start app with path aliases
CMD ["node", "-r", "./register-paths.js", "-r", "dotenv/config", "dist/Start.js"]

