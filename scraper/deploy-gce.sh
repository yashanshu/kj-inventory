#!/bin/bash

###############################################################################
# KJ Order Scraper - GCP Compute Engine Deployment Script
#
# Creates and deploys the scraper to a GCE e2-small instance in Delhi (asia-south2)
# Cost: ~$13-15/month
#
# Usage: ./deploy-gce.sh [options]
#   --project PROJECT_ID   GCP project ID (required)
#   --create               Create new VM instance
#   --deploy               Deploy/update scraper on existing VM
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - SSH key configured for GCP
###############################################################################

set -e

# Configuration
REGION="asia-south2"
ZONE="${REGION}-a"
INSTANCE_NAME="kj-scraper"
MACHINE_TYPE="e2-small"  # 0.5 vCPU, 2GB RAM - ~$13-15/month
DISK_SIZE="10"           # 10GB balanced persistent disk
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
PROJECT_ID=""
ACTION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --create)
            ACTION="create"
            shift
            ;;
        --deploy)
            ACTION="deploy"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: $0 --project PROJECT_ID [--create|--deploy]"
            exit 1
            ;;
    esac
done

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        log_error "No GCP project ID specified. Use --project PROJECT_ID"
        exit 1
    fi
fi

if [ -z "$ACTION" ]; then
    log_error "Specify --create to create VM or --deploy to update scraper"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

###############################################################################
# Create VM Instance
###############################################################################
create_instance() {
    log_info "Creating GCE instance: ${INSTANCE_NAME}"
    log_info "Zone: ${ZONE} (Delhi, India)"
    log_info "Machine type: ${MACHINE_TYPE} (0.5 vCPU, 2GB RAM)"
    
    # Check if instance already exists
    if gcloud compute instances describe "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
        log_warning "Instance ${INSTANCE_NAME} already exists"
        read -p "Delete and recreate? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            gcloud compute instances delete "${INSTANCE_NAME}" \
                --zone="${ZONE}" --project="${PROJECT_ID}" --quiet
        else
            log_info "Use --deploy to update the existing instance"
            exit 0
        fi
    fi

    # Create the instance
    gcloud compute instances create "${INSTANCE_NAME}" \
        --project="${PROJECT_ID}" \
        --zone="${ZONE}" \
        --machine-type="${MACHINE_TYPE}" \
        --image-family="${IMAGE_FAMILY}" \
        --image-project="${IMAGE_PROJECT}" \
        --boot-disk-size="${DISK_SIZE}GB" \
        --boot-disk-type="pd-balanced" \
        --tags="http-server,https-server" \
        --metadata=startup-script='#!/bin/bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $(whoami)

# Install Docker Compose
apt-get update && apt-get install -y docker-compose-plugin

# Create app directory
mkdir -p /opt/kj-scraper/data
chmod 755 /opt/kj-scraper
'
    
    log_success "Instance created successfully"
    log_info "Waiting for instance to be ready..."
    sleep 30
    
    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    
    log_success "Instance is ready"
    log_info "External IP: ${EXTERNAL_IP}"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Wait 1-2 minutes for startup script to complete"
    log_info "  2. Run: ./deploy-gce.sh --project ${PROJECT_ID} --deploy"
}

###############################################################################
# Deploy Scraper to Existing VM
###############################################################################
deploy_scraper() {
    log_info "Deploying scraper to ${INSTANCE_NAME}..."
    
    # Check if instance exists
    if ! gcloud compute instances describe "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
        log_error "Instance ${INSTANCE_NAME} does not exist. Run with --create first."
        exit 1
    fi
    
    # Create deployment package
    log_info "Creating deployment package..."
    DEPLOY_DIR=$(mktemp -d)
    
    # Copy necessary files
    cp "${SCRIPT_DIR}/Dockerfile" "${DEPLOY_DIR}/"
    cp "${SCRIPT_DIR}/package.json" "${DEPLOY_DIR}/"
    cp "${SCRIPT_DIR}/tsconfig.json" "${DEPLOY_DIR}/"
    cp -r "${SCRIPT_DIR}/src" "${DEPLOY_DIR}/"
    
    # Copy .env if exists
    if [ -f "${SCRIPT_DIR}/.env" ]; then
        cp "${SCRIPT_DIR}/.env" "${DEPLOY_DIR}/"
    fi
    
    # Copy session data if exists
    if [ -d "${SCRIPT_DIR}/data" ]; then
        cp -r "${SCRIPT_DIR}/data" "${DEPLOY_DIR}/"
    fi
    
    # Create docker-compose.yml
    cat > "${DEPLOY_DIR}/docker-compose.yml" << 'EOF'
version: "3.8"

services:
  scraper:
    build: .
    container_name: kj-scraper
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

    # Create systemd service file
    cat > "${DEPLOY_DIR}/kj-scraper.service" << 'EOF'
[Unit]
Description=KJ Order Scraper
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/kj-scraper
ExecStart=/usr/bin/docker compose up -d --build
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

    # Create tarball
    TARBALL="${DEPLOY_DIR}/scraper.tar.gz"
    tar -czf "${TARBALL}" -C "${DEPLOY_DIR}" \
        Dockerfile package.json tsconfig.json src docker-compose.yml kj-scraper.service \
        $([ -f "${DEPLOY_DIR}/.env" ] && echo ".env") \
        $([ -d "${DEPLOY_DIR}/data" ] && echo "data")
    
    # Upload to instance
    log_info "Uploading to instance..."
    gcloud compute scp "${TARBALL}" "${INSTANCE_NAME}:/tmp/scraper.tar.gz" \
        --zone="${ZONE}" --project="${PROJECT_ID}"
    
    # Deploy on instance
    log_info "Installing on instance..."
    gcloud compute ssh "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" \
        --command='
set -e
sudo mkdir -p /opt/kj-scraper
cd /opt/kj-scraper
sudo tar -xzf /tmp/scraper.tar.gz
sudo cp kj-scraper.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kj-scraper
sudo systemctl restart kj-scraper
echo "Waiting for container to start..."
sleep 10
sudo docker compose logs --tail=20
'
    
    # Cleanup
    rm -rf "${DEPLOY_DIR}"
    
    log_success "Deployment completed successfully"
    log_info ""
    log_info "Useful commands:"
    log_info "  View logs:    gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command='sudo docker compose -f /opt/kj-scraper/docker-compose.yml logs -f'"
    log_info "  SSH into VM:  gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}"
    log_info "  Stop scraper: gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command='sudo systemctl stop kj-scraper'"
}

###############################################################################
# Main
###############################################################################
log_info "============================================"
log_info "KJ Order Scraper - GCE Deployment"
log_info "============================================"
log_info "Project: ${PROJECT_ID}"
log_info "Zone:    ${ZONE} (Delhi, India)"
log_info "============================================"

case $ACTION in
    create)
        create_instance
        ;;
    deploy)
        deploy_scraper
        ;;
esac
