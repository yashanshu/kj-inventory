# KJ Inventory - Deployment Guide

Complete guide for deploying KJ Inventory to production using Docker and GitHub Actions CI/CD.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Server Setup](#server-setup)
4. [GitHub Configuration](#github-configuration)
5. [First Deployment](#first-deployment)
6. [Monitoring](#monitoring)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Future Improvements](#future-improvements)

---

## Overview

### Deployment Architecture

```
GitHub Repository (Push to master)
         ↓
GitHub Actions CI/CD
    ├─ Build Docker Image
    ├─ Run Tests
    ├─ Push to ghcr.io
    └─ Deploy via SSH
         ↓
Production Server
    ├─ Pull Latest Image
    ├─ Backup Database
    ├─ Run Migrations
    ├─ Deploy with docker-compose
    └─ Health Check
```

### Technology Stack

- **Container Platform**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Container Registry**: GitHub Container Registry (ghcr.io)
- **Database**: SQLite (upgradeable to PostgreSQL)
- **Web Server**: Built-in Go server (port 8080)

---

## Prerequisites

### Server Requirements

**Minimum Specifications:**
- OS: Ubuntu 20.04+ or Debian 11+
- CPU: 1 core
- RAM: 1GB (2GB recommended)
- Disk: 10GB available
- Network: Public IP address
- Ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (App)

**Recommended Specifications:**
- CPU: 2 cores
- RAM: 2-4GB
- Disk: 20GB SSD

### Required Software

- Git
- Docker 20.10+
- Docker Compose v2
- SSH access with sudo privileges

### Local Requirements

- SSH client
- Git
- GitHub account with repository access

---

## Server Setup

### Step 1: Initial Server Configuration

Run the automated setup script on your server:

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/yashanshu/kj-inventory/master/scripts/server-setup.sh | sudo bash

# Or if you have the repo cloned:
sudo bash scripts/server-setup.sh
```

This script will:
- ✅ Install Docker and Docker Compose
- ✅ Create deployment user (`kjinventory`)
- ✅ Set up project directory (`/opt/kj-inventory`)
- ✅ Configure firewall (UFW)
- ✅ Create environment template
- ✅ Set up log rotation

### Step 1.1: Verify application directories

The server setup script already creates `/opt/kj-inventory/data` and `/opt/kj-inventory/logs`.  
If you created the directories manually, just make sure they exist and are readable by the `kjinventory` user:

```bash
sudo chown -R kjinventory:kjinventory /opt/kj-inventory
sudo find /opt/kj-inventory -type d -exec chmod 755 {} \;
```

The container now initializes its own permissions during startup, so no additional UID/GID alignment is required.

### Step 2: Generate SSH Keys (Local Machine)

On your local machine, generate SSH keys for GitHub Actions:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-kj-inventory" -f ~/.ssh/github_actions_kj

# This creates:
# - ~/.ssh/github_actions_kj (private key - for GitHub Secrets)
# - ~/.ssh/github_actions_kj.pub (public key - for server)
```

### Step 3: Add SSH Key to Server

Copy the public key to your server:

```bash
# View your public key
cat ~/.ssh/github_actions_kj.pub

# Add to server (replace SERVER_IP with your server IP)
ssh root@SERVER_IP

# Switch to deployment user and add key
su - kjinventory
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

### Step 4: Configure Environment Variables on Server

Edit the production environment file on the server:

```bash
# SSH into server
ssh kjinventory@YOUR_SERVER_IP

# Edit environment file
cd /opt/kj-inventory
nano .env.production
```

Update the following variables:

```bash
# Generate a strong JWT secret (run this on your local machine):
# openssl rand -base64 32

JWT_SECRET=your_strong_random_secret_here_at_least_32_characters

# Update with your domain (if using reverse proxy)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Change if another service already uses 8080 on the host
APP_HOST_PORT=8080

# Optional: PostgreSQL (if migrating from SQLite)
# POSTGRES_DB=inventory
# POSTGRES_USER=inventory_user
# POSTGRES_PASSWORD=strong_password_here
```

Save and exit (Ctrl+X, then Y, then Enter).

> **Tip:** If port `8080` is already used on your server (for example by another service or an old container), update `APP_HOST_PORT` to a free port and open that port in your firewall.

### Step 5: Prepare the deployment directory

Create the deployment directory structure (the GitHub Actions workflow will upload the latest `docker-compose.prod.yml` and `scripts/deploy.sh` on every run):

```bash
ssh kjinventory@YOUR_SERVER_IP
mkdir -p /opt/kj-inventory/scripts
mkdir -p /opt/kj-inventory/data/backups
mkdir -p /opt/kj-inventory/logs
chown -R kjinventory:kjinventory /opt/kj-inventory
```

> No Git repository is required on the server—the CI/CD pipeline keeps the compose file and deployment script up to date via SCP before each deployment.

---

## GitHub Configuration

### Step 1: Configure Repository Secrets

Go to your GitHub repository settings: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Click "New repository secret" and add the following:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SERVER_HOST` | `YOUR_SERVER_IP` | Your server's IP address or domain |
| `SERVER_USER` | `kjinventory` | Deployment user created by setup script |
| `SERVER_PORT` | `22` | SSH port (optional, defaults to 22) |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/github_actions_kj` | Private SSH key for deployment |
| `JWT_SECRET` | Same as in .env.production | JWT secret for the application |

**To add SSH_PRIVATE_KEY:**

```bash
# View your private key
cat ~/.ssh/github_actions_kj

# Copy the ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...content...
# -----END OPENSSH PRIVATE KEY-----
```

### Step 2: Enable GitHub Container Registry

Follow GitHub's container registry authentication guide (<https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-to-the-container-registry>), then make sure the repository is configured accordingly:

1. In your repository, go to **Settings → Actions → General** and under **Workflow permissions** choose **Read and write permissions**, then check **Allow GitHub Actions to create and approve pull requests**. This grants the default `GITHUB_TOKEN` the scopes required to push to `ghcr.io`.
2. In the same **Settings** area (or at the organization level if this is an org repo), enable **Allow GitHub Actions to create and publish GitHub Packages**. Without this, the workflow run will fail with `installation not allowed to Create organization package`.
3. Confirm the workflow file (`.github/workflows/deploy.yml`) contains:

   ```yaml
   permissions:
     contents: read
     packages: write
   ```

   These permissions align with GitHub’s guidance and unlock Docker pushes that use the workflow’s `GITHUB_TOKEN`.

4. For manual `docker push` or troubleshooting outside Actions, create a classic PAT with at least `write:packages` scope (and enable SSO if required), then authenticate locally:

   ```bash
   echo $GHCR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

After the first successful deployment GitHub will create the registry entry. You can then manage visibility at:

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/pkgs/container/YOUR_REPO`
2. Change visibility to "Public" (recommended) or configure access tokens for private access

---

## First Deployment

### Option 1: Automatic Deployment (Recommended)

Simply push to the master branch:

```bash
git add .
git commit -m "Setup CI/CD"
git push origin master
```

GitHub Actions will automatically:
1. Run backend Go tests and the frontend Vitest suite
2. Build Docker image
3. Push to registry
4. Deploy to server
5. Run health checks

If any test fails, the deployment job is skipped until the issue is resolved and the tests pass again.
Monitor progress at: `https://github.com/yashanshu/kj-inventory/actions`

### Option 2: Manual Trigger

1. Go to: `https://github.com/yashanshu/kj-inventory/actions`
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select branch (master)
5. Click "Run workflow"

### Option 3: Manual Deployment

SSH into your server and run:

```bash
ssh kjinventory@YOUR_SERVER_IP
cd /opt/kj-inventory

# Pull latest image manually
docker login ghcr.io -u YOUR_GITHUB_USERNAME
docker pull ghcr.io/yashanshu/kj-inventory:latest

# Run deployment script
./scripts/deploy.sh
```

### Verify Deployment

1. Check application health:
   ```bash
   curl http://YOUR_SERVER_IP:8080/health
   ```

2. Check Docker containers:
   ```bash
   docker ps
   ```

3. View logs:
   ```bash
   docker logs kj-inventory-app
   ```

4. Access application:
   ```
   http://YOUR_SERVER_IP:8080
   ```

---

## Monitoring

### View Logs

```bash
# Real-time logs (use 'docker compose' or 'docker-compose' based on your version)
docker compose -f /opt/kj-inventory/docker-compose.prod.yml logs -f

# Last 100 lines
docker compose -f /opt/kj-inventory/docker-compose.prod.yml logs --tail=100

# Specific service (use service name from compose, not container name)
docker compose -f /opt/kj-inventory/docker-compose.prod.yml logs app -f
```

### Check Container Status

```bash
# List running containers
docker ps

# Check container health (use compose service name)
docker compose -f /opt/kj-inventory/docker-compose.prod.yml ps

# View resource usage (find container ID from 'docker ps')
docker stats
```

### Database Backups

Backups are automatically created before each deployment in:
```
/opt/kj-inventory/data/backups/
```

View backups:
```bash
ls -lh /opt/kj-inventory/data/backups/
```

---

## Maintenance

### Update Application

Simply push changes to master branch, or manually trigger deployment.

### Manual Restart

```bash
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml restart
```

### Stop Application

```bash
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml down
```

### Start Application

```bash
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml up -d
```

### View Database

```bash
# Access SQLite database (find container ID with 'docker ps')
CONTAINER_ID=$(docker ps --filter "label=com.docker.compose.service=app" --format "{{.ID}}" | head -1)
docker exec -it $CONTAINER_ID sh
cd /app/data
sqlite3 inventory.db

# Example queries
SELECT COUNT(*) FROM items;
.tables
.exit
```

### Cleanup Old Images

```bash
# Remove unused Docker images
docker image prune -a

# Remove all stopped containers
docker container prune
```

### Database Backup (Manual)

```bash
# Create manual backup
cp /opt/kj-inventory/data/inventory.db \
   /opt/kj-inventory/data/backups/inventory.db.manual.$(date +%Y%m%d_%H%M%S).backup

# Compress backup
gzip /opt/kj-inventory/data/backups/inventory.db.manual.*.backup
```

---

## Troubleshooting

### Deployment Failed

**Check GitHub Actions logs:**
1. Go to: `https://github.com/yashanshu/kj-inventory/actions`
2. Click on failed workflow
3. Review error messages

**Common issues:**

**SSH Connection Failed:**
```bash
# Test SSH connection manually
ssh -i ~/.ssh/github_actions_kj kjinventory@YOUR_SERVER_IP

# Check server SSH logs
sudo tail -f /var/log/auth.log
```

**Docker Build Failed:**
```bash
# Test Docker build locally
docker build -t kj-inventory:test .
```

**Health Check Failed:**
```bash
# Check if port is accessible
curl http://YOUR_SERVER_IP:8080/health  # Replace 8080 if you changed APP_HOST_PORT

# Check container logs
docker logs kj-inventory-app

# Check if container is running
docker ps -a
```

**`address already in use` during `docker compose up`:**
```bash
# Find which process holds the port (replace 8080 if you changed APP_HOST_PORT)
sudo ss -ltnp | grep :8080 || sudo lsof -i :8080

# Stop or reconfigure the conflicting service, or change APP_HOST_PORT in /opt/kj-inventory/.env.production and re-run the deploy.
```

### Application Not Responding

```bash
# Check container status
docker ps -a

# Check container logs
docker logs kj-inventory-app --tail=100

# Check if port is bound
sudo ss -ltnp | grep :8080  # Replace 8080 if you changed APP_HOST_PORT

# Restart container
docker restart kj-inventory-app
```

### Database Errors

```bash
# Check database file exists
ls -la /opt/kj-inventory/data/inventory.db

# Check database integrity
docker exec kj-inventory-app sh -c "cd /app/data && sqlite3 inventory.db 'PRAGMA integrity_check;'"

# Check file permissions
ls -la /opt/kj-inventory/data/
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a --volumes

# Clean old backups
find /opt/kj-inventory/data/backups/ -name "*.backup.gz" -mtime +30 -delete
```

---

## Rollback Procedures

### Automatic Rollback

The deployment script automatically rolls back if health checks fail. It will:
1. Restore the previous Docker image version (tracked in `/opt/kj-inventory/data/.previous_image_tag`)
2. Restore the most recent database backup
3. Restart the application with the previous configuration

### Manual Rollback to Previous Version

```bash
# SSH into server
ssh kjinventory@YOUR_SERVER_IP
cd /opt/kj-inventory

# Stop current container
docker compose -f docker-compose.prod.yml down

# Restore database from backup
ls -lt data/backups/ | head -n 2  # Find latest backup
cp data/backups/inventory.db.XXXXXX.backup data/inventory.db

# Check the previous image tag
cat data/.previous_image_tag

# Set the previous image and start
DOCKER_IMAGE=$(cat data/.previous_image_tag) docker compose -f docker-compose.prod.yml up -d

# OR manually pull a specific version (replace SHA with commit)
docker pull ghcr.io/yashanshu/kj-inventory:master-abc1234
DOCKER_IMAGE=ghcr.io/yashanshu/kj-inventory:master-abc1234 docker compose -f docker-compose.prod.yml up -d
```

### Rollback Database Only

```bash
# Find backup to restore
ls -lt /opt/kj-inventory/data/backups/

# Stop application
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml down

# Restore backup
cp /opt/kj-inventory/data/backups/inventory.db.TIMESTAMP.backup \
   /opt/kj-inventory/data/inventory.db

# Start application
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml up -d
```

---

## Advanced Configuration

### Add HTTPS with Caddy (Recommended)

Add to `docker-compose.prod.yml`:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - kj-network

volumes:
  caddy_data:
  caddy_config:
```

Create `Caddyfile`:

```
yourdomain.com {
    reverse_proxy app:8080
}
```

### Migrate to PostgreSQL

1. Uncomment PostgreSQL service in `docker-compose.prod.yml`
2. Update environment variables
3. Run migration script (coming in Phase 1 - see ROADMAP.md)

### Enable Monitoring (Future)

Uncomment Prometheus and Grafana services in `docker-compose.prod.yml`.

---

## Security Best Practices

1. **Use strong secrets** - Generate random JWT secret with `openssl rand -base64 32`
2. **Keep secrets secure** - Never commit secrets to repository
3. **Update regularly** - Keep Docker, OS, and dependencies updated
4. **Use HTTPS** - Add reverse proxy with SSL (Caddy/Nginx)
5. **Restrict SSH** - Use key-based authentication only
6. **Firewall** - Only open necessary ports
7. **Backups** - Regularly backup database off-server
8. **Monitoring** - Set up uptime monitoring and alerts

---

## Support

- **Documentation**: Check other docs in `/docs` folder
- **Issues**: https://github.com/yashanshu/kj-inventory/issues
- **Roadmap**: See [ROADMAP.md](../ROADMAP.md)

---

## Future Improvements

The following are recommended long-term improvements to enhance the deployment infrastructure. These are not critical for current operations but will improve reliability, security, and observability as the application grows.

### High-Value Improvements

#### 1. Zero-Downtime Deployments
**Goal**: Eliminate service interruption during deployments
**Current**: Application stops briefly during `docker compose down/up`
**Solution**: Implement blue-green deployment or rolling updates
- Use Docker Swarm or Kubernetes for orchestration
- OR use multiple instances behind a load balancer
- OR implement health-aware deployment with overlap period

**Effort**: Medium | **Impact**: High for production traffic

#### 2. Centralized Logging
**Goal**: Better debugging and audit trails
**Current**: Logs only accessible via `docker logs` on server
**Solution**:
- Deploy Loki + Promtail for log aggregation
- OR use a managed service like Datadog, New Relic, or CloudWatch
- Configure log rotation and retention policies

**Effort**: Low-Medium | **Impact**: High for troubleshooting

#### 3. Application Monitoring & Metrics
**Goal**: Proactive issue detection and performance insights
**Current**: Only basic Docker health checks
**Solution**:
- Enable Prometheus + Grafana (already in docker-compose as comments)
- Add application-level metrics (request rates, error rates, latency)
- Set up uptime monitoring (UptimeRobot, StatusCake, etc.)
- Configure alerting for critical issues

**Effort**: Medium | **Impact**: High for production reliability

#### 4. Automated Testing in Production
**Goal**: Verify deployments beyond basic health checks
**Current**: Only `/health` endpoint check
**Solution**:
- Add smoke tests after deployment (login, create item, fetch data)
- Implement contract testing for API endpoints
- Add end-to-end tests in staging environment

**Effort**: Medium | **Impact**: Medium-High for catching regressions

### Security Enhancements

#### 5. Security Scanning
**Goal**: Detect vulnerabilities in dependencies and images
**Solution**:
- Add Trivy or Snyk scanning in CI/CD pipeline
- Scan Docker images before pushing to registry
- Regular dependency updates via Dependabot

**Effort**: Low | **Impact**: Medium for security posture

#### 6. Secrets Management
**Goal**: Better secret rotation and access control
**Current**: Secrets in GitHub Secrets and .env files
**Solution**:
- Use HashiCorp Vault or AWS Secrets Manager
- Implement automatic secret rotation
- Audit secret access

**Effort**: High | **Impact**: Medium for enterprises

### Infrastructure Improvements

#### 7. Database High Availability
**Goal**: Prevent data loss and improve performance
**Current**: Single SQLite file
**Solution**:
- Migrate to PostgreSQL (already prepared in docker-compose)
- Set up automated offsite backups (S3, Backblaze B2)
- Implement replication for read scaling

**Effort**: Medium-High | **Impact**: High for data safety

#### 8. CDN & Caching
**Goal**: Faster page loads and reduced server load
**Solution**:
- Add Cloudflare or similar CDN in front of application
- Implement Redis for session/data caching
- Enable browser caching headers

**Effort**: Low-Medium | **Impact**: Medium for user experience

#### 9. Infrastructure as Code
**Goal**: Reproducible and version-controlled infrastructure
**Current**: Manual server setup
**Solution**:
- Use Terraform or Pulumi for server provisioning
- Document infrastructure in code
- Enable easy disaster recovery

**Effort**: Medium-High | **Impact**: Medium for repeatability

### Development Workflow

#### 10. Staging Environment
**Goal**: Test changes before production
**Solution**:
- Set up separate staging server/environment
- Deploy automatically on PR creation
- Run full test suite in staging

**Effort**: Medium | **Impact**: High for confidence

#### 11. Feature Flags
**Goal**: Control feature rollout independently of deployments
**Solution**:
- Implement feature flag system (LaunchDarkly, Unleash, or custom)
- Enable gradual rollouts and A/B testing
- Quick feature disable without redeployment

**Effort**: Medium | **Impact**: Medium for flexibility

### Priority Recommendations

**Start with these 3 for maximum impact with minimal effort:**

1. **Application Monitoring** (Prometheus + Grafana) - Already prepared in docker-compose, just uncomment and configure
2. **Centralized Logging** (Loki + Promtail) - Easy to add, huge benefit for debugging
3. **Automated Offsite Backups** - Critical for data safety, low effort with cron + rclone

**Next tier when traffic grows:**

4. **PostgreSQL Migration** - Better performance and features
5. **Staging Environment** - Catch issues before production
6. **Zero-Downtime Deployments** - Essential for 24/7 operations

### Implementation Notes

- These improvements should be implemented incrementally based on actual needs
- Don't over-engineer for future scale - add complexity when it solves real problems
- Monitor the value/cost ratio - some improvements may not be worth it for smaller deployments
- Keep things simple and maintainable

For questions or suggestions on these improvements, open an issue in the repository.

---

**Last Updated**: 2025-10-29
**Version**: 1.1
**Status**: Production Ready
