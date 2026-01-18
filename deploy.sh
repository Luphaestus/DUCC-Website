#!/bin/bash

# --- DUCC Deployment Script ---

# Default values
MODE="prod"
CLEAR_DB=false
SHOW_LOGS=false

# Function to display help
show_help() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev, -d      Deploy in development mode (NODE_ENV=dev). Seeds the database with test data."
    echo "  --clear, -c    Remove the existing database (data/database.db) before deploying."
    echo "  --logs, -l     Skip deployment and show real-time logs from the remote server."
    echo "  --help, -h     Show this help message and exit."
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh --dev --clear"
    echo "  ./deploy.sh -dc  (same as above)"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dev)
            MODE="dev"
            shift
            ;;
        --clear)
            CLEAR_DB=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --help)
            show_help
            ;;
        -*)
            # Handle short flags (can be combined, e.g., -dcl)
            for (( i=1; i<${#1}; i++ )); do
                char="${1:$i:1}"
                case "$char" in
                    d) MODE="dev" ;;
                    c) CLEAR_DB=true ;;
                    l) SHOW_LOGS=true ;;
                    h) show_help ;;
                    *)
                        echo "Unknown option: -$char"
                        echo "Use --help for usage information."
                        exit 1
                        ;;
                esac
            done
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Load credentials from .env.deploy
if [ -f .env.deploy ]; then
    export $(grep -v '^#' .env.deploy | xargs)
else
    echo "Error: .env.deploy file not found."
    exit 1
fi

if [ -z "$SERVER_IP" ] || [ -z "$SERVER_PASSWORD" ]; then
    echo "Error: SERVER_IP or SERVER_PASSWORD not set in .env.deploy."
    exit 1
fi

export SSHPASS="$SERVER_PASSWORD"

# --logs: Just show logs
if [ "$SHOW_LOGS" = true ]; then
    echo "--- Showing logs from $SERVER_IP ---"
    # We use -f to follow logs. User can Ctrl+C to exit.
    sshpass -e ssh -T -o StrictHostKeyChecking=no root@"$SERVER_IP" "cd DUCC-Website && docker compose logs -f"
    exit 0
fi

echo "--- Starting Deployment to $SERVER_IP ($MODE mode) ---"

# Push latest changes to GitHub
echo "[1/3] Pushing changes to GitHub..."
git push origin main

# 2. Update remote server
echo "[2/3] Updating remote server..."

# Construct the remote command
# We use a subshell or chained commands. 
# 1. Fetch and Reset Git (Forces remote to match origin, discarding local changes)
REMOTE_CMD="cd DUCC-Website && git fetch --all && git reset --hard origin/main"

# 2. Clear DB if requested
if [ "$CLEAR_DB" = true ]; then
    echo "       [INFO] Database will be cleared."
    REMOTE_CMD="$REMOTE_CMD && rm -rf data/"
fi

# 3. Build Docker Images (Verbose output to avoid 'stuck' appearance)
DOMAIN_VAL="${DOMAIN_NAME:-$SERVER_IP.sslip.io}"
REMOTE_CMD="$REMOTE_CMD && DOMAIN_NAME=$DOMAIN_VAL docker compose build --progress=plain"

# 4. Run Application
if [ "$MODE" = "dev" ]; then
    echo "       [INFO] Running in DEVELOPMENT mode."
    # Export APP_CMD for dev mode
    REMOTE_CMD="$REMOTE_CMD && export APP_CMD='export NODE_ENV=dev && npm run db:init && node server/server.js'"
else
    echo "       [INFO] Running in PRODUCTION mode."
    # Unset APP_CMD to use default
    REMOTE_CMD="$REMOTE_CMD && unset APP_CMD"
fi

REMOTE_CMD="$REMOTE_CMD && DOMAIN_NAME=$DOMAIN_VAL docker compose up -d --force-recreate --remove-orphans"

# Execute
sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "$REMOTE_CMD"

# 3. Success
echo "[3/3] Deployment complete! Site live at https://${DOMAIN_VAL} (or http://$SERVER_IP if SSL pending/invalid)"

if [ "$CLEAR_DB" = true ]; then
    echo ""
    echo "IMPORTANT: Database was cleared. Run './deploy.sh --logs' to see the new Admin password."
fi