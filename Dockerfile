# ---- Base image ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Install dependencies (all, including devDependencies for build) ----
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- Copy application source ----
COPY . .

# ---- Build TypeScript ----
RUN yarn run build

# ---- Remove devDependencies after build ----
RUN yarn install --frozen-lockfile --production && yarn cache clean

# ---- Security: non-root user ----
# RUN addgroup --system --gid 1001 nodegroup && \
#   adduser --system --uid 1001 nodeuser && \
#   chown -R nodeuser:nodegroup /app

# ---- Runtime settings ----
EXPOSE 3000
ENV NODE_ENV=production

# ---- Start app ----
CMD ["yarn", "run", "start"]

