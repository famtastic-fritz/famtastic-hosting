#!/bin/bash
# Deploy famtastichosting.com to GoDaddy cPanel
# Builds locally, then rsyncs dist/ to the server docroot

set -e
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="${REPO_DIR}/dist"
REMOTE_HOST="p3plzcpnl506112.prod.phx3.secureserver.net"
REMOTE_USER="nineoo"
REMOTE_PATH="/home/nineoo/public_html/famtastichosting.com"
SSH_KEY="$HOME/.ssh/id_ed25519"

echo "=== Building FAMtasticHosting.com ==="
cd "$REPO_DIR"
npm run build

echo "=== Syncing to server ==="
# Rsync the built files, preserving structure, excluding server-side stuff
rsync -avz --delete \
  --exclude='cgi-bin' \
  --exclude='.git' \
  --exclude='site' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "${DIST_DIR}/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

echo "=== Deploy complete! ==="
echo "Site: https://famtastichosting.com"
