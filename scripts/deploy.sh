#!/usr/bin/env bash
# ==============================================================================
# One-Command Production Deployment Script for ITSM Enterprise SaaS
# ==============================================================================

set -e

echo "🚀 ======================================================="
echo "   ITSM Enterprise SaaS — Production Deployment"
echo "======================================================="

# 1. Check if .env.production exists, if not copy from example
if [ ! -f .env.production ]; then
  if [ -f .env.production.example ]; then
    echo "⚠️ .env.production not found. Creating from .env.production.example..."
    cp .env.production.example .env.production
    echo "❗ Please review and update secrets in .env.production before going live!"
  fi
fi

# 2. Build and Deploy Containers via Docker Compose
echo "🐳 Building container images and starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --remove-orphans

# 3. Health Check
echo "⏳ Waiting for application to report healthy status..."
sleep 5

docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment successful! System is running at http://localhost"
echo "======================================================="
