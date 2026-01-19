#!/bin/bash

# --- DUCC Deployment Script ---

MODE="prod"
CLEAR_DB=false
SHOW_LOGS=false
PUSH_DATA=false
PULL_DATA=false

show_help() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev, -d        Deploy in development mode (NODE_ENV=dev). Seeds the database with test data."
    echo "  --clear, -c      Remove the existing database (data/database.db) before deploying."
    echo "  --logs, -l       Skip deployment and show real-time logs from the remote server."
    echo "  --push-data      Copy local 'data/' folder to the remote server before deploying."
    echo "  --pull-data      Copy remote 'data/' folder to the local machine before deploying."
    echo "  --help, -h       Show this help message and exit."
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh --dev --clear"
    echo "  ./deploy.sh --pull-data"
    echo "  ./deploy.sh -dc  (same as above)"
    exit 0
}

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
        --push-data)
            PUSH_DATA=true
            shift
            ;;
        --pull-data)
            PULL_DATA=true
            shift
            ;;
        --help)
            show_help
            ;;
        -*)
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

if [ "$SHOW_LOGS" = true ]; then
    echo "--- Showing logs from $SERVER_IP ---"
    sshpass -e ssh -T -o StrictHostKeyChecking=no root@"$SERVER_IP" "cd DUCC-Website && docker compose logs -f"
    exit 0
fi

echo "--- Starting Deployment to $SERVER_IP ($MODE mode) ---"

if [ "$PULL_DATA" = true ]; then
    echo "[DATA] Pulling remote data to local 'data/' folder..."
    mkdir -p data
    sshpass -e rsync -avz -e "ssh -o StrictHostKeyChecking=no" root@"$SERVER_IP":DUCC-Website/data/ data/
fi

echo "[1/3] Pushing changes to GitHub..."
git push origin main

echo "[2/3] Updating remote server..."

REMOTE_PRE_CMD="cd DUCC-Website && git fetch --all && git reset --hard origin/main"

if [ "$CLEAR_DB" = true ]; then
    echo "       [INFO] Remote database will be cleared."
    REMOTE_PRE_CMD="$REMOTE_PRE_CMD && rm -rf data/"
fi

sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "$REMOTE_PRE_CMD"

if [ "$PUSH_DATA" = true ]; then
    echo "[DATA] Pushing local data to remote 'data/' folder..."
    sshpass -e rsync -avz -e "ssh -o StrictHostKeyChecking=no" data/ root@"$SERVER_IP":DUCC-Website/data/
fi

DOMAIN_VAL="${DOMAIN_NAME:-$SERVER_IP.sslip.io}"
REMOTE_POST_CMD="cd DUCC-Website && DOMAIN_NAME=$DOMAIN_VAL docker compose build --progress=plain"

if [ "$MODE" = "dev" ]; then
    echo "       [INFO] Running in DEVELOPMENT mode."
    REMOTE_POST_CMD="$REMOTE_POST_CMD && export APP_CMD='export NODE_ENV=dev && npm run db:init && node server/server.js'"
else
    echo "       [INFO] Running in PRODUCTION mode."
    REMOTE_POST_CMD="$REMOTE_POST_CMD && unset APP_CMD"
fi

REMOTE_POST_CMD="$REMOTE_POST_CMD && DOMAIN_NAME=$DOMAIN_VAL docker compose up -d --force-recreate --remove-orphans"

sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "$REMOTE_POST_CMD"

echo "[3/3] Deployment complete! Site live at https://${DOMAIN_VAL} (or http://$SERVER_IP if SSL pending/invalid)"

if [ "$CLEAR_DB" = true ]; then
    echo ""
    echo "IMPORTANT: Database was cleared. Run './deploy.sh --logs' to see the new Admin password."
fi