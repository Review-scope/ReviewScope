# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file based on .env.example before deploying."
    exit 1
}

Write-Host "🚀 Starting deployment..." -ForegroundColor Green

# Stop existing containers
Write-Host "⬇️ Stopping existing containers..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml down

# Build and start
Write-Host "🏗️ Building and starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d --build

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "   - Dashboard: http://localhost:3000"
Write-Host "   - API: http://localhost:3001"
Write-Host "   - Redis: Internal (redis:6379)"
