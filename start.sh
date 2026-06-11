#!/bin/bash
set -euo pipefail

ROOT="/home/nineoo/public_html/famtastichosting.com"
SITE="${ROOT}/site"
NODE="/home/nineoo/.nvm/versions/node/v20.20.2/bin/node"
ENTRY="${SITE}/dist/server/entry.mjs"
ENV_FILE="${SITE}/.env"
LOG_FILE="/tmp/famhosting-node.log"

if [ ! -f "${ENTRY}" ]; then
  echo "Missing server entry: ${ENTRY}" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

pkill -f "node.*${SITE}/server.mjs" 2>/dev/null || true
pkill -f "node.*${ENTRY}" 2>/dev/null || true
sleep 2
nohup "${NODE}" --env-file="${ENV_FILE}" "${ENTRY}" >> "${LOG_FILE}" 2>&1 &
sleep 3

if pgrep -f "node.*${ENTRY}" >/dev/null; then
  echo "Node server running via ${ENTRY}"
  exit 0
fi

echo "Node server failed to start. Last log lines:" >&2
tail -40 "${LOG_FILE}" >&2 || true
exit 1
