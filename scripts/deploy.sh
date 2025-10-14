#!/bin/bash
set -e

DEPLOY_HOST=${1:-localhost}
DEPLOY_USER=${2:-$(whoami)}
DEPLOY_PATH=${3:-/opt/inventory-management}

echo "🚀 Deploying to $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"

# Build first
./scripts/build.sh

# Create deployment archive
echo "📦 Creating deployment archive..."
tar -czf inventory-deployment.tar.gz -C dist .

# Deploy to server
echo "📤 Uploading to server..."
scp inventory-deployment.tar.gz $DEPLOY_USER@$DEPLOY_HOST:/tmp/

echo "🔧 Installing on server..."
ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
    # Stop existing service if running
    sudo systemctl stop inventory-management || true
    
    # Create deployment directory
    sudo mkdir -p $DEPLOY_PATH
    
    # Extract files
    cd $DEPLOY_PATH
    sudo tar -xzf /tmp/inventory-deployment.tar.gz
    
    # Set permissions
    sudo chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH
    sudo chmod +x inventory-server
    
    # Create data directory
    mkdir -p data
    
    # Install systemd service
    sudo tee /etc/systemd/system/inventory-management.service > /dev/null << 'SERVICE'
[Unit]
Description=Inventory Management System
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH
ExecStart=$DEPLOY_PATH/inventory-server
Restart=always
RestartSec=10
Environment=SERVER_PORT=8080
Environment=DATABASE_DRIVER=sqlite3
Environment=DATABASE_URL=$DEPLOY_PATH/data/inventory.db
Environment=LOG_LEVEL=info
Environment=SERVE_STATIC=true

[Install]
WantedBy=multi-user.target
SERVICE
    
    # Start service
    sudo systemctl daemon-reload
    sudo systemctl enable inventory-management
    sudo systemctl start inventory-management
    
    # Clean up
    rm /tmp/inventory-deployment.tar.gz
EOF

# Clean up local files
rm inventory-deployment.tar.gz

echo "✅ Deployment complete!"
echo ""
echo "🌐 Service should be available at: http://$DEPLOY_HOST:8080"
echo "📊 Check status with: ssh $DEPLOY_USER@$DEPLOY_HOST 'sudo systemctl status inventory-management'"
echo "📝 View logs with: ssh $DEPLOY_USER@$DEPLOY_HOST 'sudo journalctl -u inventory-management -f'"