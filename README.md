# CampusX Monorepo

Multi-service social platform for campus communities.

## Structure

```
campusX/
├── services/
│   ├── core/          # TypeScript backend (API + Worker)
│   └── scraper/       # Python content scraper
├── packages/          # Shared TS packages
├── infra/docker/      # Docker configs
├── scripts/           # Build/deploy scripts
└── docs/              # Documentation
```

## Quick Start

### Prerequisites
- Node.js >= 18
- Python >= 3.9
- Docker & Docker Compose
- MongoDB
- Redis

### Setup

```bash
# Install dependencies
npm install

# Copy env files
cp services/core/.env.example services/core/.env

# Edit services/core/.env with your credentials

# Seed bots (optional)
npm run seed:bots
```

### Development

```bash
# Run with Docker (all services)
npm run docker:up

# Or run individually:
npm run dev:core      # TypeScript API
npm run worker        # TypeScript Worker
```

### Commands

```bash
# Development
npm run dev:core              # Start core API
npm run worker                # Start BullMQ worker
npm run build:all             # Build all services

# Bots
npm run seed:bots             # Seed bot users
npm run seed:bots:fresh       # Recreate bots

# Docker
npm run docker:up             # Start all services
npm run docker:down           # Stop all services
npm run docker:logs           # View logs
npm run docker:scraper        # Start scraper only
```

## Services

### Core (`services/core`)
TypeScript/Node.js backend
- Express API
- BullMQ worker for bot content distribution
- MongoDB + Redis

### Scraper (`services/scraper`)
Python content scraper
- Gemini Search integration
- Web scraping (BeautifulSoup4 + Playwright)
- Celery tasks + scheduler
- Content processing & storage

## Documentation

- [Scraper Quick Start](docs/scraper-quickstart.md)
- [Monorepo Restructure Plan](.local/monorepo-restructure.md)

## Architecture

```
User Request → Core API → MongoDB
                       ↓
Bot Content: Scraper → MongoDB → Core Worker → Redis Timelines
```

## Development Workflow

1. **Add new service**: Create in `services/`
2. **Shared code**: Add to `packages/`
3. **Infrastructure**: Update `infra/docker/`
4. **Documentation**: Add to `docs/`

## License

MIT
