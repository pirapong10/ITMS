# 🚀 ITSM Enterprise SaaS — Production Deployment Guide

This guide covers the deployment of the **ITSM Enterprise SaaS Platform** (Next.js 16 + React 19 + PostgreSQL 16 + Nginx) into a production environment.

---

## 1. Architecture Overview

```mermaid
flowchart TD
    Internet[Users / Web Browsers] -->|HTTPS 443 / HTTP 80| Nginx[Nginx Reverse Proxy & Load Balancer]
    
    subgraph DockerBridge ["Docker Internal Network (itsm_prod_network)"]
        Nginx -->|Proxy Pass 3000| App[Next.js 16 Standalone Server (itsm_prod_app)]
        App -->|Port 5432| DB[(PostgreSQL 16 Multi-Tenant DB)]
    end
    
    DB -->|Persistent Storage| Volume[(Volume: itsm_postgres_prod_data)]
```

---

## 2. Prerequisites & Server Requirements

- **Operating System:** Ubuntu 22.04 / 24.04 LTS, Debian 12, or Windows Server
- **Hardware Minimum:** 2 vCPU, 4GB RAM, 20GB SSD Storage
- **Installed Tools:** Docker Engine 24+ and Docker Compose v2+

---

## 3. Quick Start Deployment (One-Command)

### Step 1: Clone Repository & Setup Environment Variables
```bash
git clone https://github.com/pirapong10/ITMS.git
cd ITMS

# Copy production environment configuration template
cp .env.production.example .env.production
```

### Step 2: Configure Production Secrets
Edit `.env.production` and configure your production values:
```bash
# Generate secure 64-char keys
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Step 3: Run Deployment Script
```bash
# On Linux / macOS:
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Or on Windows (PowerShell):
.\scripts\deploy.ps1
```

Or manually launch with Docker Compose:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## 4. Production Database Migrations & Seeding

The container entrypoint (`docker-entrypoint.sh`) **automatically runs migrations** upon container startup. 

To manually trigger or verify migrations inside the container:
```bash
docker compose -f docker-compose.prod.yml exec app ./node_modules/node-pg-migrate/bin/node-pg-migrate up
```

---

## 5. SSL / HTTPS Certificate Setup (Let's Encrypt)

To enable free SSL via Let's Encrypt / Certbot on your domain:

```bash
# 1. Install Certbot
sudo apt update && sudo apt install certbot -y

# 2. Issue Certificate for your domain
sudo certbot certonly --standalone -d your-domain.com -d *.your-domain.com

# 3. Mount certificates in docker-compose.prod.yml under nginx service:
# volumes:
#   - /etc/letsencrypt/live/your-domain.com/fullchain.pem:/etc/nginx/certs/fullchain.pem:ro
#   - /etc/letsencrypt/live/your-domain.com/privkey.pem:/etc/nginx/certs/privkey.pem:ro
```

---

## 6. Backup & Restore Procedures

### Database Backup (Daily Automated Cron)
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U itsm_admin itsm_prod | gzip > backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

### Database Restore
```bash
gunzip -c backup_20260831_120000.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U itsm_admin -d itsm_prod
```

---

## 7. Zero-Downtime Update Procedure

To update the running production system with new code changes from Git:
```bash
git pull origin master
docker compose -f docker-compose.prod.yml up -d --build --no-deps app
```
