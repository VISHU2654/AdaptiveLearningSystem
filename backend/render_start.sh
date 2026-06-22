#!/usr/bin/env bash

# Render provides DATABASE_URL in the format postgres://...
# SQLAlchemy requires postgresql:// for sync, and postgresql+asyncpg:// for async.

export SYNC_DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
export DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql+asyncpg:\/\/}"

# main.py lifespan automatically runs migrations and seeds the database
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
