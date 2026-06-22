#!/usr/bin/env bash

export SYNC_DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
export DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql+asyncpg:\/\/}"

celery -A app.tasks.celery_app:celery_app worker --loglevel=info
