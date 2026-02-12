#!/bin/bash

# --- DUCC Deployment Script ---

MODE="prod"
CLEAR_DB=false
SHOW_LOGS=false
PUSH_DATA=false
PULL_DATA=false
OPEN_SSH=false

show_help() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev, -d        Deploy in development mode (NODE_ENV=dev). Seeds the database with test data."
    echo "  --clear, -c      Remove the existing database (data/database.db) before deploying."
    echo "  --logs, -l       Skip deployment and show real-time logs from the remote server."
    echo "  --ssh, -s        Skip deployment and open an interactive SSH session to the remote server."
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
        --ssh)
            OPEN_SSH=true
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
                    s) OPEN_SSH=true ;;
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

# Check for sshpass
if ! command -v sshpass &> /dev/null; then
    echo "Error: 'sshpass' is not installed. Please install it (e.g., 'brew install sshpass' or 'sudo apt install sshpass')."
    exit 1
fi

export SSHPASS="$SERVER_PASSWORD"

if [ "$SHOW_LOGS" = true ]; then
    echo "--- Showing logs from $SERVER_IP ---"
    sshpass -e ssh -T -o StrictHostKeyChecking=no root@"$SERVER_IP" "cd DUCC-Website && docker compose logs -f"
    exit 0
fi

if [ "$OPEN_SSH" = true ]; then
    echo "--- Opening SSH session to $SERVER_IP ---"
    sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP"
    exit 0
fi

echo "--- Starting Deployment to $SERVER_IP ($MODE mode) ---"

if [ "$PULL_DATA" = true ]; then
    echo "[DATA] Pulling remote data to local 'data/' folder..."
    mkdir -p data
    sshpass -e rsync -avz -e "ssh -o StrictHostKeyChecking=no" root@"$SERVER_IP":DUCC-Website/data/ data/
fi

echo "[1/3] Pushing changes to GitHub..."
git add .
git commit -m "Deployment update: $(date)"
git push origin main

echo "[2/3] Updating remote server..."

REMOTE_PRE_CMD="mkdir -p DUCC-Website && cd DUCC-Website && git config --global --add safe.directory /root/DUCC-Website && (git init && git remote add origin https://github.com/Luphaestus/DUCC-Website.git || true) && (git fetch --all || echo 'Git fetch failed, continuing...') && (git reset --hard origin/main || echo 'Git reset failed, continuing...') && find . -name '._*' -delete && find . -name '.__*' -delete"

if [ "$CLEAR_DB" = true ]; then
    echo "       [INFO] Remote database will be cleared."
    REMOTE_PRE_CMD="$REMOTE_PRE_CMD && rm -rf data/"
fi

sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "$REMOTE_PRE_CMD"

export DOMAIN_NAME="${DOMAIN_NAME:-$SERVER_IP.sslip.io}"
DOMAIN_VAL="$DOMAIN_NAME"

# Upload .env file if it exists
if [ -f .env ]; then
    echo "       [INFO] Pushing .env file to remote server..."
    sshpass -e scp -o StrictHostKeyChecking=no .env root@"$SERVER_IP":DUCC-Website/.env
    # Append dynamic deployment variables to the remote .env
    sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "printf '\nDOMAIN_NAME=%s\nNODE_ENV=%s\nSERVER_IP=%s\n' '$DOMAIN_VAL' '$MODE' '$SERVER_IP' >> DUCC-Website/.env"
    sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "chmod 600 DUCC-Website/.env"
fi

if [ "$PUSH_DATA" = true ]; then
    echo "[DATA] Pushing local data to remote 'data/' folder..."
    sshpass -e rsync -avz -e "ssh -o StrictHostKeyChecking=no" data/ root@"$SERVER_IP":DUCC-Website/data/
fi

BUILD_ID=$(date +%s)

REMOTE_SCRIPT="export DOMAIN_NAME='$DOMAIN_VAL' && export NODE_ENV='$MODE' && export SERVER_IP='$SERVER_IP' && cd DUCC-Website && docker compose build --build-arg BUILD_ID=$BUILD_ID --progress=plain"

if [ "$MODE" = "dev" ]; then
    echo "       [INFO] Running in DEVELOPMENT mode."
    # In dev mode we still want to seed if requested, but we'll let the app handle normal start
    REMOTE_SCRIPT="$REMOTE_SCRIPT && docker compose run --rm app npm run db:init -- dev --seed"
fi

REMOTE_SCRIPT="$REMOTE_SCRIPT && docker compose up -d --force-recreate --remove-orphans"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Container Status ---' && docker compose ps"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Waiting for Startup ---' && sleep 10"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Recent Logs ---' && docker compose logs app --tail=20"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Local Health Check ---' && curl -s -I http://localhost:3000/api/health || echo 'Health check failed'"

sshpass -e ssh -o StrictHostKeyChecking=no root@"$SERVER_IP" "$REMOTE_SCRIPT"

echo "[3/3] Deployment complete! Site live at https://${DOMAIN_VAL}"
echo "      (Note: If you get a DNS error, try http://$SERVER_IP directly)"
echo ""
echo "Troubleshooting:"
echo " - If the site is not loading, check logs: ./deploy.sh --logs"
echo " - To check Caddy logs specifically: ssh root@$SERVER_IP 'cd DUCC-Website && docker compose logs caddy'"
echo " - Ensure ports 80 and 443 are open on your server firewall."

if [ "$CLEAR_DB" = true ]; then
    echo ""
    echo "IMPORTANT: Database was cleared. Run './deploy.sh --logs' to see the new Admin password."
fi
