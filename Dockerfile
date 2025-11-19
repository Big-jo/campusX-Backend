# ---- Base image ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Install dependencies (cached) ----
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# ---- Copy application source ----
COPY . .

# ---- Security: non-root user ----
# RUN addgroup --system --gid 1001 nodegroup && \
#   adduser --system --uid 1001 nodeuser && \
#   chown -R nodeuser:nodegroup /app

# ---- Runtime settings ----
EXPOSE 3000
ENV NODE_ENV=production

# ---- Start app directly (no build step) ----
CMD ["yarn", "run", "start"]

