#!/usr/bin/env bash

# Render provides DATABASE_URL in the format postgres://...
# Handle both postgres:// and postgresql:// from Render
TEMP_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
export SYNC_DATABASE_URL="${TEMP_URL}"
export DATABASE_URL="${TEMP_URL/postgresql:\/\//postgresql+asyncpg:\/\/}"

# main.py lifespan automatically runs migrations and seeds the database
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
