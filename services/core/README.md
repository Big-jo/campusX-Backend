# CampusX Core Service

TypeScript/Node.js backend for CampusX platform.

## Features

- Express REST API
- User authentication & profiles
- Posts, comments, likes
- Newsfeed with Redis caching
- Circle (group) functionality
- Bot content distribution (BullMQ)
- Real-time features (Socket.io)

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express
- **Database**: MongoDB
- **Cache**: Redis
- **Queue**: BullMQ
- **Real-time**: Socket.io

## Setup

```bash
# Install dependencies
npm install

# Copy env
cp .env.example .env

# Build
npm run build
```

## Scripts

```bash
npm run dev                # Development mode
npm run build              # Build TypeScript
npm run start              # Production mode
npm run worker             # BullMQ worker
npm run seed:bots          # Seed bot users
npm run test               # Run tests
```

## Environment Variables

See `.env.example` for required variables.

Key variables:
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing key
- `GEMINI_API_KEY` - For bot content (optional)

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/posts` - Get newsfeed
- `POST /api/posts` - Create post
- `GET /api/users/:id` - Get user profile

## Worker Jobs

- **bot-poster**: Distributes scraped content to user timelines (runs every 30min)

## Directory Structure

```
src/
├── config/         # Configuration
├── controllers/    # Route controllers
├── entities/       # Business logic
├── interfaces/     # TypeScript interfaces
├── jobs/           # BullMQ jobs
├── lib/            # Utilities
├── middleware/     # Express middleware
├── models/         # MongoDB models
├── routes/         # API routes
├── services/       # Services
├── seed/           # Seed scripts
├── Start.ts        # API entry point
└── worker.ts       # Worker entry point
```
