# KJ Inventory - Quick Start Guide

## Prerequisites

- Go 1.22+ installed
- Node.js 18+ and npm installed
- Git (already set up)

---

## First Time Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Go dependencies (automatic on first run)
go mod download

# Run database migrations
cd ..
make migrate-up

# Or manually:
# cd backend
# go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest \
#   -path migrations/sqlite \
#   -database "sqlite3://./data/inventory.db?_fk=1" up
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file (already exists)
# .env file should contain:
# VITE_API_BASE_URL=http://localhost:8800
```

---

## Running the Application

### Option 1: Using Make (Recommended)

```bash
# From project root
make dev

# This will start both backend and frontend in parallel
```

### Option 2: Manual (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
go run ./cmd/server

# Or build and run:
# go build -o ../bin/kj-server ./cmd/server
# ../bin/kj-server
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Access the Application

1. Open browser to: `http://localhost:5173`
2. Login with one of the default accounts:
   - **Admin**: `admin@example.com` / `admin123` (Full access)
   - **Staff**: `staff@example.com` / `admin123` (Read-only)

**Change these passwords in production!**

---

## Default Configuration

### Backend (environment variables or `backend/.env`)
```env
SERVER_PORT=8800
DATABASE_DRIVER=sqlite3
DATABASE_DSN=./data/inventory.db?_fk=1
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
CORS_ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=info
SERVE_STATIC=false
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8800
```

---

## Testing the Application

### Backend Tests
```bash
cd backend
go test ./...

# With verbose output:
go test -v ./...

# Specific package:
go test ./internal/handlers
go test ./internal/repository
```

### Frontend Tests (when implemented)
```bash
cd frontend
npm run test
```

---

## Common Tasks

### Add a New Category
1. Login to the application
2. Navigate to Inventory page
3. Click "Manage Categories"
4. Click "+ Add Category" button
5. Enter category details (name, description, color)
6. Click "Save"

### Add a New Item
1. Login to the application
2. Click "Inventory" in sidebar
3. Click "+ Add Item" button
4. Fill in the form:
   - Name: e.g., "Paneer"
   - Category: Select from dropdown
   - Current Stock: e.g., 10
   - Unit: kg, pcs, ltr, or gm
   - Minimum Threshold: e.g., 5
   - Unit Cost (optional): e.g., 2.50
5. Click "Add Item"

### Adjust Stock
1. Navigate to Inventory
2. Find the item you want to adjust
3. Click the "Adjust Stock" button on the item card
4. Select movement type:
   - **IN**: Receiving new stock (adds to inventory)
   - **OUT**: Selling/using stock (removes from inventory)
   - **ADJUSTMENT**: Manual correction (can be + or -)
5. Enter quantity
6. Add notes (optional)
7. Click "Submit"

### View Dashboard Metrics
1. Navigate to Dashboard
2. View metrics:
   - Total Items
   - Low Stock Count
   - Out of Stock Count
   - Recent Movements (last 24 hours)
3. Check "Low Stock Items" section
4. Review "Recent Movements" feed

---

## Building for Production

### Backend
```bash
cd backend

# Build binary
go build -o ../bin/kj-server ./cmd/server

# Run production binary
../bin/kj-server
```

### Frontend
```bash
cd frontend

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

Production files will be in `frontend/dist/`

---

## Deployment Options

### Option 1: Docker (Recommended)
```bash
# Deploy to GCE instance
./deploy-gce-combined.sh --project YOUR_PROJECT_ID --deploy

# Or run locally with docker-compose
docker compose -f docker-compose.gce.yml up -d
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

### Option 2: Manual Deployment

**Backend:**
1. Build the binary: `go build -o kj-server ./cmd/server`
2. Copy binary to server
3. Set environment variables
4. Run migrations on production database
5. Start the server: `./kj-server`

**Frontend:**
1. Build: `npm run build`
2. Copy `dist/` folder contents to web server (nginx, Apache)
3. Configure nginx to serve static files
4. Set up reverse proxy to backend API

---

## Troubleshooting

### Backend won't start
- Check if port 8800 is already in use: `lsof -i :8800`
- Verify database file exists: `ls -la backend/data/inventory.db`
- Check migrations are up: `make migrate-version`

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:8800/health`
- Check CORS settings in backend config
- Verify `VITE_API_BASE_URL` in frontend `.env`
- Check browser console for errors

### Login fails
- Verify database has default admin user
- Check JWT secret is consistent
- Clear localStorage and try again: `localStorage.clear()`

### Database errors
- Check foreign keys are enabled for SQLite
- Verify migrations ran successfully
- Check file permissions on data directory

---

## Useful Commands

### Database

```bash
# Check migration version
make migrate-version

# Create new migration
make migrate-create NAME=add_some_feature

# Rollback last migration
make migrate-down

# Force migration version
make migrate-force VERSION=1
```

### Development

```bash
# Format Go code
cd backend && go fmt ./...

# Lint Go code (if golangci-lint installed)
cd backend && golangci-lint run

# Lint frontend code
cd frontend && npm run lint

# Build everything
cd backend && go build ./cmd/server
cd ../frontend && npm run build
```

### API Testing

```bash
# Health check
curl http://localhost:8800/health

# Login
curl -X POST http://localhost:8800/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Get items (with auth)
curl http://localhost:8800/api/v1/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Project Structure Overview

```
kj-inventory/
├── backend/
│   ├── cmd/server/          # Entry point
│   ├── internal/            # Private application code
│   │   ├── config/          # Configuration
│   │   ├── database/        # DB connection
│   │   ├── domain/          # Business models
│   │   ├── handlers/        # HTTP handlers
│   │   ├── repository/      # Data access
│   │   ├── services/        # Business logic
│   │   └── middleware/      # HTTP middleware
│   ├── pkg/                 # Public libraries
│   ├── migrations/          # Database migrations
│   └── data/                # SQLite database files
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API clients
│   │   ├── store/           # State management
│   │   └── types/           # TypeScript types
│   └── dist/                # Production build
│
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── Makefile                 # Build commands
```

---

## Next Steps

After getting the application running:

1. ✅ Explore the Dashboard
2. ✅ Add some test items
3. ✅ Try stock adjustments
4. ✅ Check the movements history
5. 📖 Read [ROADMAP.md](ROADMAP.md) for planned features
6. 📖 Read [API_DOCS.md](API_DOCS.md) for API details
7. 📖 Read [FRONTEND_README.md](FRONTEND_README.md) for frontend architecture

---

## Getting Help

- Check [arch.md](arch.md) for architecture details
- See [API_DOCS.md](API_DOCS.md) for API endpoints
- Review [ROADMAP.md](ROADMAP.md) for planned features
- Check backend logs for errors
- Open browser DevTools Console for frontend errors

---

## Contributing

If you're planning to contribute or extend this project:

1. Create a new branch for your feature
2. Follow existing code structure
3. Add tests for new functionality
4. Update documentation
5. Ensure `go test ./...` and `npm run build` pass

---

**Version**: v0.1 (MVP)
**Last Updated**: 2025-10-24
**Status**: ✅ Production Ready (Single-tenant SQLite)
