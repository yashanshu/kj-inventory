# Restaurant Inventory Management System

A modern, mobile-first inventory management system built for small restaurant operations. Features real-time stock tracking, low-stock alerts, and intuitive mobile interface for quick inventory updates.

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd inventory-management

# Start with Docker Compose
make docker-compose

# Access the application
open http://localhost:8080
```

### Standalone Binary
```bash
# Build the application
make build

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run the server
./dist/inventory-server
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

## 🔧 Development

```bash
# Setup development environment
make setup

# Start development servers
make dev

# Run tests
make test

# Check code quality
make lint
make security-check
```

## 📦 Deployment Options

### 1. Docker Deployment
```bash
make docker
docker run -p 8080:8080 -v ./data:/app/data inventory-management:latest
```

### 2. Binary Deployment
```bash
make deploy-binary
# Follow the printed instructions
```

### 3. Remote Server Deployment
```bash
./scripts/deploy.sh your-server.com username /opt/inventory
```

## 🔒 Security

- JWT-based authentication
- CORS protection
- Input validation on all endpoints
- SQL injection protection via prepared statements
- Rate limiting (configurable)

## 📈 Performance

- **Memory**: ~20-30MB runtime (Docker)
- **Database**: Optimized indexes for fast queries
- **Frontend**: Code splitting and lazy loading
- **Caching**: Redis support for session storage

## 🔧 Configuration

Key environment variables:

```bash
# Database
DATABASE_DRIVER=sqlite3  # or postgres
DATABASE_URL=./inventory.db

# Security  
JWT_SECRET=your-secret-key

# Server
SERVER_PORT=8080
LOG_LEVEL=info
```

## 🤝 Contributing

1. Follow TDD practices
2. Use conventional commits
3. Test mobile responsiveness
4. Update documentation

## 📄 License

MIT License - see LICENSE file for details.