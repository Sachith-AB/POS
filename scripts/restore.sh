#!/usr/bin/env bash
# Restores a backup produced by backup.sh into the local Postgres database.
# Usage: ./scripts/restore.sh apps/server/backups/pos-backup-20260828-120000.sql
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-backup.sql>" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../apps/server"
ENV_FILE="$SERVER_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy .env.example to .env first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

echo "This will overwrite the current contents of the database at:"
echo "  $DATABASE_URL"
read -r -p "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

psql "$DATABASE_URL" < "$BACKUP_FILE"
echo "Restore complete from $BACKUP_FILE"
