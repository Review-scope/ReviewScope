#!/bin/bash

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file based on .env.example before deploying."
    exit 1
fi

echo "🚀 Starting rolling deployment..."

# Build and start (recreates only updated containers)
echo "🏗️ Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "✅ Deployment complete!"
echo "   - Dashboard: http://localhost:3000"
echo "   - API: http://localhost:3001"
echo "   - Redis: localhost:6379"
