# KJ Inventory Management System

A modern, mobile-first inventory management system built with Go and React, designed for restaurants and small businesses.

## Quick Start

### Prerequisites

- Go 1.22+
- Node.js 18+
- Make

### Setup & Run

1. **Run Database Migrations**
   ```bash
   make migrate-up
   ```

2. **Start Backend** (in one terminal)
   ```bash
   cd backend
   go run ./cmd/server
   ```
   Server starts on `http://localhost:8800`

3. **Start Frontend** (in another terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend starts on `http://localhost:5173`

4. **Login**
   - Email: `admin@example.com`
   - Password: `admin123`

   **Change default password in production!**

## 📱 Features

- **Mobile-First Design**: Optimized for quick updates on phones/tablets
- **Real-Time Stock Tracking**: Live inventory levels with automatic alerts
- **Quick Adjustments**: Swipe and tap interface for rapid stock changes
- **Category Management**: Pre-configured restaurant inventory categories
- **Low Stock Alerts**: Automatic notifications when items run low
- **Multi-Database Support**: SQLite for simplicity, PostgreSQL for scale
- **Minimal Memory Usage**: ~20-30MB Docker container

## 🏗️ Architecture

### Backend (Go)
- **Framework**: Chi router with middleware
- **Database**: SQLx with SQLite/PostgreSQL support
- **Authentication**: JWT-based auth system
- **Migrations**: golang-migrate for database versioning
- **Testing**: Built-in Go testing with testify

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Zustand for lightweight state
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation

## 📊 Default Categories

- **Dry Items**: Spices, grains, non-perishables
- **Dry Consumables**: Regularly used dry ingredients  
- **Deep Cold/Frozen**: Frozen items requiring deep freezing
- **Perishable Cold**: Fresh items requiring refrigeration
- **Packaging**: Containers, bags, packaging materials

## 🗄️ Database Migrations

The project uses [golang-migrate](https://github.com/golang-migrate/migrate) for database schema management.

### Migration Commands

```bash
# Run all pending migrations
make migrate-up

# Rollback the last migration
make migrate-down

# Rollback all migrations
make migrate-down-all

# Check current migration version
make migrate-version

# Create a new migration
make migrate-create NAME=add_some_feature

# Force set migration version (use with caution!)
make migrate-force VERSION=1
```

### Manual Migration (without Make)

If you prefer to use the migrate CLI directly:

```bash
# Install migrate CLI
go install -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run migrations
migrate -path backend/migrations/sqlite -database "sqlite3://./data/inventory.db?_fk=1" up

# Rollback
migrate -path backend/migrations/sqlite -database "sqlite3://./data/inventory.db?_fk=1" down 1
```

## 🔧 Development

```bash
# Clean and start fresh
make clean
make migrate-up
make run

# Run tests
make test

# Build for production
make build
```

## Project Structure

```
kj-inventory/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── config/          # Configuration
│   │   ├── database/        # Database connection
│   │   ├── domain/          # Domain models
│   │   ├── handlers/        # HTTP handlers
│   │   ├── middleware/      # Auth, logging middleware
│   │   ├── repository/      # Data access layer
│   │   └── services/        # Business logic
│   ├── migrations/sqlite/   # Database migrations
│   ├── pkg/                 # Shared packages
│   └── data/                # SQLite database
├── frontend/
│   └── src/
│       ├── components/      # React components
│       ├── pages/           # Page components
│       ├── services/        # API clients
│       └── store/           # State management
├── docs/                    # Documentation
└── scripts/                 # Deployment scripts
```

## Default Users

The migration seeds two users:
- **Admin**: `admin@example.com` / `admin123` (Full access)
- **Staff**: `staff@example.com` / `admin123` (Read-only)

**Change these passwords in production!**

## 🛠️ Available Make Commands

```bash
make help          # Show all available commands
make build         # Build the backend binary
make run           # Build and run the server
make dev           # Run server in dev mode (go run)
make test          # Run backend tests
make clean         # Clean build artifacts and database

# Migration commands
make migrate-up           # Apply all pending migrations
make migrate-down         # Rollback last migration
make migrate-down-all     # Rollback all migrations
make migrate-version      # Show current migration version
make migrate-create       # Create new migration (NAME=xxx)
```

## Current Status

### ✅ MVP Complete

**Backend:**
- REST API with JWT authentication
- Full CRUD for items, categories, movements
- Dashboard with metrics and analytics
- Role-based access control
- SQLite database with migrations
- Comprehensive test coverage

**Frontend:**
- React with TypeScript
- Mobile-responsive design
- Real-time dashboard
- Quick stock adjustments
- Search and filtering
- React Query for data fetching

**DevOps:**
- Docker deployment
- GitHub Actions CI/CD
- Automated testing
- Health checks and monitoring

### Next Steps

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed feature roadmap including:
- PostgreSQL support
- Advanced analytics
- Bulk operations
- Reports and exports
- Multi-location support

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Detailed setup instructions
- [API Documentation](docs/API_DOCS.md) - Complete API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment with Docker
- [CI/CD Setup](docs/CI_CD_SETUP.md) - GitHub Actions configuration
- [Development Roadmap](docs/ROADMAP.md) - Planned features and timeline

## 📄 License

Private project - All rights reserved