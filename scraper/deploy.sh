#!/bin/bash

###############################################################################
# KJ Order Scraper - Cloud Run Deployment Script
#
# Deploys the Swiggy order scraper to Google Cloud Run in Delhi (asia-south2)
# for optimal access to Indian services.
#
# Usage: ./deploy.sh [options]
#   --project PROJECT_ID   GCP project ID (default: from gcloud config)
#   --tag TAG              Image tag (default: latest)
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - Docker installed
#   - Required environment variables set (see .env.example)
###############################################################################

set -e

# Configuration
REGION="asia-south2"  # Delhi, India
SERVICE_NAME="kj-order-scraper"
MEMORY="1Gi"  # Playwright needs more memory
CPU="1"
MIN_INSTANCES="0"
MAX_INSTANCES="1"  # Single instance for session consistency
TIMEOUT="3600"     # 1 hour for long-running polling

# Colors for output
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
IMAGE_TAG="latest"

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get project ID if not specified
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        log_error "No GCP project ID specified. Use --project or set via 'gcloud config set project PROJECT_ID'"
        exit 1
    fi
fi

IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/kj-inventory/${SERVICE_NAME}:${IMAGE_TAG}"

log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Deploying KJ Order Scraper to Cloud Run"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Project:  ${PROJECT_ID}"
log_info "Region:   ${REGION} (Delhi, India)"
log_info "Service:  ${SERVICE_NAME}"
log_info "Image:    ${IMAGE_NAME}"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Create Artifact Registry repository if it doesn't exist
log_info "Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe kj-inventory --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    log_info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create kj-inventory \
        --repository-format=docker \
        --location="${REGION}" \
        --description="KJ Inventory Docker images" \
        --project="${PROJECT_ID}"
    log_success "Repository created"
else
    log_success "Repository already exists"
fi

# Step 2: Configure Docker for Artifact Registry
log_info "Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
log_success "Docker configured"

# Step 3: Build the Docker image
log_info "Building Docker image..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
docker build -t "${IMAGE_NAME}" "${SCRIPT_DIR}"
log_success "Image built"

# Step 4: Push to Artifact Registry
log_info "Pushing image to Artifact Registry..."
docker push "${IMAGE_NAME}"
log_success "Image pushed"

# Step 5: Deploy to Cloud Run
log_info "Deploying to Cloud Run..."

# Check if .env file exists for environment variables
ENV_ARGS=""
if [ -f "${SCRIPT_DIR}/.env" ]; then
    log_info "Loading environment variables from .env"
    # Read .env file and create --set-env-vars argument
    ENV_VARS=""
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [ -z "$key" ] && continue
        # Remove quotes from value
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        if [ -n "$ENV_VARS" ]; then
            ENV_VARS="${ENV_VARS},${key}=${value}"
        else
            ENV_VARS="${key}=${value}"
        fi
    done < "${SCRIPT_DIR}/.env"
    
    if [ -n "$ENV_VARS" ]; then
        ENV_ARGS="--set-env-vars=${ENV_VARS}"
    fi
fi

gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE_NAME}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --platform=managed \
    --memory="${MEMORY}" \
    --cpu="${CPU}" \
    --min-instances="${MIN_INSTANCES}" \
    --max-instances="${MAX_INSTANCES}" \
    --timeout="${TIMEOUT}" \
    --no-allow-unauthenticated \
    ${ENV_ARGS}

log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Deployment completed successfully!"
log_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Region: ${REGION} (Delhi, India)"
log_info "Service URL: $(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --format='value(status.url)')"
log_info ""
log_warning "Note: The scraper requires a valid session.json to be mounted."
log_warning "For production, store session data in Cloud Storage or Secret Manager."
