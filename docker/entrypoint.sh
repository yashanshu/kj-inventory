#!/bin/sh

set -e

# Ensure runtime directories exist and are owned by the app user
mkdir -p /app/data /app/logs /app/data/backups /app/data/uploads
chown -R appuser:appgroup /app/data /app/logs || true

# Allow overriding umask via env, default to 002 for group-writable files
UMASK_VALUE="${UMASK:-002}"
umask "${UMASK_VALUE}"

# Run database migrations
echo "Running database migrations..."
DB_PATH="${DATABASE_URL:-file:/app/data/inventory.db?_fk=1}"

# Install migrate tool if not present (for production)
if ! command -v migrate >/dev/null 2>&1; then
    echo "Installing golang-migrate..."
    wget -q -O migrate.tar.gz https://github.com/golang-migrate/migrate/releases/download/v4.17.1/migrate.linux-amd64.tar.gz
    tar -xzf migrate.tar.gz
    mv migrate /usr/local/bin/migrate
    chmod +x /usr/local/bin/migrate
    rm migrate.tar.gz
    echo "golang-migrate installed"
fi

# Run migrations (as root before switching to appuser)
migrate -path /app/migrations/sqlite -database "sqlite3://${DB_PATH#file:}" up || {
    echo "Migration failed or no changes needed"
}

echo "Migrations complete"

exec su-exec appuser "$@"
