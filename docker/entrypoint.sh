#!/bin/sh

set -e

# Ensure runtime directories exist and are owned by the app user
mkdir -p /app/data /app/logs /app/data/backups /app/data/uploads
chown -R appuser:appgroup /app/data /app/logs || true

# Allow overriding umask via env, default to 002 for group-writable files
UMASK_VALUE="${UMASK:-002}"
umask "${UMASK_VALUE}"

# Note: Migrations are now run by deploy.sh BEFORE container starts
# This avoids race conditions when scaling horizontally

exec su-exec appuser "$@"
