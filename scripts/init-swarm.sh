#!/usr/bin/env bash
set -e

NETWORK_NAME="mini-dokploy-net"

echo "=== Initializing Docker Swarm & Ingress Network ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker command not found. Please install Docker."
  exit 1
fi

# Check Swarm status
SWARM_STATUS=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")

if [ "$SWARM_STATUS" != "active" ]; then
  echo "Docker Swarm is not active. Initializing Swarm on manager node..."
  docker swarm init || echo "Docker Swarm already initialized or error running init."
else
  echo "Docker Swarm is already active."
fi

# Create attachable overlay network for Traefik and user services
if ! docker network ls --format '{{.Name}}' | grep -wq "$NETWORK_NAME"; then
  echo "Creating overlay network '$NETWORK_NAME'..."
  docker network create --driver overlay --attachable "$NETWORK_NAME"
  echo "Network '$NETWORK_NAME' created successfully."
else
  echo "Overlay network '$NETWORK_NAME' already exists."
fi

echo "=== Swarm & Network Initialization Complete ==="
