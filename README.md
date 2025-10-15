# KJ Inventory Management System

A modern inventory management system built with Go backend and React frontend.

## 🚀 Quick Start

### Prerequisites

- Go 1.20+
- Node.js 18+ (for frontend, coming soon)
- Make

### Setup & Run

1. **Run Database Migrations**
   ```bash
   make migrate-up
   ```
   This creates the SQLite database and seeds it with sample data including:
   - Default organization
   - Admin user (email: `admin@restaurant.local`, password: `admin123`)
   - 5 categories (Dry Items, Dry Consumables, Deep Cold/Frozen, Perishable Cold, Packaging)
   - 45 sample inventory items

2. **Build and Run the Server**
   ```bash
   make run
   ```
   Server will start on `http://localhost:8080`

### Daily Development

```bash
make dev  # Run server in development mode (go run)
```

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

## 📁 Project Structure

```
kj-inventory/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── config/          # Configuration management
│   │   ├── database/        # Database connection
│   │   ├── domain/          # Domain models (Item, User, Category, Movement, Alert)
│   │   ├── repository/      # Data access layer (CRUD operations)
│   │   ├── services/        # Business logic (TODO)
│   │   ├── handlers/        # HTTP handlers (TODO)
│   │   └── middleware/      # HTTP middleware (auth, logging)
│   ├── migrations/sqlite/   # Database migrations
│   │   ├── 000001_initial_schema.up.sql
│   │   └── 000001_initial_schema.down.sql
│   └── pkg/                 # Shared packages (logger, utils)
├── frontend/                # React frontend (TODO)
├── data/                    # SQLite database location
├── Makefile                 # Build and migration commands
└── README.md
```

## 🔑 Default Credentials

**Admin User:**
- Email: `admin@restaurant.local`
- Password: `admin123` (⚠️ **Change in production!**)

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

## 📊 Current Status - Steps 1 & 2 Complete ✅

### ✅ Completed (Backend Foundation)
- [x] Database schema with triggers and indexes
- [x] Migration system using golang-migrate (CLI-based)
- [x] Domain models (Item, User, Category, Movement, Alert)
- [x] Repository layer with all CRUD operations:
  - ItemRepository (with tests)
  - UserRepository
  - CategoryRepository
  - MovementRepository
  - AlertRepository
- [x] Database connection with proper configuration
- [x] Sample data seeding (45 items, 5 categories, 1 admin user)
- [x] Build and migration tooling (Makefile)

### 🚧 Next Steps (TODO)
- [ ] Service layer (auth, inventory, dashboard)
- [ ] HTTP handlers
- [ ] JWT authentication middleware implementation
- [ ] API endpoint implementation
- [ ] Frontend development
- [ ] End-to-end testing

## 🎯 API Endpoints (Planned)

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - Register new user (admin only)

### Items
- `GET /api/v1/items` - List items (with filters)
- `POST /api/v1/items` - Create item
- `GET /api/v1/items/{id}` - Get item details
- `PUT /api/v1/items/{id}` - Update item
- `DELETE /api/v1/items/{id}` - Delete item

### Stock Movements
- `POST /api/v1/movements` - Create stock movement (IN/OUT/ADJUSTMENT)
- `GET /api/v1/movements` - List movements
- `GET /api/v1/items/{id}/movements` - Get item movement history

### Categories
- `GET /api/v1/categories` - List categories
- `POST /api/v1/categories` - Create category

### Dashboard
- `GET /api/v1/dashboard/metrics` - Get dashboard metrics (low stock, out of stock, etc.)
- `GET /api/v1/dashboard/charts` - Get chart data

## 📄 License

Private project - All rights reserved