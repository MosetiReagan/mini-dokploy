#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "          🚀 Launching Mini-Dokploy PaaS Stack           "
echo "=========================================================="

NETWORK_NAME="mini-dokploy-net"
STACK_NAME="mini-dokploy"

# Ensure data directory exists
mkdir -p ./data ./build_workspace

# Seed SQLite database if new
if [ ! -f "./data/mini-dokploy.db" ]; then
  echo "Initializing SQLite database with default credentials..."
  npx tsx scripts/seed.ts || true
fi

# Check Docker availability
if command -v docker &> /dev/null; then
  echo "[1/4] Checking Docker Swarm Mode..."
  SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")

  if [ "$SWARM_STATE" != "active" ]; then
    echo "Initializing Docker Swarm..."
    docker swarm init 2>/dev/null || true
  fi

  echo "[2/4] Verifying Overlay Ingress Network ($NETWORK_NAME)..."
  if ! docker network ls --format '{{.Name}}' | grep -wq "$NETWORK_NAME"; then
    docker network create --driver overlay --attachable "$NETWORK_NAME"
  fi

  echo "[3/4] Building Mini-Dokploy Docker Image..."
  docker build -t mini-dokploy:latest .

  echo "[4/4] Deploying Stack via Docker Stack Deploy..."
  docker stack deploy -c docker-compose.swarm.yml "$STACK_NAME"

  echo ""
  echo "=========================================================="
  echo "  ✅ Mini-Dokploy & Traefik are LIVE on Docker Swarm!     "
  echo "=========================================================="
  echo "  • Control Plane:     http://localhost:3000"
  echo "  • Traefik Ingress:   http://mini-dokploy.127.0.0.1.sslip.io"
  echo "  • Traefik Dashboard: http://localhost:8080"
  echo "  • Demo Account:      admin@dokploy.local / dokploy123"
  echo "=========================================================="
  echo ""
  echo "To view service status:  docker stack services $STACK_NAME"
  echo "To view live logs:       docker service logs -f ${STACK_NAME}_mini-dokploy"
else
  echo ""
  echo "⚠️  Docker daemon not detected in PATH on this host."
  echo "Starting Mini-Dokploy in Local Development Mode with Swarm Simulation..."
  echo ""
  echo "  • Control Plane: http://localhost:3000"
  echo "  • Demo Account:  admin@dokploy.local / dokploy123"
  if [ ! -d ".next" ]; then
    echo "Compiling Next.js pages..."
    npm run build
  fi
  npm run start
fi
