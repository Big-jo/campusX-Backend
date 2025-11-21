# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.prod.json ./
COPY register-paths.js ./

# Build TypeScript using production config
RUN yarn tsc -p tsconfig.prod.json

# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy path resolver and tsconfig for runtime path resolution
COPY --from=builder /app/register-paths.js ./
COPY --from=builder /app/tsconfig.json ./

# Expose port (Railway uses PORT env var)
EXPOSE ${PORT:-3000}

# Set production environment
ENV NODE_ENV=production

# Start app with path aliases
CMD ["node", "-r", "./register-paths.js", "-r", "dotenv/config", "dist/Start.js"]

