# ==============================================================================
# One-Command Production Deployment Script for ITSM Enterprise (PowerShell)
# ==============================================================================

Write-Host "🚀 =======================================================" -ForegroundColor Cyan
Write-Host "   ITSM Enterprise SaaS — Production Deployment" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env.production")) {
    if (Test-Path ".env.production.example") {
        Write-Host "⚠️ .env.production not found. Creating from .env.production.example..." -ForegroundColor Yellow
        Copy-Item ".env.production.example" ".env.production"
        Write-Host "❗ Please review and update secrets in .env.production!" -ForegroundColor Yellow
    }
}

Write-Host "🐳 Building container images and starting services..." -ForegroundColor Green
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --remove-orphans

Write-Host "⏳ Checking running services..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
docker compose -f docker-compose.prod.yml ps

Write-Host "`n✅ Deployment process initiated! Visit http://localhost" -ForegroundColor Green
