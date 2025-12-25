#!/bin/bash

# --- DUCC Deployment Script ---

# Load credentials from .env.deploy
if [ -f .env.deploy ]; then
    export $(grep -v '^#' .env.deploy | xargs)
else
    echo "Error: .env.deploy file not found."
    exit 1
fi

if [ -z "$DROPLET_IP" ] || [ -z "$DROPLET_PASSWORD" ]; then
    echo "Error: DROPLET_IP or DROPLET_PASSWORD not set in .env.deploy."
    exit 1
fi

echo "--- Starting Deployment to $DROPLET_IP ---"

# 1. Push latest changes to GitHub
echo "[1/3] Pushing changes to GitHub..."
git push origin main

# 2. Update remote server
echo "[2/3] Updating remote server (git pull & docker build)..."
export SSHPASS="$DROPLET_PASSWORD"
sshpass -e ssh -o StrictHostKeyChecking=no root@"$DROPLET_IP" "cd DUCC-Website && git pull && docker compose up -d --build"

# 3. Success
echo "[3/3] Deployment complete! Site live at http://$DROPLET_IP"
