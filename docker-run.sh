#!/bin/bash
set -e

# Change to the script's directory
cd "$(dirname "$0")"

echo "=== BK-AUTO Interview Website Docker Management ==="

case "${1:-up}" in
  build)
    echo "Building Docker images..."
    docker compose build "${@:2}"
    ;;
  up)
    echo "Starting Docker containers in background..."
    docker compose up -d --build "${@:2}"
    echo ""
    echo "Services started successfully:"
    echo "  - Frontend: http://localhost:5700"
    echo "  - Backend:  http://localhost:8091"
    echo "  - Health:   http://localhost:8091/api/health"
    ;;
  down)
    echo "Stopping Docker containers..."
    docker compose down "${@:2}"
    ;;
  logs)
    docker compose logs -f "${@:2}"
    ;;
  restart)
    echo "Restarting Docker containers..."
    docker compose restart "${@:2}"
    ;;
  ps)
    docker compose ps "${@:2}"
    ;;
  *)
    docker compose "$@"
    ;;
esac
