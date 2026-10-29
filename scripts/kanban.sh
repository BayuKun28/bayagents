#!/bin/bash
# ==============================================================================
# Script inspeksi papan kanban 4 agen dari CLI
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BAYAGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$BAYAGENTS_DIR/.env" ]; then
    set -a
    . "$BAYAGENTS_DIR/.env"
    set +a
fi

TELEBOT_DIR="${TELEBOT_DIR:-$BAYAGENTS_DIR/telebot}"
PYTHON_BIN="$TELEBOT_DIR/.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="python3"
fi

"$PYTHON_BIN" -c "import sys; sys.path.insert(0, '$TELEBOT_DIR'); import bot; print(bot.get_kanban_summary())"
