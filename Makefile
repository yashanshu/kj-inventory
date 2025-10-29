.PHONY: help migrate-up migrate-down migrate-create migrate-force build run clean

# Default database URL
DB_URL ?= sqlite3://./backend/data/inventory.db?_fk=1
MIGRATIONS_PATH ?= backend/migrations/sqlite

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Setup local development environment (copy .env.example if .env doesn't exist)
	@echo "Setting up local development environment..."
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "✓ Created .env file"; \
	else \
		echo "✓ .env file already exists"; \
	fi
	@if [ ! -f frontend/.env ]; then \
		echo "Creating frontend/.env from frontend/.env.example..."; \
		cp frontend/.env.example frontend/.env; \
		echo "✓ Created frontend/.env file"; \
	else \
		echo "✓ frontend/.env file already exists"; \
	fi
	@echo "✓ Setup complete! You can now run 'make dev' to start the backend"

migrate-up: ## Run all pending migrations
	@echo "Running migrations..."
	@go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up
	@echo "Migrations completed successfully"

migrate-down: ## Rollback last migration
	@echo "Rolling back last migration..."
	@go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down 1

migrate-down-all: ## Rollback all migrations
	@echo "Rolling back all migrations..."
	@go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down -all

migrate-force: ## Force set migration version (use: make migrate-force VERSION=1)
	@go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path $(MIGRATIONS_PATH) -database "$(DB_URL)" force $(VERSION)

migrate-version: ## Show current migration version
	@go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path $(MIGRATIONS_PATH) -database "$(DB_URL)" version

migrate-create: ## Create a new migration (use: make migrate-create NAME=add_users_table)
	@go run -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest create -ext sql -dir $(MIGRATIONS_PATH) -seq $(NAME)

build: ## Build the backend server
	@echo "Building server..."
	@cd backend && go build -o bin/server ./cmd/server
	@echo "Build complete: backend/bin/server"

run: build ## Build and run the server
	@echo "Starting server..."
	@if [ -f .env ]; then \
		set -a && . ./.env && set +a && ./backend/bin/server; \
	else \
		echo "Note: No .env file found, using .env.example values"; \
		set -a && . ./.env.example && set +a && ./backend/bin/server; \
	fi

dev: ## Run server in development mode (assumes migrations already run)
	@if [ -f .env ]; then \
		echo "Loading .env file..."; \
		set -a && . ./.env && set +a && cd backend && go run ./cmd/server; \
	else \
		echo "Loading .env.example file..."; \
		set -a && . ./.env.example && set +a && cd backend && go run ./cmd/server; \
	fi

clean: ## Clean build artifacts and database
	@echo "Cleaning..."
	@rm -f bin/server
	@rm -f data/inventory.db
	@echo "Clean complete"

test: ## Run backend tests
	@cd backend && go test ./...

.DEFAULT_GOAL := help
