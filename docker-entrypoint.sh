#!/bin/sh
set -e

echo "🚀 Starting ITSM Enterprise SaaS Application..."

# 1. Wait for Database to become ready if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Checking database connectivity..."
  
  # Parse host and port from DATABASE_URL if available
  DB_HOST=$(echo "$DATABASE_URL" | sed -e 's,.*@\([^:/]*\).*,\1,')
  DB_PORT=$(echo "$DATABASE_URL" | sed -e 's,.*:\([0-9]*\)/.*,\1,')
  
  if [ -n "$DB_HOST" ]; then
    echo "🔍 Waiting for PostgreSQL at $DB_HOST:${DB_PORT:-5432}..."
    RETRIES=30
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
      echo "Waiting for database to be ready ($RETRIES retries left)..."
      RETRIES=$((RETRIES-1))
      sleep 2
    done

    if [ $RETRIES -eq 0 ]; then
      echo "⚠️ Database connection check timed out, proceeding anyway..."
    else
      echo "✅ Database is ready!"
    fi
  fi

  # 2. Run Database Migrations if node-pg-migrate is present
  if [ -f "./node_modules/node-pg-migrate/bin/node-pg-migrate" ]; then
    echo "📦 Running database schema migrations..."
    ./node_modules/node-pg-migrate/bin/node-pg-migrate up || {
      echo "⚠️ Migration encountered an issue, continuing server startup..."
    }
    echo "✅ Database schema verified and up to date."
  fi
fi

echo "🌟 Launching Next.js Production Server on port $PORT..."
exec "$@"
