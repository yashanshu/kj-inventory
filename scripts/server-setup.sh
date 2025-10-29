#!/bin/bash

###############################################################################
# KJ Inventory - Server Setup Script
#
# This script prepares a fresh Linux server for deploying KJ Inventory.
# It installs Docker, configures the environment, and sets up directories.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/yashanshu/kj-inventory/master/scripts/server-setup.sh | bash
#        Or: ./scripts/server-setup.sh
#
# Requirements:
#   - Ubuntu 20.04+ or Debian 11+ (or similar)
#   - Root or sudo access
#   - Internet connection
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="kj-inventory"
PROJECT_DIR="/opt/${PROJECT_NAME}"
DEPLOY_USER="kjinventory"
DOCKER_COMPOSE_VERSION="2.24.0"

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

print_header() {
    echo -e "${CYAN}"
    echo ""
    echo "  KJ Inventory - Server Setup"
    echo ""
    echo -e "${NC}"
}

# Check if running as root or with sudo
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Detect OS
detect_os() {
    log_info "Detecting operating system..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        log_success "Detected: $OS $VER"
    else
        log_error "Cannot detect operating system"
        exit 1
    fi

    # Check if OS is supported
    case "$OS" in
        "Ubuntu"|"Debian GNU/Linux"|"CentOS Linux"|"Rocky Linux"|"AlmaLinux")
            log_success "Operating system is supported"
            ;;
        *)
            log_warning "Operating system may not be fully supported: $OS"
            ;;
    esac
}

# Update system packages
update_system() {
    log_info "Updating system packages..."

    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get upgrade -y -qq
        apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release ufw
    elif command -v yum &> /dev/null; then
        yum update -y -q
        yum install -y -q curl wget git ca-certificates gnupg ufw
    else
        log_error "Package manager not supported"
        exit 1
    fi

    log_success "System packages updated"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."

    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        log_warning "Docker is already installed ($(docker --version))"
        return 0
    fi

    # Install Docker using official script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_success "Docker installed successfully ($(docker --version))"
}

# Install Docker Compose
install_docker_compose() {
    log_info "Installing Docker Compose..."

    # Check if Docker Compose is already installed
    if docker compose version &> /dev/null; then
        log_warning "Docker Compose is already installed ($(docker compose version))"
        return 0
    fi

    # Docker Compose v2 is now included with Docker, so this should work
    if docker compose version &> /dev/null; then
        log_success "Docker Compose v2 is available"
    else
        log_error "Docker Compose not found. Please install Docker Desktop or Docker Compose plugin."
        exit 1
    fi
}

# Create deployment user
create_deploy_user() {
    log_info "Creating deployment user: ${DEPLOY_USER}..."

    # Check if user already exists
    if id "${DEPLOY_USER}" &>/dev/null; then
        log_warning "User ${DEPLOY_USER} already exists"
    else
        # Create user without password (SSH key only)
        useradd -m -s /bin/bash "${DEPLOY_USER}"

        # Add user to docker group
        usermod -aG docker "${DEPLOY_USER}"

        log_success "User ${DEPLOY_USER} created"
    fi

    # Ensure user is in docker group
    if groups "${DEPLOY_USER}" | grep -q docker; then
        log_success "User ${DEPLOY_USER} is in docker group"
    else
        usermod -aG docker "${DEPLOY_USER}"
        log_success "Added ${DEPLOY_USER} to docker group"
    fi
}

# Setup SSH for deployment user
setup_ssh() {
    log_info "Setting up SSH for deployment user..."

    local ssh_dir="/home/${DEPLOY_USER}/.ssh"

    # Create .ssh directory
    mkdir -p "${ssh_dir}"
    chmod 700 "${ssh_dir}"

    # Create authorized_keys if it doesn't exist
    touch "${ssh_dir}/authorized_keys"
    chmod 600 "${ssh_dir}/authorized_keys"

    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${ssh_dir}"

    log_success "SSH directory setup complete"
    log_warning "Add your GitHub Actions SSH public key to: ${ssh_dir}/authorized_keys"
}

# Create project directory structure
setup_project_directory() {
    log_info "Creating project directory structure..."

    # Create main project directory
    mkdir -p "${PROJECT_DIR}"
    mkdir -p "${PROJECT_DIR}/data"
    mkdir -p "${PROJECT_DIR}/data/backups"
    mkdir -p "${PROJECT_DIR}/data/uploads"
    mkdir -p "${PROJECT_DIR}/logs"
    mkdir -p "${PROJECT_DIR}/scripts"

    # Set ownership
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${PROJECT_DIR}"

    # Set permissions
    chmod 755 "${PROJECT_DIR}"
    chmod 755 "${PROJECT_DIR}/data"
    chmod 755 "${PROJECT_DIR}/logs"

    log_success "Project directory created at: ${PROJECT_DIR}"
}

# Create .env.production template
create_env_template() {
    log_info "Creating .env.production template..."

    local env_file="${PROJECT_DIR}/.env.production"

    if [ -f "${env_file}" ]; then
        log_warning ".env.production already exists, skipping..."
        return 0
    fi

    cat > "${env_file}" << 'EOF'
# KJ Inventory - Production Environment Variables
# IMPORTANT: Update all values below before deploying!

# JWT Configuration (REQUIRED - Generate a strong secret!)
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_AT_LEAST_32_CHARS

# CORS Configuration (Update with your domain)
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Database Configuration (SQLite)
DATABASE_URL=file:/app/data/inventory.db?_fk=1

# Application Configuration
# Change APP_HOST_PORT if 8080 conflicts with another service
APP_HOST_PORT=8080
LOG_LEVEL=info

# Optional: PostgreSQL (uncomment when migrating from SQLite)
# POSTGRES_DB=inventory
# POSTGRES_USER=inventory_user
# POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD

# Optional: Monitoring (future feature)
# GRAFANA_PASSWORD=CHANGE_THIS

EOF

    chown "${DEPLOY_USER}:${DEPLOY_USER}" "${env_file}"
    chmod 600 "${env_file}"

    log_success ".env.production template created"
    log_warning "IMPORTANT: Edit ${env_file} and update all secrets!"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."

    # Check if UFW is available
    if ! command -v ufw &> /dev/null; then
        log_warning "UFW not available, skipping firewall configuration"
        return 0
    fi

    # Configure UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow 22/tcp comment "SSH"

    # Allow HTTP/HTTPS
    ufw allow 80/tcp comment "HTTP"
    ufw allow 443/tcp comment "HTTPS"

    # Allow application port (if accessing directly)
    ufw allow 8080/tcp comment "KJ Inventory App"

    # Enable firewall
    ufw --force enable

    log_success "Firewall configured"
    log_info "Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (App)"
    log_warning "If you change APP_HOST_PORT, update the firewall to allow the new port."
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."

    cat > /etc/logrotate.d/${PROJECT_NAME} << EOF
${PROJECT_DIR}/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 ${DEPLOY_USER} ${DEPLOY_USER}
    sharedscripts
    postrotate
        docker restart kj-inventory-app 2>/dev/null || true
    endscript
}
EOF

    log_success "Log rotation configured"
}

# Generate SSH key for GitHub Container Registry
generate_github_instructions() {
    log_info "Generating GitHub Actions setup instructions..."

    cat > "${PROJECT_DIR}/SETUP_INSTRUCTIONS.txt" << EOF

KJ Inventory - Server Setup Complete!


Server Information:
  - Project Directory: ${PROJECT_DIR}
  - Deploy User: ${DEPLOY_USER}
  - Application URL: http://$(hostname -I | awk '{print $1}'):8080


Next Steps:


1. Generate SSH Key Pair (on your local machine):
   ssh-keygen -t ed25519 -C "github-actions-${PROJECT_NAME}" -f ~/.ssh/github_actions_${PROJECT_NAME}

2. Add Public Key to Server:
   cat ~/.ssh/github_actions_${PROJECT_NAME}.pub >> /home/${DEPLOY_USER}/.ssh/authorized_keys

3. Configure GitHub Secrets:
   Go to: https://github.com/yashanshu/kj-inventory/settings/secrets/actions

   Add the following secrets:
   - SERVER_HOST:       $(hostname -I | awk '{print $1}')
   - SERVER_USER:       ${DEPLOY_USER}
   - SSH_PRIVATE_KEY:   (contents of ~/.ssh/github_actions_${PROJECT_NAME})
   - JWT_SECRET:        (generate with: openssl rand -base64 32)

4. Update Production Environment:
   Edit: ${PROJECT_DIR}/.env.production

   Generate JWT secret:
   openssl rand -base64 32

5. Copy Docker Compose File:
   scp docker-compose.prod.yml ${DEPLOY_USER}@$(hostname -I | awk '{print $1}'):${PROJECT_DIR}/
   scp scripts/deploy.sh ${DEPLOY_USER}@$(hostname -I | awk '{print $1}'):${PROJECT_DIR}/scripts/

6. Test SSH Connection:
   ssh -i ~/.ssh/github_actions_${PROJECT_NAME} ${DEPLOY_USER}@$(hostname -I | awk '{print $1}')

7. Make GitHub Container Registry Public:
   Go to: https://github.com/yashanshu/kj-inventory/pkgs/container/kj-inventory/settings
   Change visibility to public (or configure authentication)

8. Trigger First Deployment:
   Push to master branch or manually trigger the deploy workflow in GitHub Actions


Useful Commands:


View logs:
  docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml logs -f

Check status:
  docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml ps

Restart application:
  docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml restart

View database backups:
  ls -lh ${PROJECT_DIR}/data/backups/

Manual deployment:
  cd ${PROJECT_DIR} && ./scripts/deploy.sh


EOF

    chown "${DEPLOY_USER}:${DEPLOY_USER}" "${PROJECT_DIR}/SETUP_INSTRUCTIONS.txt"
    chmod 644 "${PROJECT_DIR}/SETUP_INSTRUCTIONS.txt"

    log_success "Setup instructions created at: ${PROJECT_DIR}/SETUP_INSTRUCTIONS.txt"
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}"
    echo ""
    echo "   Server Setup Complete!"
    echo ""
    echo -e "${NC}"

    log_success "Docker installed: $(docker --version)"
    log_success "Project directory: ${PROJECT_DIR}"
    log_success "Deploy user: ${DEPLOY_USER}"
    log_success "Server IP: $(hostname -I | awk '{print $1}')"

    echo ""
    log_info "Next steps:"
    echo "  1. Read: ${PROJECT_DIR}/SETUP_INSTRUCTIONS.txt"
    echo "  2. Edit: ${PROJECT_DIR}/.env.production"
    echo "  3. Configure GitHub Secrets"
    echo "  4. Deploy!"
    echo ""

    log_warning "Don't forget to:"
    echo "  - Update .env.production with strong secrets"
    echo "  - Add SSH public key to authorized_keys"
    echo "  - Configure GitHub Secrets"
    echo ""
}

###############################################################################
# Main Setup Flow
###############################################################################

main() {
    print_header

    check_root
    detect_os
    update_system
    install_docker
    install_docker_compose
    create_deploy_user
    setup_ssh
    setup_project_directory
    create_env_template
    configure_firewall
    setup_log_rotation
    generate_github_instructions

    print_summary
}

# Run main function
main "$@"
