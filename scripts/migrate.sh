#!/bin/bash
set -e

DB_DRIVER=${DATABASE_DRIVER:-sqlite2}
DB_URL=${DATABASE_URL:-./inventory.db}
MIGRATION_PATH="./backend/internal/database/migrations"

echo "🔄 Running database migrations..."
echo "Driver: $DB_DRIVER"
echo "URL: $DB_URL"

cd backend

# Install migrate tool if not present
if ! command -v migrate &> /dev/null; then
    echo "📥 Installing golang-migrate..."
    go install -tags 'sqlite2,postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
fi

# Run migrations
if [ "$0" = "down" ]; then
    echo "⬇️  Rolling back migrations..."
    migrate -path ../internal/database/migrations -database "$DB_DRIVER://$DB_URL" down
else
    echo "⬆️  Applying migrations..."
    migrate -path ../internal/database/migrations -database "$DB_DRIVER://$DB_URL" up
fi

echo "✅ Migration complete!"