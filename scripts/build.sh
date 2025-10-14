#!/bin/bash
set -e

echo "Building Inventory Management System..."

# Create dist directory
mkdir -p dist

# Build backend
echo "Building Go backend..."
cd backend
CGO_ENABLED=1 go build -ldflags="-s -w" -o ../dist/inventory-server cmd/server/main.go
cd ..

# Build frontend
echo "Building React frontend..."
cd frontend
pnpm run build
cp -r dist ../dist/frontend
cd ..

# Copy migrations
echo "Copying database migrations..."
cp -r backend/internal/database/migrations dist/

# Copy config example
cp .env.example dist/

echo "Build complete!"
echo ""
echo "Build artifacts:"
echo "• Backend binary: ./dist/inventory-server"
echo "• Frontend files: ./dist/frontend/"
echo "• Database migrations: ./dist/migrations/"
echo "• Config template: ./dist/.env.example"
echo ""
echo "To deploy:"
echo "1. Copy ./dist/ to your server"
echo "2. Rename .env.example to .env and configure"
echo "3. Run: ./inventory-server"