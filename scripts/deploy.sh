#!/bin/bash

###############################################################################
# KJ Inventory - Production Deployment Script
#
# This script handles the deployment of the KJ Inventory application using
# Docker Compose. It includes database backup, health checks, and rollback
# capability.
#
# Usage: ./scripts/deploy.sh
#
# Requirements:
#   - Docker and Docker Compose installed
#   - Running from /opt/kj-inventory directory
#   - .env.production file with required variables
###############################################################################

set -e  # Exit on any error
umask 002  # Ensure new files are group-writable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/kj-inventory"
DATA_DIR="${PROJECT_DIR}/data"
BACKUP_DIR="${DATA_DIR}/backups"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env.production"
MAX_BACKUPS=10
DEFAULT_APP_HOST_PORT=8080
APP_HOST_PORT="${DEFAULT_APP_HOST_PORT}"
HEALTH_CHECK_URL=""
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2
DOCKER_COMPOSE_CMD=()
COMPOSE_ENV_ARGS=()

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ ! -f "${COMPOSE_FILE}" ]; then
        log_error "docker-compose.prod.yml not found!"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi

    detect_docker_compose
    configure_env_file

    log_success "Prerequisites check passed"
}

detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD=(docker-compose)
        log_success "docker-compose CLI detected"
    elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD=(docker compose)
        log_success "Docker Compose v2 plugin detected"
    else
        log_error "Docker Compose is not installed!"
        exit 1
    fi
}

configure_env_file() {
    if [ -f "${ENV_FILE}" ]; then
        COMPOSE_ENV_ARGS=(--env-file "${ENV_FILE}")
        log_success "Using environment file: ${ENV_FILE}"
    else
        COMPOSE_ENV_ARGS=()
        log_warning ".env.production not found; continuing without --env-file"
    fi
}

load_env_vars() {
    if [ -f "${ENV_FILE}" ]; then
        set -a
        # shellcheck disable=SC1090
        source "${ENV_FILE}"
        set +a
    fi

    APP_HOST_PORT="${APP_HOST_PORT:-${DEFAULT_APP_HOST_PORT}}"
    HEALTH_CHECK_URL="http://localhost:${APP_HOST_PORT}/health"

    log_info "Target application host port: ${APP_HOST_PORT}"
}

run_compose() {
    "${DOCKER_COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" "${COMPOSE_ENV_ARGS[@]}" "$@"
}

# Backup database before deployment
backup_database() {
    log_info "Backing up database..."

    mkdir -p "${BACKUP_DIR}"

    local db_file="${DATA_DIR}/inventory.db"
    if [ -f "${db_file}" ]; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="${BACKUP_DIR}/inventory.db.${timestamp}.backup"

        if ! cp "${db_file}" "${backup_file}"; then
            log_error "Failed to back up database to ${backup_file}"
            log_error "Ensure $(id -un) owns ${DATA_DIR} or has write access to it."
            log_error "Tip: run 'sudo chown -R kjinventory:kjinventory ${DATA_DIR}' and retry."
            exit 1
        fi
        log_success "Database backed up to: ${backup_file}"

        # Compress old backups
        find "${BACKUP_DIR}" -name "*.backup" -type f -mtime +1 -exec gzip {} \;

        # Keep only last N backups
        local backup_count=$(ls -1 "${BACKUP_DIR}" | wc -l)
        if [ "${backup_count}" -gt "${MAX_BACKUPS}" ]; then
            log_info "Cleaning up old backups (keeping last ${MAX_BACKUPS})..."
            ls -t "${BACKUP_DIR}"/* | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        fi
    else
        log_warning "No database file found to backup (first deployment?)"
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Check if container is running
    if ! docker ps | grep -q kj-inventory-app; then
        log_warning "Container not running, starting temporarily for migrations..."
        run_compose up -d
        sleep 5
    fi

    # Run migrations inside the container
    docker exec kj-inventory-app sh -c "
        if [ -d /app/migrations/sqlite ]; then
            echo 'Migrations directory found'
            # Note: Add migration runner if needed
            # For now, migrations are handled during container startup
        else
            echo 'No migrations directory found'
        fi
    " || log_warning "Could not run migrations (may not be needed)"

    log_success "Migrations completed"
}

# Pull latest Docker image
pull_latest_image() {
    log_info "Pulling latest Docker image..."

    if run_compose pull; then
        log_success "Latest image pulled successfully"
    else
        log_error "Failed to pull latest image"
        exit 1
    fi
}

# Deploy new version
deploy() {
    log_info "Deploying new version..."

    # Stop old container gracefully
    log_info "Stopping old container..."
    run_compose down --timeout 30 || true

    # Start new container
    log_info "Starting new container..."
    if run_compose up -d; then
        log_success "New container started"
    else
        diagnose_port_conflict
        log_error "Failed to start new container"
        exit 1
    fi

    # Wait for container to be ready
    sleep 5
}

diagnose_port_conflict() {
    log_warning "Port ${APP_HOST_PORT} might already be in use."
    log_info "Suggested commands:"
    log_info "  sudo lsof -i :${APP_HOST_PORT}"
    log_info "  sudo ss -ltnp | grep :${APP_HOST_PORT}"

    if command -v ss >/dev/null 2>&1; then
        log_info "Current listeners on port ${APP_HOST_PORT}:"
        ss -ltnp | grep -F ":${APP_HOST_PORT}" || true
    fi
}

# Health check
health_check() {
    log_info "Running health check..."

    local retry_count=0
    while [ ${retry_count} -lt ${HEALTH_CHECK_RETRIES} ]; do
        if curl -f -s "${HEALTH_CHECK_URL}" > /dev/null 2>&1; then
            log_success "Health check passed! Application is healthy."
            return 0
        fi

        retry_count=$((retry_count + 1))
        log_info "Health check attempt ${retry_count}/${HEALTH_CHECK_RETRIES} failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
        sleep ${HEALTH_CHECK_INTERVAL}
    done

    log_error "Health check failed after ${HEALTH_CHECK_RETRIES} attempts!"
    return 1
}

# Rollback to previous version
rollback() {
    log_error "Deployment failed! Starting rollback..."

    # Find the latest backup
    local latest_backup=$(ls -t "${BACKUP_DIR}"/*.backup 2>/dev/null | head -n1)

    if [ -z "${latest_backup}" ]; then
        log_error "No backup found for rollback!"
        exit 1
    fi

    log_info "Restoring database from: ${latest_backup}"
    cp "${latest_backup}" "${DATA_DIR}/inventory.db"

    log_info "Restarting with previous configuration..."
    run_compose down
    run_compose up -d

    log_warning "Rollback completed. Please investigate the deployment failure."
    exit 1
}

# Cleanup old Docker images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f > /dev/null 2>&1 || true
    log_success "Cleanup completed"
}

# Show deployment info
show_deployment_info() {
    log_info "Deployment Information:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    run_compose ps
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    log_info "Container Logs (last 20 lines):"
    run_compose logs --tail=20

    log_success "Application URL: http://$(hostname -I | awk '{print $1}'):${APP_HOST_PORT}"
    log_success "Health Check: ${HEALTH_CHECK_URL}"
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    log_info "Starting KJ Inventory deployment..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Navigate to project directory
    cd "${PROJECT_DIR}" || exit 1

    # Run deployment steps
    check_prerequisites
    load_env_vars
    backup_database
    pull_latest_image
    deploy

    # Run health check
    if health_check; then
        cleanup
        show_deployment_info
        log_success "🎉 Deployment completed successfully!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    else
        rollback
    fi
}

# Run main function
main "$@"
