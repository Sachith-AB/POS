#!/usr/bin/env bash
# Dumps the local Postgres database to apps/server/backups/<timestamp>.sql
# Usage: ./scripts/backup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../apps/server"
ENV_FILE="$SERVER_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy .env.example to .env first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

BACKUPS_DIR="${BACKUPS_DIR:-$SERVER_DIR/backups}"
mkdir -p "$BACKUPS_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUPS_DIR/pos-backup-$STAMP.sql"

pg_dump "$DATABASE_URL" > "$OUT_FILE"
echo "Backup written to $OUT_FILE"
