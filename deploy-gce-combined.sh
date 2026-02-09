#!/bin/bash

###############################################################################
# KJ Inventory - Combined GCE Deployment Script
#
# Deploys both the backend and scraper to a single GCE instance in Delhi.
# Estimated cost: ~$14-27/month depending on instance size
#
# Usage:
#   ./deploy-gce-combined.sh --project PROJECT_ID --create   # Create new VM
#   ./deploy-gce-combined.sh --project PROJECT_ID --deploy   # Deploy/update
#   ./deploy-gce-combined.sh --project PROJECT_ID --ssh      # SSH into VM
#   ./deploy-gce-combined.sh --project PROJECT_ID --logs     # View logs
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - Docker installed locally (for session login)
###############################################################################

set -e

# Configuration
REGION="asia-south2"
ZONE="${REGION}-a"
INSTANCE_NAME="kj-inventory"
MACHINE_TYPE="${MACHINE_TYPE:-e2-small}"  # e2-small (~$14/mo) or e2-medium (~$27/mo)
DISK_SIZE="20"
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

usage() {
    echo "Usage: $0 --project PROJECT_ID [--create|--deploy|--ssh|--logs]"
    echo ""
    echo "Actions:"
    echo "  --create   Create new GCE instance"
    echo "  --deploy   Deploy/update application"
    echo "  --ssh      SSH into the VM"
    echo "  --logs     View application logs"
    echo ""
    echo "Options:"
    echo "  --project  GCP project ID (required)"
    echo "  --medium   Use e2-medium instead of e2-small"
    exit 1
}

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
        --ssh)
            ACTION="ssh"
            shift
            ;;
        --logs)
            ACTION="logs"
            shift
            ;;
        --medium)
            MACHINE_TYPE="e2-medium"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        log_error "No GCP project ID specified"
        usage
    fi
fi

if [ -z "$ACTION" ]; then
    usage
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

###############################################################################
# Create VM Instance
###############################################################################
create_instance() {
    log_info "============================================"
    log_info "Creating GCE instance: ${INSTANCE_NAME}"
    log_info "============================================"
    log_info "Zone:         ${ZONE} (Delhi, India)"
    log_info "Machine type: ${MACHINE_TYPE}"
    log_info "Disk:         ${DISK_SIZE}GB"
    log_info "============================================"

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

    # Create startup script file
    STARTUP_SCRIPT=$(mktemp)
    cat > "${STARTUP_SCRIPT}" << 'STARTUP_EOF'
#!/bin/bash
set -e

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt-get update && apt-get install -y docker-compose-plugin

# Create app directory structure
mkdir -p /opt/kj-inventory/{data,logs,scraper/data}
chmod -R 755 /opt/kj-inventory

echo "Startup script completed" > /opt/kj-inventory/startup.log
STARTUP_EOF

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
        --metadata-from-file=startup-script="${STARTUP_SCRIPT}"
    
    # Clean up startup script
    rm -f "${STARTUP_SCRIPT}"
    
    # Create firewall rule for HTTP if it does not exist
    if ! gcloud compute firewall-rules describe allow-http --project="${PROJECT_ID}" &>/dev/null; then
        log_info "Creating HTTP firewall rule..."
        gcloud compute firewall-rules create allow-http \
            --project="${PROJECT_ID}" \
            --allow=tcp:8080,tcp:80,tcp:443 \
            --target-tags=http-server \
            --description="Allow HTTP/HTTPS traffic"
    fi

    log_success "Instance created successfully"
    log_info "Waiting for instance to be ready..."
    sleep 45

    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

    log_success "============================================"
    log_success "Instance is ready"
    log_success "============================================"
    log_info "External IP: ${EXTERNAL_IP}"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Configure .env.production with your settings"
    log_info "  2. Run: $0 --project ${PROJECT_ID} --deploy"
}

###############################################################################
# Deploy Application
###############################################################################
deploy_app() {
    log_info "============================================"
    log_info "Deploying KJ Inventory to ${INSTANCE_NAME}"
    log_info "============================================"

    # Check if instance exists
    if ! gcloud compute instances describe "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" &>/dev/null; then
        log_error "Instance ${INSTANCE_NAME} does not exist. Run with --create first."
        exit 1
    fi

    # Check for required env file
    if [ ! -f "${SCRIPT_DIR}/.env.production" ]; then
        log_error ".env.production not found"
        log_error "Create it from .env.example and configure your settings"
        exit 1
    fi

    # Create deployment package
    log_info "Creating deployment package..."
    DEPLOY_DIR=$(mktemp -d)
    trap "rm -rf ${DEPLOY_DIR}" EXIT

    # Copy docker-compose
    cp "${SCRIPT_DIR}/docker-compose.gce.yml" "${DEPLOY_DIR}/docker-compose.yml"
    
    # Copy environment file
    cp "${SCRIPT_DIR}/.env.production" "${DEPLOY_DIR}/.env"

    # Copy scraper directory
    # Note: Scraper source is no longer needed as we pull the image
    # We only need data directories for session persistence if applicable

    # Copy scraper session data if exists
    # Copy scraper session data
    # Copy scraper session data
    mkdir -p "${DEPLOY_DIR}/scraper/data"
    if [ -f "${SCRIPT_DIR}/scraper/data/session.json" ]; then
        cp "${SCRIPT_DIR}/scraper/data/session.json" "${DEPLOY_DIR}/scraper/data/"
        log_success "Found session.json, including in deployment"
    else
        log_warning "No session.json found. You'll need to run login command if not already authenticated."
    fi

    # Copy Docker config for registry authentication
    mkdir -p "${DEPLOY_DIR}/.docker"
    if [ -f "${HOME}/.docker/config.json" ]; then
        cp "${HOME}/.docker/config.json" "${DEPLOY_DIR}/.docker/"
        log_success "Included Docker configuration for registry authentication"
    else
        log_warning "No ~/.docker/config.json found. Deployment may fail if pulling from private registry."
    fi

    # Create systemd service
    cat > "${DEPLOY_DIR}/kj-inventory.service" << 'EOF'
[Unit]
Description=KJ Inventory Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/kj-inventory
ExecStartPre=/usr/bin/docker compose pull
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
EOF

    # Create tarball
    log_info "Packaging files..."
    TARBALL="${DEPLOY_DIR}/deploy.tar.gz"
    tar -czf "${TARBALL}" -C "${DEPLOY_DIR}" \
        docker-compose.yml .env scraper .docker kj-inventory.service

    # Upload to instance
    log_info "Uploading to instance..."
    gcloud compute scp "${TARBALL}" "${INSTANCE_NAME}:/tmp/deploy.tar.gz" \
        --zone="${ZONE}" --project="${PROJECT_ID}"

    # Deploy on instance
    log_info "Installing on instance..."
    gcloud compute ssh "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" \
        --command='
set -e
cd /opt/kj-inventory
sudo tar -xzf /tmp/deploy.tar.gz

# Fix permissions for scraper data
# The scraper service runs as user 1001, but the mapped volume is owned by root
# because of how we copied/extracted files. We need to fix this.
sudo chown -R 1001:1001 scraper/data

# Setup Docker Config for Auth
if [ -f ".docker/config.json" ]; then
    mkdir -p ~/.docker
    cp .docker/config.json ~/.docker/
    # Also copy to root if running as root/sudo
    sudo mkdir -p /root/.docker
    sudo cp .docker/config.json /root/.docker/
fi

sudo cp kj-inventory.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kj-inventory

# Pull latest images explicitely
echo "Pulling latest images..."
sudo docker compose pull

sudo systemctl restart kj-inventory
echo "Waiting for services to start..."
sleep 15
sudo docker compose ps
echo ""
echo "Recent logs:"
sudo docker compose logs --tail=10
'

    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

    log_success "============================================"
    log_success "Deployment completed successfully"
    log_success "============================================"
    log_info "Application URL: http://${EXTERNAL_IP}:8080"
    log_info ""
    log_info "Useful commands:"
    log_info "  View logs:  $0 --project ${PROJECT_ID} --logs"
    log_info "  SSH:        $0 --project ${PROJECT_ID} --ssh"
}

###############################################################################
# SSH into VM
###############################################################################
ssh_to_vm() {
    gcloud compute ssh "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}"
}

###############################################################################
# View logs
###############################################################################
view_logs() {
    gcloud compute ssh "${INSTANCE_NAME}" \
        --zone="${ZONE}" --project="${PROJECT_ID}" \
        --command='sudo docker compose -f /opt/kj-inventory/docker-compose.yml logs -f --tail=100'
}

###############################################################################
# Main
###############################################################################
case $ACTION in
    create)
        create_instance
        ;;
    deploy)
        deploy_app
        ;;
    ssh)
        ssh_to_vm
        ;;
    logs)
        view_logs
        ;;
esac
