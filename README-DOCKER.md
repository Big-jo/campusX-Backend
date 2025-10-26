# Docker Deployment Guide

This guide explains how to deploy the CampusX Backend using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose v2.0 or later
- At least 2GB of available RAM
- 10GB of free disk space

## Quick Start

### Production Deployment

1. **Copy the environment file and configure it:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update the following critical values:
   - `JWT_SECRET`: Use a strong, random secret
   - `SPACES_ACCESS_KEY` and `SPACES_SECRET`: Your DigitalOcean Spaces/AWS S3 credentials
   - `SMTP_*`: Your email service credentials
   - Other configuration as needed

2. **Build and start the services:**
   ```bash
   docker-compose up -d
   ```

3. **Check the logs:**
   ```bash
   docker-compose logs -f app
   ```

4. **Access the application:**
   - API: `http://localhost:3000`

### Development Deployment

For development with hot reload:

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start development services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

## Services

The Docker setup includes the following services:

### Application (app)
- **Port:** 3000
- **Description:** The main Node.js/Bun application
- **Health:** Automatically restarts on failure

### MongoDB (mongodb)
- **Port:** 27017
- **Description:** Primary database
- **Data Persistence:** `mongodb-data` volume

### Redis (redis)
- **Port:** 6379
- **Description:** Single Redis instance with namespace prefixes
  - `newsfeed:` - Newsfeed caching
  - `circle:` - Circle conversation caching
  - `tasks:` - Task queues and background jobs
- **Data Persistence:** `redis-data` volume

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mongodb
```

### Rebuild containers
```bash
docker-compose up -d --build
```

### Stop and remove all data (⚠️ DESTRUCTIVE)
```bash
docker-compose down -v
```

### Execute commands in running container
```bash
# Access Bun shell in the app container
docker-compose exec app sh

# Access MongoDB shell
docker-compose exec mongodb mongosh campusx
```

## Environment Variables

Key environment variables (see `.env.example` for complete list):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://mongodb:27017/campusx` |
| `JWT_SECRET` | JWT signing secret | Required |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASS` | Redis password | Optional |

## Data Persistence

All data is persisted in Docker volumes:

- `mongodb-data`: MongoDB database files
- `mongodb-config`: MongoDB configuration
- `redis-data`: Redis data (with namespaced keys)
- `app-data`: Application file uploads

### Backup Data

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out /backup
docker cp campusx-mongodb:/backup ./mongodb-backup

# Backup Redis
docker-compose exec redis-primary redis-cli SAVE
docker cp campusx-redis-primary:/data/dump.rdb ./redis-backup.rdb
```

### Restore Data

```bash
# Restore MongoDB
docker cp ./mongodb-backup campusx-mongodb:/backup
docker-compose exec mongodb mongorestore /backup

# Restore Redis
docker cp ./redis-backup.rdb campusx-redis-primary:/data/dump.rdb
docker-compose restart redis-primary
```

## Scaling

To run multiple instances of the application:

```bash
docker-compose up -d --scale app=3
```

Note: You'll need to configure a load balancer (like Nginx) in front of the application instances.

## Monitoring

### Check resource usage
```bash
docker stats
```

### Check container health
```bash
docker-compose ps
```

## Troubleshooting

### Application won't start

1. Check logs:
   ```bash
   docker-compose logs app
   ```

2. Verify environment variables are set correctly in `.env`

3. Ensure MongoDB and Redis are running:
   ```bash
   docker-compose ps
   ```

### MongoDB connection issues

1. Verify MongoDB is running:
   ```bash
   docker-compose logs mongodb
   ```

2. Test connection:
   ```bash
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   ```

### Redis connection issues

1. Test Redis connection:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

2. View namespaced keys:
   ```bash
   # View newsfeed keys
   docker-compose exec redis redis-cli --scan --pattern "newsfeed:*"

   # View circle keys
   docker-compose exec redis redis-cli --scan --pattern "circle:*"

   # View task keys
   docker-compose exec redis redis-cli --scan --pattern "tasks:*"
   ```

### Port conflicts

If ports are already in use, modify them in `.env`:
```env
PORT=3001
```

Or map to different host ports in `docker-compose.yml`.

### Out of memory

Increase Docker memory allocation in Docker Desktop settings or add memory limits in `docker-compose.yml`:

```yaml
services:
  app:
    mem_limit: 1g
```

## Production Considerations

1. **Security:**
   - Change all default passwords and secrets
   - Use strong `JWT_SECRET`
   - Enable Redis authentication if exposed
   - Run behind a reverse proxy (Nginx/Traefik)
   - Enable HTTPS/TLS

2. **Performance:**
   - Adjust Redis memory limits based on usage
   - Configure MongoDB indexes
   - Use production-grade storage drivers

3. **Monitoring:**
   - Set up logging aggregation (ELK, Datadog)
   - Configure Sentry for error tracking
   - Monitor resource usage

4. **Backups:**
   - Schedule regular database backups
   - Test restore procedures
   - Store backups off-site

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and deploy
        run: |
          docker-compose build
          docker-compose up -d
```

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Review environment variables
- Ensure all required services are running
