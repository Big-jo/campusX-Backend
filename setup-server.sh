#!/bin/bash

set -e  # Exit on error

echo "=========================================="
echo "CampusX Backend - Server Setup Script"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

echo -e "${GREEN}[1/8] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

echo -e "${GREEN}[2/8] Installing required dependencies...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    htop

echo -e "${GREEN}[3/8] Installing Docker...${NC}"
# Remove old Docker versions
apt-get remove -y docker docker-engine docker.io containerd runc || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

echo -e "${GREEN}[4/8] Verifying Docker installation...${NC}"
docker --version
docker compose version

echo -e "${GREEN}[5/8] Configuring firewall (UFW)...${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

echo -e "${GREEN}[6/8] Creating deployment directory...${NC}"
DEPLOY_DIR="/opt/campusx"
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

echo -e "${YELLOW}Enter your Git repository URL (or press Enter to skip):${NC}"
read -r REPO_URL

if [ -n "$REPO_URL" ]; then
    echo -e "${GREEN}[7/8] Cloning repository...${NC}"
    if [ -d "$DEPLOY_DIR/app" ]; then
        echo "Removing existing app directory..."
        rm -rf "$DEPLOY_DIR/app"
    fi
    git clone "$REPO_URL" app
    cd app
else
    echo -e "${YELLOW}Skipping repository clone. You'll need to manually copy your app files to $DEPLOY_DIR/app${NC}"
    mkdir -p app
    cd app
fi

echo -e "${GREEN}[8/8] Setting up environment variables...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo -e "${YELLOW}Created .env from .env.production.example${NC}"
        echo -e "${YELLOW}IMPORTANT: Edit .env file with your actual values!${NC}"
    else
        echo -e "${YELLOW}No .env.production.example found. Creating basic .env...${NC}"
        cat > .env << EOF
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://mongodb:27017/campusx
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=$(openssl rand -hex 32)
EOF
        echo -e "${YELLOW}Basic .env created with generated JWT_SECRET${NC}"
        echo -e "${YELLOW}Add your remaining environment variables to .env${NC}"
    fi
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano $DEPLOY_DIR/app/.env"
echo "2. Build and start services: cd $DEPLOY_DIR/app && docker compose -f docker-compose.prod.yml up -d --build"
echo "3. Check logs: docker compose -f docker-compose.prod.yml logs -f"
echo "4. Check status: docker compose -f docker-compose.prod.yml ps"
echo ""
echo "Useful commands:"
echo "  - Stop services: docker compose -f docker-compose.prod.yml down"
echo "  - Restart services: docker compose -f docker-compose.prod.yml restart"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f [service]"
echo "  - Update app: git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo -e "${YELLOW}Note: Configure your domain's DNS A record to point to this server's IP${NC}"
echo ""
