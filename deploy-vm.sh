#!/bin/bash

###############################################################################
# KJ Inventory - Generic VM Deployment Script
#
# Deploys the combined app + scraper stack to any Linux VM reachable via SSH
# or to a GCE VM via gcloud transport.
#
# Examples:
#   ./deploy-vm.sh --host 1.2.3.4 --user admin --bootstrap
#   ./deploy-vm.sh --host 1.2.3.4 --user admin --deploy
#   ./deploy-vm.sh --transport gcloud --project my-project --zone asia-south2-a \
#       --instance kj-inventory --deploy --tunnel-through-iap
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ACTION=""
TRANSPORT="ssh"
HOST=""
USER_NAME="${USER:-}"
PORT="22"
IDENTITY_FILE=""
REMOTE_DIR="/opt/kj-inventory"
COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.production"
COMPOSE_PROJECT_NAME="kj-inventory"
REGISTRY_AUTH_MODE="none"
REGISTRY_HOST=""
PROJECT_ID=""
ZONE=""
INSTANCE_NAME=""
TUNNEL_THROUGH_IAP="false"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo "Usage:"
    echo "  $0 [transport options] [action options] --deploy|--bootstrap|--ssh|--logs"
    echo ""
    echo "Transport options:"
    echo "  --transport ssh|gcloud        Remote access method (default: ssh)"
    echo "  --host HOST                   SSH host for --transport ssh"
    echo "  --user USER                   SSH/GCE user"
    echo "  --port PORT                   SSH port (default: 22)"
    echo "  --identity-file PATH          SSH identity file"
    echo "  --project PROJECT_ID          GCP project for --transport gcloud"
    echo "  --zone ZONE                   GCE zone for --transport gcloud"
    echo "  --instance NAME               GCE instance name for --transport gcloud"
    echo "  --tunnel-through-iap          Use IAP tunnel for gcloud ssh/scp"
    echo ""
    echo "Deployment options:"
    echo "  --remote-dir PATH             Remote deploy dir (default: /opt/kj-inventory)"
    echo "  --compose-file PATH           Local compose file (default: docker-compose.vm.yml)"
    echo "  --env-file PATH               Local env file (default: .env.production)"
    echo "  --compose-project-name NAME   Compose project name (default: kj-inventory)"
    echo "  --registry-auth none|gcloud   Remote image auth mode (default: none)"
    echo "  --registry-host HOST          Registry host for remote docker auth"
    echo ""
    echo "Actions:"
    echo "  --bootstrap                   Install Docker/Compose and create directories"
    echo "  --deploy                      Bootstrap remote host, upload, migrate, start"
    echo "  --ssh                         Open an interactive shell on the VM"
    echo "  --logs                        Follow docker compose logs on the VM"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --transport)
            TRANSPORT="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --user)
            USER_NAME="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --identity-file)
            IDENTITY_FILE="$2"
            shift 2
            ;;
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --zone)
            ZONE="$2"
            shift 2
            ;;
        --instance)
            INSTANCE_NAME="$2"
            shift 2
            ;;
        --tunnel-through-iap)
            TUNNEL_THROUGH_IAP="true"
            shift
            ;;
        --remote-dir)
            REMOTE_DIR="$2"
            shift 2
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --compose-project-name)
            COMPOSE_PROJECT_NAME="$2"
            shift 2
            ;;
        --registry-auth)
            REGISTRY_AUTH_MODE="$2"
            shift 2
            ;;
        --registry-host)
            REGISTRY_HOST="$2"
            shift 2
            ;;
        --bootstrap)
            ACTION="bootstrap"
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
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

resolve_local_path() {
    local candidate="$1"
    if [ -f "${candidate}" ]; then
        printf '%s\n' "${candidate}"
        return 0
    fi
    if [ -f "${SCRIPT_DIR}/${candidate}" ]; then
        printf '%s\n' "${SCRIPT_DIR}/${candidate}"
        return 0
    fi
    return 1
}

require_transport_args() {
    case "${TRANSPORT}" in
        ssh)
            if [ -z "${HOST}" ]; then
                log_error "--host is required for ssh transport"
                exit 1
            fi
            if [ -z "${USER_NAME}" ]; then
                log_error "--user is required for ssh transport"
                exit 1
            fi
            ;;
        gcloud)
            if [ -z "${PROJECT_ID}" ] || [ -z "${ZONE}" ] || [ -z "${INSTANCE_NAME}" ]; then
                log_error "--project, --zone, and --instance are required for gcloud transport"
                exit 1
            fi
            ;;
        *)
            log_error "Unsupported transport: ${TRANSPORT}"
            exit 1
            ;;
    esac
}

require_deploy_files() {
    COMPOSE_SOURCE="$(resolve_local_path "${COMPOSE_FILE}")" || {
        log_error "Compose file not found: ${COMPOSE_FILE}"
        exit 1
    }

    ENV_SOURCE="$(resolve_local_path "${ENV_FILE}")" || {
        log_error "Env file not found: ${ENV_FILE}"
        exit 1
    }
}

remote_target() {
    case "${TRANSPORT}" in
        ssh)
            printf '%s@%s\n' "${USER_NAME}" "${HOST}"
            ;;
        gcloud)
            if [ -n "${USER_NAME}" ]; then
                printf '%s@%s\n' "${USER_NAME}" "${INSTANCE_NAME}"
            else
                printf '%s\n' "${INSTANCE_NAME}"
            fi
            ;;
    esac
}

run_remote_command() {
    local command="$1"
    case "${TRANSPORT}" in
        ssh)
            local cmd=(ssh -p "${PORT}")
            if [ -n "${IDENTITY_FILE}" ]; then
                cmd+=(-i "${IDENTITY_FILE}")
            fi
            cmd+=("$(remote_target)" "${command}")
            "${cmd[@]}"
            ;;
        gcloud)
            local cmd=(gcloud compute ssh "$(remote_target)" --zone "${ZONE}" --project "${PROJECT_ID}")
            if [ "${TUNNEL_THROUGH_IAP}" = "true" ]; then
                cmd+=(--tunnel-through-iap)
            fi
            cmd+=(--command "${command}")
            "${cmd[@]}"
            ;;
    esac
}

copy_to_remote() {
    local source_file="$1"
    local destination_path="$2"
    case "${TRANSPORT}" in
        ssh)
            local cmd=(scp -P "${PORT}")
            if [ -n "${IDENTITY_FILE}" ]; then
                cmd+=(-i "${IDENTITY_FILE}")
            fi
            cmd+=("${source_file}" "$(remote_target):${destination_path}")
            "${cmd[@]}"
            ;;
        gcloud)
            local cmd=(gcloud compute scp "${source_file}" "$(remote_target):${destination_path}" --zone "${ZONE}" --project "${PROJECT_ID}")
            if [ "${TUNNEL_THROUGH_IAP}" = "true" ]; then
                cmd+=(--tunnel-through-iap)
            fi
            "${cmd[@]}"
            ;;
    esac
}

open_remote_shell() {
    case "${TRANSPORT}" in
        ssh)
            local cmd=(ssh -p "${PORT}")
            if [ -n "${IDENTITY_FILE}" ]; then
                cmd+=(-i "${IDENTITY_FILE}")
            fi
            cmd+=("$(remote_target)")
            "${cmd[@]}"
            ;;
        gcloud)
            local cmd=(gcloud compute ssh "$(remote_target)" --zone "${ZONE}" --project "${PROJECT_ID}")
            if [ "${TUNNEL_THROUGH_IAP}" = "true" ]; then
                cmd+=(--tunnel-through-iap)
            fi
            "${cmd[@]}"
            ;;
    esac
}

create_systemd_service() {
    local output_file="$1"
    cat > "${output_file}" <<EOF
[Unit]
Description=KJ Inventory Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${REMOTE_DIR}
Environment=COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}
ExecStartPre=/usr/bin/docker compose pull
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
EOF
}

create_remote_bootstrap_script() {
    local output_file="$1"
    cat > "${output_file}" <<EOF
#!/bin/bash
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR}"
REGISTRY_AUTH_MODE="${REGISTRY_AUTH_MODE}"
REGISTRY_HOST="${REGISTRY_HOST}"

install_package_if_missing() {
    local binary_name="\$1"
    local package_name="\$2"
    if command -v "\${binary_name}" >/dev/null 2>&1; then
        return 0
    fi

    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y "\${package_name}"
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y "\${package_name}"
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y "\${package_name}"
    else
        echo "Unable to install \${package_name}; no supported package manager found." >&2
        exit 1
    fi
}

install_package_if_missing curl curl

if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
fi

sudo systemctl enable docker
sudo systemctl start docker

if ! sudo docker compose version >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y docker-compose-plugin
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y docker-compose-plugin
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y docker-compose-plugin
    else
        echo "Unable to install docker-compose-plugin automatically." >&2
        exit 1
    fi
fi

sudo mkdir -p "\${REMOTE_DIR}/logs" "\${REMOTE_DIR}/scraper/bootstrap"
sudo chmod -R 755 "\${REMOTE_DIR}"

if [ "\${REGISTRY_AUTH_MODE}" = "gcloud" ] && [ -n "\${REGISTRY_HOST}" ]; then
    if command -v gcloud >/dev/null 2>&1; then
        sudo gcloud auth configure-docker "\${REGISTRY_HOST}" --quiet || true
    else
        echo "WARNING: gcloud is not installed on the remote host; skipping docker auth for \${REGISTRY_HOST}." >&2
    fi
fi

echo "Remote bootstrap completed."
EOF
}

create_remote_install_script() {
    local output_file="$1"
    cat > "${output_file}" <<EOF
#!/bin/bash
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}"
REGISTRY_AUTH_MODE="${REGISTRY_AUTH_MODE}"
REGISTRY_HOST="${REGISTRY_HOST}"
SERVICE_NAME="kj-inventory"
DEPLOY_ARCHIVE="/tmp/kj-inventory-deploy.tar.gz"
LEGACY_SCRAPER_DATA_DIR="\${REMOTE_DIR}/scraper/data"
SCRAPER_BOOTSTRAP_DIR="\${REMOTE_DIR}/scraper/bootstrap"
SCRAPER_VOLUME_NAME="\${COMPOSE_PROJECT_NAME}_scraper-data"

sudo mkdir -p "\${REMOTE_DIR}"
sudo tar -xzf "\${DEPLOY_ARCHIVE}" -C "\${REMOTE_DIR}"
sudo rm -f "\${DEPLOY_ARCHIVE}"

cd "\${REMOTE_DIR}"
export COMPOSE_PROJECT_NAME="\${COMPOSE_PROJECT_NAME}"

sudo mkdir -p scraper/bootstrap
if [ -f scraper/bootstrap/session.json ]; then
    sudo chown 1001:1001 scraper/bootstrap/session.json
    sudo chmod 600 scraper/bootstrap/session.json
fi

if [ "\${REGISTRY_AUTH_MODE}" = "gcloud" ] && [ -n "\${REGISTRY_HOST}" ]; then
    if command -v gcloud >/dev/null 2>&1; then
        sudo gcloud auth configure-docker "\${REGISTRY_HOST}" --quiet || true
    else
        echo "WARNING: gcloud is not installed on the remote host; skipping docker auth for \${REGISTRY_HOST}." >&2
    fi
fi

sudo cp kj-inventory.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "\${SERVICE_NAME}"

echo "Pulling latest images..."
sudo docker compose pull

echo "Running database migrations..."
sudo docker compose run --rm \
    app \
    /usr/local/bin/migrate \
    -path /app/migrations/sqlite \
    -database "sqlite3:///app/data/inventory.db?_fk=1" \
    up

echo "Preparing scraper data volume..."
sudo docker volume create "\${SCRAPER_VOLUME_NAME}" >/dev/null
SCRAPER_VOLUME_EMPTY=\$(sudo docker run --rm \
    -v "\${SCRAPER_VOLUME_NAME}:/target" \
    alpine \
    sh -c 'if [ -z "\$(ls -A /target 2>/dev/null)" ]; then echo yes; else echo no; fi')

if [ "\${SCRAPER_VOLUME_EMPTY}" = "yes" ]; then
    LEGACY_SCRAPER_DATA_EXISTS="no"
    if [ -d "\${LEGACY_SCRAPER_DATA_DIR}" ]; then
        LEGACY_SCRAPER_DATA_EXISTS=\$(sudo docker run --rm \
            -v "\${LEGACY_SCRAPER_DATA_DIR}:/source" \
            alpine \
            sh -c 'if [ -n "\$(ls -A /source 2>/dev/null)" ]; then echo yes; else echo no; fi')
    fi

    if [ "\${LEGACY_SCRAPER_DATA_EXISTS}" = "yes" ]; then
        echo "Migrating existing scraper data into named volume..."
        sudo docker run --rm \
            -v "\${SCRAPER_VOLUME_NAME}:/target" \
            -v "\${LEGACY_SCRAPER_DATA_DIR}:/source" \
            alpine \
            sh -c 'cp -a /source/. /target/'
    elif [ -f "\${SCRAPER_BOOTSTRAP_DIR}/session.json" ]; then
        echo "Seeding scraper session into named volume..."
        sudo docker run --rm \
            -v "\${SCRAPER_VOLUME_NAME}:/target" \
            -v "\${SCRAPER_BOOTSTRAP_DIR}:/source" \
            alpine \
            sh -c 'cp /source/session.json /target/session.json'
    else
        echo "No existing scraper session data found to seed."
    fi
fi

sudo rm -f "\${SCRAPER_BOOTSTRAP_DIR}/session.json"

sudo systemctl restart "\${SERVICE_NAME}"
echo "Waiting for services to start..."
sleep 15
sudo docker compose ps
echo ""
echo "Recent logs:"
sudo docker compose logs --tail=10

echo "Cleaning up old Docker images..."
sudo docker image prune -f > /dev/null 2>&1 || true
sudo docker image prune -a -f > /dev/null 2>&1 || true
echo "Cleanup completed"
EOF
}

package_deployment() {
    require_deploy_files

    DEPLOY_WORKDIR="$(mktemp -d)"
    trap 'rm -rf "${DEPLOY_WORKDIR}"' EXIT

    cp "${COMPOSE_SOURCE}" "${DEPLOY_WORKDIR}/docker-compose.yml"
    cp "${ENV_SOURCE}" "${DEPLOY_WORKDIR}/.env"

    mkdir -p "${DEPLOY_WORKDIR}/scraper/bootstrap"
    if [ -f "${SCRIPT_DIR}/scraper/data/session.json" ]; then
        cp "${SCRIPT_DIR}/scraper/data/session.json" "${DEPLOY_WORKDIR}/scraper/bootstrap/"
        log_success "Found local scraper session.json, including it as bootstrap data"
    else
        log_warning "No local scraper session.json found; scraper may require login on first start"
    fi

    create_systemd_service "${DEPLOY_WORKDIR}/kj-inventory.service"

    DEPLOY_TARBALL="${DEPLOY_WORKDIR}/deploy.tar.gz"
    tar -czf "${DEPLOY_TARBALL}" -C "${DEPLOY_WORKDIR}" \
        docker-compose.yml .env scraper kj-inventory.service

    create_remote_install_script "${DEPLOY_WORKDIR}/remote-install.sh"
    chmod +x "${DEPLOY_WORKDIR}/remote-install.sh"

    create_remote_bootstrap_script "${DEPLOY_WORKDIR}/remote-bootstrap.sh"
    chmod +x "${DEPLOY_WORKDIR}/remote-bootstrap.sh"
}

bootstrap_remote() {
    local bootstrap_script=""
    local temp_dir=""
    if [ -n "${DEPLOY_WORKDIR:-}" ] && [ -f "${DEPLOY_WORKDIR}/remote-bootstrap.sh" ]; then
        bootstrap_script="${DEPLOY_WORKDIR}/remote-bootstrap.sh"
    else
        temp_dir="$(mktemp -d)"
        create_remote_bootstrap_script "${temp_dir}/remote-bootstrap.sh"
        chmod +x "${temp_dir}/remote-bootstrap.sh"
        bootstrap_script="${temp_dir}/remote-bootstrap.sh"
    fi

    log_info "Bootstrapping remote host..."
    copy_to_remote "${bootstrap_script}" "/tmp/kj-inventory-bootstrap.sh"
    run_remote_command "bash /tmp/kj-inventory-bootstrap.sh && rm -f /tmp/kj-inventory-bootstrap.sh"
    if [ -n "${temp_dir}" ]; then
        rm -rf "${temp_dir}"
    fi
    log_success "Remote bootstrap completed"
}

deploy_to_remote() {
    package_deployment
    bootstrap_remote

    log_info "Uploading deployment package..."
    copy_to_remote "${DEPLOY_TARBALL}" "/tmp/kj-inventory-deploy.tar.gz"
    copy_to_remote "${DEPLOY_WORKDIR}/remote-install.sh" "/tmp/kj-inventory-install.sh"

    log_info "Running remote installation..."
    run_remote_command "bash /tmp/kj-inventory-install.sh && rm -f /tmp/kj-inventory-install.sh"
    log_success "Deployment completed successfully"
}

stream_logs() {
    run_remote_command "sudo docker compose -f '${REMOTE_DIR}/docker-compose.yml' logs -f --tail=100"
}

main() {
    if [ -z "${ACTION}" ]; then
        usage
    fi

    require_transport_args

    case "${ACTION}" in
        bootstrap)
            bootstrap_remote
            ;;
        deploy)
            deploy_to_remote
            ;;
        ssh)
            open_remote_shell
            ;;
        logs)
            stream_logs
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
