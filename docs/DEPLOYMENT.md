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

# Optional: PostgreSQL (if migrating from SQLite)
# POSTGRES_DB=inventory
# POSTGRES_USER=inventory_user
# POSTGRES_PASSWORD=strong_password_here
```

Save and exit (Ctrl+X, then Y, then Enter).

### Step 5: Copy Deployment Files

Copy necessary files to the server:

```bash
# From your local machine
scp docker-compose.prod.yml kjinventory@YOUR_SERVER_IP:/opt/kj-inventory/
scp scripts/deploy.sh kjinventory@YOUR_SERVER_IP:/opt/kj-inventory/scripts/
chmod +x /opt/kj-inventory/scripts/deploy.sh
```

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
# Real-time logs
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f /opt/kj-inventory/docker-compose.prod.yml logs --tail=100

# Specific service
docker logs kj-inventory-app -f
```

### Check Container Status

```bash
# List running containers
docker ps

# Check container health
docker inspect kj-inventory-app | grep -A 10 Health

# View resource usage
docker stats kj-inventory-app
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
# Access SQLite database
docker exec -it kj-inventory-app sh
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
curl http://YOUR_SERVER_IP:8080/health

# Check container logs
docker logs kj-inventory-app

# Check if container is running
docker ps -a
```

### Application Not Responding

```bash
# Check container status
docker ps -a

# Check container logs
docker logs kj-inventory-app --tail=100

# Check if port is bound
netstat -tulpn | grep 8080

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

The deployment script automatically rolls back if health checks fail.

### Manual Rollback to Previous Version

```bash
# SSH into server
ssh kjinventory@YOUR_SERVER_IP
cd /opt/kj-inventory

# Stop current container
docker-compose -f docker-compose.prod.yml down

# Restore database from backup
ls -lt data/backups/ | head -n 2  # Find latest backup
cp data/backups/inventory.db.XXXXXX.backup data/inventory.db

# Pull specific image version (replace SHA with commit)
docker pull ghcr.io/yashanshu/kj-inventory:master-abc1234

# Update docker-compose to use specific image
# Edit docker-compose.prod.yml and change image tag

# Start application
docker-compose -f docker-compose.prod.yml up -d
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

**Last Updated**: 2025-10-27
**Version**: 1.0
**Status**: Production Ready
