# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

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

# Copy any other necessary files (if needed)
COPY --from=builder /app/package.json ./

# Expose port (Railway uses PORT env var)
EXPOSE ${PORT:-3000}

# Set production environment
ENV NODE_ENV=production

# Start app
CMD ["node", "-r", "dotenv/config", "dist/Start.js"]

