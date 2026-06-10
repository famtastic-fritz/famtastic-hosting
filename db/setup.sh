#!/usr/bin/env bash
# =============================================================================
# FAMtastic Hosting — One-command MySQL setup
#   Creates the database, runs schema.sql, then seed.sql.
#
# Environment variables (all required unless noted):
#   MYSQL_HOST         — hostname (default: 127.0.0.1)
#   MYSQL_PORT         — port     (default: 3306)
#   MYSQL_USER         — privileged user that can CREATE DATABASE (default: root)
#   MYSQL_PASSWORD     — password for MYSQL_USER
#   MYSQL_DATABASE     — database name (default: famtastic_hosting)
#
# Usage:
#   chmod +x db/setup.sh
#   ./db/setup.sh
# =============================================================================
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-famtastic_hosting}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

MYSQL_CMD="mysql -h \"$MYSQL_HOST\" -P \"$MYSQL_PORT\" -u \"$MYSQL_USER\""
if [ -n "$MYSQL_PASSWORD" ]; then
  MYSQL_CMD="$MYSQL_CMD -p\"$MYSQL_PASSWORD\""
fi

echo "==> Creating database ${MYSQL_DATABASE} (if not exists)..."
eval "$MYSQL_CMD -e \"CREATE DATABASE IF NOT EXISTS \\\`${MYSQL_DATABASE}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""

echo "==> Running schema.sql..."
eval "$MYSQL_CMD \"${MYSQL_DATABASE}\" < \"${SCRIPT_DIR}/schema.sql\""

echo "==> Running seed.sql..."
eval "$MYSQL_CMD \"${MYSQL_DATABASE}\" < \"${SCRIPT_DIR}/seed.sql\""

echo "==> Done. Database '${MYSQL_DATABASE}' is ready."