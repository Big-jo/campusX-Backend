# CampusX Backend - Production Deployment Guide

## Prerequisites
- Ubuntu 20.04+ DigitalOcean Droplet
- Root or sudo access
- Git repository access

## Quick Setup

### 1. Prepare Droplet
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Upload setup script
scp setup-server.sh root@your-droplet-ip:/root/

# Or clone repo and run script
git clone <your-repo-url>
cd campusX-Backend
chmod +x setup-server.sh
sudo ./setup-server.sh
```

### 2. Configure Environment
```bash
cd /opt/campusx/app
nano .env
```

**Required variables:**
- `JWT_SECRET` - Generate: `openssl rand -hex 32`
- `SPACES_ACCESS_KEY` / `SPACES_SECRET` - DigitalOcean Spaces credentials
- `SPACES_BUCKET_*` - Bucket names
- `SMTP_*` - Email settings

### 3. Deploy
```bash
cd /opt/campusx/app
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Verify
```bash
# Check all services running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Test endpoint
curl http://localhost/health
```

## Architecture

### Services
- **nginx** - Reverse proxy (port 80)
- **app** - Bun.js backend (internal port 3000)
- **mongodb** - Database (internal port 27017)
- **redis** - Cache/queue (internal port 6379)

### Network
All services run on `campusx-network` bridge network. Only nginx exposes port 80.

## Management Commands

```bash
# Navigate to app directory
cd /opt/campusx/app

# Start services
docker compose -f docker-compose.prod.yml up -d

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart specific service
docker compose -f docker-compose.prod.yml restart app

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Execute commands in container
docker compose -f docker-compose.prod.yml exec app bun --version

# Pull updates and redeploy
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Clean rebuild
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

## Monitoring

### Health Check
```bash
curl http://localhost/health
```

### Resource Usage
```bash
docker stats
htop
```

### Logs
```bash
# Application logs
docker compose -f docker-compose.prod.yml logs -f app

# Nginx logs
docker compose -f docker-compose.prod.yml logs -f nginx

# MongoDB logs
docker compose -f docker-compose.prod.yml logs -f mongodb

# All logs
docker compose -f docker-compose.prod.yml logs -f
```

## Backup

### Database Backup
```bash
# Create backup
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out=/data/backup

# Copy from container
docker cp campusx-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore
docker cp ./mongodb-backup campusx-mongodb:/data/restore
docker compose -f docker-compose.prod.yml exec mongodb mongorestore /data/restore
```

### Redis Backup
```bash
# Redis AOF is enabled - data persisted automatically
# Manual backup
docker compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE
```

## Troubleshooting

### Check Service Health
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs app
```

### App Won't Start
```bash
# Check environment variables
docker compose -f docker-compose.prod.yml config

# Check MongoDB connection
docker compose -f docker-compose.prod.yml exec app nc -zv mongodb 27017

# Check Redis connection
docker compose -f docker-compose.prod.yml exec app nc -zv redis 6379
```

### Out of Memory
```bash
# Check usage
docker stats

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Port Already in Use
```bash
# Check what's using port 80
sudo lsof -i :80
sudo netstat -tulpn | grep :80

# Kill process or change nginx port in docker-compose.prod.yml
```

## Security Hardening

### Firewall Rules
```bash
# Status
sudo ufw status

# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### MongoDB Security (Optional)
Enable authentication by modifying docker-compose.prod.yml:
```yaml
mongodb:
  environment:
    - MONGO_INITDB_ROOT_USERNAME=admin
    - MONGO_INITDB_ROOT_PASSWORD=strongpassword
```

Update MONGO_URI in .env:
```
MONGO_URI=mongodb://admin:strongpassword@mongodb:27017/campusx?authSource=admin
```

## Future: SSL/TLS with Let's Encrypt

Will add SSL support later with:
- Certbot for Let's Encrypt certificates
- Updated nginx config for HTTPS
- Auto-renewal via cron

## Performance Tuning

### Nginx Caching (if needed)
Add to [nginx/conf.d/campusx.conf](nginx/conf.d/campusx.conf):
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g;

location /api/static {
    proxy_cache api_cache;
    proxy_cache_valid 200 1h;
}
```

### MongoDB Indexes
Monitor slow queries and add indexes as needed.

### Redis Memory
Set maxmemory policy in docker-compose.prod.yml:
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Support

Check logs first:
```bash
docker compose -f docker-compose.prod.yml logs --tail=100 -f
```

Monitor resources:
```bash
docker stats
htop
df -h
```
