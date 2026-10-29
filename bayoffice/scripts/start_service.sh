#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BAYOFFICE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BAYAGENTS_DIR="$(cd "$BAYOFFICE_DIR/.." && pwd)"

# Muat root .env
if [ -f "$BAYAGENTS_DIR/.env" ]; then
    set -a
    . "$BAYAGENTS_DIR/.env"
    set +a
elif [ -f "$BAYOFFICE_DIR/.env" ]; then
    set -a
    . "$BAYOFFICE_DIR/.env"
    set +a
fi

cd "$BAYOFFICE_DIR"

PORT="${BAYOFFICE_PORT:-${PORT:-8888}}"
HOST="${BAYOFFICE_HOST:-${HOST:-0.0.0.0}}"

echo "Memulai BayOffice di http://$HOST:$PORT ..."
exec "$BAYOFFICE_DIR/backend/.venv/bin/uvicorn" app:app --app-dir "$BAYOFFICE_DIR/backend" --host "$HOST" --port "$PORT" --workers 1
