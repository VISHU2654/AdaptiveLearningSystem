#!/usr/bin/env bash

TEMP_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
export SYNC_DATABASE_URL="${TEMP_URL}"
export DATABASE_URL="${TEMP_URL/postgresql:\/\//postgresql+asyncpg:\/\/}"

celery -A app.tasks.celery_app:celery_app worker --loglevel=info
