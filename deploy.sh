#!/bin/bash
# Deploy famtastichosting.com to GoDaddy cPanel
#
# SSR deploy contract:
# - Apache/docroot serves dist/client/ directly
# - Node runtime lives in /site and runs dist/server/entry.mjs
# - Runtime dependencies are installed server-side via npm ci --omit=dev
# - Built file:// paths are rewritten after deploy so Astro SSR resolves on cPanel
#
# Before running: add the production host key to ~/.ssh/known_hosts
#   ssh-keyscan -H p3plzcpnl506112.prod.phx3.secureserver.net >> ~/.ssh/known_hosts

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="${REPO_DIR}/dist"
REMOTE_HOST="p3plzcpnl506112.prod.phx3.secureserver.net"
REMOTE_USER="nineoo"
REMOTE_SITE_ROOT="/home/nineoo/public_html/famtastichosting.com"
REMOTE_RUNTIME_DIR="${REMOTE_SITE_ROOT}/site"
REMOTE_DIST_DIR="${REMOTE_RUNTIME_DIR}/dist"
REMOTE_NODE_BIN="/home/nineoo/.nvm/versions/node/v20.20.2/bin/node"
REMOTE_NODE_DIR="/home/nineoo/.nvm/versions/node/v20.20.2/bin"
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH_OPTS="-i $SSH_KEY"
LOCAL_BUILD_ROOT="${REPO_DIR}"

run_ssh() {
  ssh ${SSH_OPTS} "${REMOTE_USER}@${REMOTE_HOST}" "$@"
}

echo "=== Building FAMtasticHosting.com ==="
cd "$REPO_DIR"
npm run build

echo "=== Preparing remote directories ==="
run_ssh "mkdir -p '${REMOTE_SITE_ROOT}' '${REMOTE_RUNTIME_DIR}' '${REMOTE_RUNTIME_DIR}/scripts' '${REMOTE_DIST_DIR}'"

echo "=== Syncing Apache-served static files ==="
rsync -avz --delete \
  --exclude='cgi-bin' \
  --exclude='.git' \
  --exclude='site' \
  --exclude='start.sh' \
  --exclude='.well-known' \
  -e "ssh ${SSH_OPTS}" \
  "${DIST_DIR}/client/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_SITE_ROOT}/"

echo "=== Syncing Node runtime bundle ==="
rsync -avz --delete \
  -e "ssh ${SSH_OPTS}" \
  "${DIST_DIR}/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIST_DIR}/"

echo "=== Syncing runtime package metadata, env, and migration script ==="
rsync -avz \
  -e "ssh ${SSH_OPTS}" \
  "${REPO_DIR}/package.json" \
  "${REPO_DIR}/package-lock.json" \
  "${REPO_DIR}/.env" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_RUNTIME_DIR}/"

run_ssh "mkdir -p '${REMOTE_RUNTIME_DIR}/scripts'"
rsync -avz \
  -e "ssh ${SSH_OPTS}" \
  "${REPO_DIR}/scripts/migrate-db.js" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_RUNTIME_DIR}/scripts/"

rsync -avz \
  -e "ssh ${SSH_OPTS}" \
  "${REPO_DIR}/start.sh" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_SITE_ROOT}/start.sh"

echo "=== Installing runtime dependencies on server ==="
run_ssh "export PATH='${REMOTE_NODE_DIR}':\$PATH && cd '${REMOTE_RUNTIME_DIR}' && npm ci --omit=dev"

echo "=== Rewriting Astro SSR file:// paths and runtime bind settings ==="
run_ssh "find '${REMOTE_DIST_DIR}/server' -type f -name '*.mjs' -print0 | xargs -0 sed -i 's|file://${LOCAL_BUILD_ROOT}/|file://${REMOTE_RUNTIME_DIR}/|g'"
run_ssh "sed -i 's|\"host\": false|\"host\": \"127.0.0.1\"|g' '${REMOTE_DIST_DIR}/server/entry.mjs'"
run_ssh "sed -i 's|\"port\": 4321|\"port\": 3001|g' '${REMOTE_DIST_DIR}/server/entry.mjs'"

echo "=== Restarting Node server ==="
run_ssh "if [ -f '${REMOTE_SITE_ROOT}/start.sh' ]; then bash '${REMOTE_SITE_ROOT}/start.sh'; else echo 'WARNING: start.sh not found at ${REMOTE_SITE_ROOT}/start.sh'; fi"

echo "=== Deploy complete! ==="
echo "Site: https://famtastichosting.com"
echo "Runtime: ${REMOTE_RUNTIME_DIR}/dist/server/entry.mjs"
