#!/bin/bash

# --- DUCC Deployment Script ---

MODE="prod"
CLEAR_DB=false
SHOW_LOGS=false
PUSH_DATA=false
PULL_DATA=false
OPEN_SSH=false
FAST_DEPLOY=true

show_help() {
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev, -d        Deploy in development mode (NODE_ENV=dev). Seeds the database with test data."
    echo "  --clear, -c      Remove the existing database (data/database.db) before deploying."
    echo "  --fast, -f       Pre-compile assets locally and upload them (default behavior)."
    echo "  --remote-build, -r  Disable local pre-build and build assets on the server instead."
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
        --fast)
            FAST_DEPLOY=true
            shift
            ;;
        --remote-build)
            FAST_DEPLOY=false
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
                    f) FAST_DEPLOY=true ;;
                    r) FAST_DEPLOY=false ;;
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
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4"

if [ "$SHOW_LOGS" = true ]; then
    echo "--- Showing logs from $SERVER_IP ---"
    sshpass -e ssh -T $SSH_OPTS root@"$SERVER_IP" "cd DUCC-Website && docker compose logs -f"
    exit 0
fi

if [ "$OPEN_SSH" = true ]; then
    echo "--- Opening SSH session to $SERVER_IP ---"
    sshpass -e ssh $SSH_OPTS root@"$SERVER_IP"
    exit 0
fi

echo "--- Starting Deployment to $SERVER_IP ($MODE mode) ---"

if [ "$FAST_DEPLOY" = true ]; then
    echo "[0/3] Pre-compiling frontend assets locally..."
    npm run sass:build
    npm run build:client
fi

if [ "$PULL_DATA" = true ]; then
    echo "[DATA] Pulling remote data to local 'data/' folder..."
    mkdir -p data
    sshpass -e rsync -avz -e "ssh $SSH_OPTS" root@"$SERVER_IP":DUCC-Website/data/ data/
fi

echo "[1/3] Pushing changes to GitHub..."
git add .
if ! git diff --cached --quiet; then
    git commit -m "Deployment update: $(date)"
else
    echo "       [INFO] No local changes to commit."
fi
git push origin main

echo "[2/3] Updating remote server..."

REMOTE_PRE_CMD="mkdir -p DUCC-Website && cd DUCC-Website && git config --global --add safe.directory /root/DUCC-Website && git init && (git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/Luphaestus/DUCC-Website.git) && (git fetch --all || echo 'Git fetch failed, continuing...') && (git reset --hard origin/main || echo 'Git reset failed, continuing...') && find . -name '._*' -delete && find . -name '.__*' -delete"

if [ "$CLEAR_DB" = true ]; then
    echo "       [INFO] Remote database will be cleared."
    REMOTE_PRE_CMD="$REMOTE_PRE_CMD && rm -rf data/"
fi

echo "       [INFO] Connecting to remote and syncing repository..."
sshpass -e ssh $SSH_OPTS root@"$SERVER_IP" "$REMOTE_PRE_CMD"

if [ "$FAST_DEPLOY" = true ]; then
    echo "       [INFO] Uploading pre-compiled assets (dist + public/styles.css)..."
    sshpass -e rsync -avz --delete -e "ssh $SSH_OPTS" dist/ root@"$SERVER_IP":DUCC-Website/dist/
    sshpass -e rsync -avz -e "ssh $SSH_OPTS" public/styles.css root@"$SERVER_IP":DUCC-Website/public/styles.css
fi

export DOMAIN_NAME="${DOMAIN_NAME:-$SERVER_IP.sslip.io}"
DOMAIN_VAL="$DOMAIN_NAME"

# Upload .env file if it exists
if [ -f .env ]; then
    echo "       [INFO] Pushing .env file to remote server..."
    sshpass -e scp $SSH_OPTS .env root@"$SERVER_IP":DUCC-Website/.env
    # Append dynamic deployment variables to the remote .env
    sshpass -e ssh $SSH_OPTS root@"$SERVER_IP" "printf '\nDOMAIN_NAME=%s\nNODE_ENV=%s\nSERVER_IP=%s\n' '$DOMAIN_VAL' '$MODE' '$SERVER_IP' >> DUCC-Website/.env"
    sshpass -e ssh $SSH_OPTS root@"$SERVER_IP" "chmod 600 DUCC-Website/.env"
fi

if [ "$PUSH_DATA" = true ]; then
    echo "[DATA] Pushing local data to remote 'data/' folder..."
    sshpass -e rsync -avz -e "ssh $SSH_OPTS" data/ root@"$SERVER_IP":DUCC-Website/data/
fi

BUILD_ID=$(date +%s)

REMOTE_SCRIPT="export DOMAIN_NAME='$DOMAIN_VAL' && export NODE_ENV='$MODE' && export SERVER_IP='$SERVER_IP' && cd DUCC-Website && echo '--- Building containers (this can take several minutes during vite chunk rendering) ---' && docker compose --progress=plain build --build-arg BUILD_ID=$BUILD_ID"

if [ "$CLEAR_DB" = true ]; then
    echo "       [INFO] Running database reset."
    REMOTE_SCRIPT="$REMOTE_SCRIPT && docker compose run --rm app npm run db:init -- $MODE --reseed"
fi

if [ "$MODE" = "dev" ]; then
    echo "       [INFO] Running in DEVELOPMENT mode."
    # In dev mode we still want to seed if requested, but we'll let the app handle normal start
    if [ "$CLEAR_DB" != true ]; then
        REMOTE_SCRIPT="$REMOTE_SCRIPT && docker compose run --rm app npm run db:init -- dev --seed"
    fi
fi

REMOTE_SCRIPT="$REMOTE_SCRIPT && docker compose up -d --force-recreate --remove-orphans"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Container Status ---' && docker compose ps"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Waiting for Startup ---' && sleep 10"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Recent Logs ---' && docker compose logs app --tail=20"
REMOTE_SCRIPT="$REMOTE_SCRIPT && echo '--- Local Health Check (with retries) ---'"
REMOTE_SCRIPT="$REMOTE_SCRIPT && HEALTH_OK=0"
REMOTE_SCRIPT="$REMOTE_SCRIPT && for i in \\$(seq 1 12); do CODE=\\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health || true); if [ \"\\$CODE\" = \"200\" ]; then echo \"Health check passed (attempt \\$i).\"; HEALTH_OK=1; break; fi; echo \"Health check not ready (attempt \\$i, code=\\$CODE).\"; sleep 5; done"
REMOTE_SCRIPT="$REMOTE_SCRIPT && if [ \\$HEALTH_OK -ne 1 ]; then echo 'Health check failed after retries.'; fi"

sshpass -e ssh $SSH_OPTS root@"$SERVER_IP" "$REMOTE_SCRIPT" | tee .deploy.log

echo "[3/3] Deployment complete! Site live at https://${DOMAIN_VAL}"
echo "      (Note: If you get a DNS error, try http://$SERVER_IP directly)"
echo ""

if [ "$CLEAR_DB" = true ]; then
    RESET_LINK=$(grep "Reset Link:" .deploy.log | awk '{print $NF}' | tr -d '\r')
    if [ -n "$RESET_LINK" ]; then
        echo "======================================================================"
        echo "ADMIN RESET LINK RETRIEVED:"
        echo "$RESET_LINK"
        echo "======================================================================"
        echo ""
    fi
fi

rm -f .deploy.log

echo "Troubleshooting:"
echo " - If the site is not loading, check logs: ./deploy.sh --logs"
echo " - To check Caddy logs specifically: ssh root@$SERVER_IP 'cd DUCC-Website && docker compose logs caddy'"
echo " - Ensure ports 80 and 443 are open on your server firewall."

if [ "$CLEAR_DB" = true ]; then
    echo ""
    echo "IMPORTANT: Database was cleared. Run './deploy.sh --logs' to see the new Admin password."
fi
