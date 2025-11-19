#!/bin/bash

# Start Maester Web UI locally with Azurite

set -e

echo "🔥 Starting Maester Web UI Local Development Environment"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
  echo "❌ Error: docker-compose is not installed. Please install it and try again."
  exit 1
fi

# Start services with docker-compose
echo "Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📊 Web UI: http://localhost:3001"
echo "💾 Azurite (Blob): http://localhost:10000"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f web-ui"
echo ""
echo "To stop services:"
echo "  docker-compose down"
