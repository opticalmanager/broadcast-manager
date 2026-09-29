#!/bin/bash
# ==============================================================================
# Broadcast Manager - EC2 Deployment & Update Script
# ==============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "=================================================="
echo " Starting Broadcast Manager deployment on EC2..."
echo " Directory: $APP_DIR"
echo "=================================================="

# 1. Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
echo "Node.js version: $NODE_VERSION"
if [ "$NODE_VERSION" = "none" ]; then
    echo "Node.js is not installed. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 3. Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "WARNING: .env.local file not found!"
    echo "Please create .env.local before running the build step."
    exit 1
fi

echo "Installing project dependencies..."
npm install

echo "Building production Next.js application..."
npm run build

echo "Restarting application with PM2..."
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
pm2 save

echo "=================================================="
echo " Deployment Complete!"
echo " App running on port 3000 via PM2."
echo " Status check: pm2 status"
echo " Logs check:   pm2 logs broadcast-manager"
echo "=================================================="
