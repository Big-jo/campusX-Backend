#!/bin/bash

# Start all ML service components
# Usage: ./start_services.sh [mode]
# Modes: all (default), worker, beat, interaction, infrastructure

set -e

MODE="${1:-all}"

echo "=========================================="
echo "ML Service Startup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✅ $service is running (port $port)${NC}"
        return 0
    else
        echo -e "${RED}❌ $service is NOT running (port $port)${NC}"
        return 1
    fi
}

# Check infrastructure
check_infrastructure() {
    echo "Checking infrastructure..."
    echo ""

    # MongoDB (default port 27017)
    check_service "MongoDB" 27017 || echo -e "${YELLOW}   Run: mongod${NC}"

    # Redis (default port 6379)
    check_service "Redis" 6379 || echo -e "${YELLOW}   Run: redis-server${NC}"

    # Qdrant (default port 6333)
    check_service "Qdrant" 6333 || echo -e "${YELLOW}   Run: docker run -d -p 6333:6333 qdrant/qdrant${NC}"

    # NATS (default port 4222) - optional
    if check_service "NATS" 4222 ; then
        echo -e "${GREEN}   (NATS is optional but recommended)${NC}"
    else
        echo -e "${YELLOW}   NATS not running (optional)${NC}"
        echo -e "${YELLOW}   Run: docker run -d -p 4222:4222 nats:latest${NC}"
    fi

    echo ""
}

# Start Qdrant if not running
start_qdrant() {
    if ! check_service "Qdrant" 6333 ; then
        echo "Starting Qdrant..."
        docker run -d -p 6333:6333 --name qdrant qdrant/qdrant
        sleep 3
        echo -e "${GREEN}✅ Qdrant started${NC}"
    fi
}

# Start NATS if not running
start_nats() {
    if ! check_service "NATS" 4222 ; then
        echo "Starting NATS..."
        docker run -d -p 4222:4222 --name nats nats:latest
        sleep 2
        echo -e "${GREEN}✅ NATS started${NC}"
    fi
}

# Start Celery worker
start_worker() {
    echo "Starting Celery worker..."
    celery -A src.celery_app worker --loglevel=info --concurrency=4
}

# Start Celery beat
start_beat() {
    echo "Starting Celery beat (scheduler)..."
    celery -A src.celery_app beat --loglevel=info
}

# Start interaction service
start_interaction() {
    echo "Starting interaction service..."
    python -m src.interest_graph.interaction_service
}

# Main execution
case $MODE in
    infrastructure)
        start_qdrant
        start_nats
        echo ""
        echo -e "${GREEN}Infrastructure started${NC}"
        check_infrastructure
        ;;

    worker)
        check_infrastructure
        start_worker
        ;;

    beat)
        check_infrastructure
        start_beat
        ;;

    interaction)
        check_infrastructure
        start_interaction
        ;;

    all)
        echo "This will start all services in separate terminals."
        echo "Please use separate terminal windows for each:"
        echo ""
        echo -e "${YELLOW}Terminal 1:${NC} ./start_services.sh worker"
        echo -e "${YELLOW}Terminal 2:${NC} ./start_services.sh beat"
        echo -e "${YELLOW}Terminal 3:${NC} ./start_services.sh interaction (optional)"
        echo ""
        echo "Or start infrastructure only:"
        echo -e "${YELLOW}./start_services.sh infrastructure${NC}"
        echo ""
        check_infrastructure
        ;;

    *)
        echo "Invalid mode: $MODE"
        echo "Usage: ./start_services.sh [all|worker|beat|interaction|infrastructure]"
        exit 1
        ;;
esac
