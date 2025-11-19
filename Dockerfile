# ---- Base image ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Install dependencies (cached) ----
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production

# ---- Copy application source ----
COPY . .

# ---- Security: non-root user ----
# RUN addgroup --system --gid 1001 bungroup && \
#   adduser --system --uid 1001 bunuser && \
#   chown -R bunuser:bungroup /app

# ---- Runtime settings ----
EXPOSE 3000
ENV NODE_ENV=production

# ---- Start app directly (no build step) ----
CMD ["yarn", "run", "start"]

