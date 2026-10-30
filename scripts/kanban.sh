#!/bin/bash
# ==============================================================================
# Script inspeksi papan kanban 4 agen dari CLI (Fast & Lean)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
BAYAGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$BAYAGENTS_DIR/.env" ]; then
    set -a
    . "$BAYAGENTS_DIR/.env"
    set +a
fi

KANBAN_FILE="${KANBAN_PATH:-$BAYAGENTS_DIR/data/kanban.json}"
python3 - "$KANBAN_FILE" "$@" << 'EOF'
import sys, json, os

filepath = sys.argv[1] if len(sys.argv) > 1 else "data/kanban.json"
if not os.path.exists(filepath):
    print(f"⚠️ File kanban.json tidak ditemukan di: {filepath}")
    sys.exit(1)

with open(filepath, "r", encoding="utf-8") as f:
    data = json.load(f)

tasks = data.get("tasks", [])
print(f"📋 PAPAN KANBAN (Total: {len(tasks)} Tugas)\n" + "="*50)
groups = {"To-Do": [], "In-Progress": [], "QA-Review": [], "Done": []}
for t in tasks:
    st = t.get("status", "To-Do")
    groups.setdefault(st, []).append(t)

for col in ["To-Do", "In-Progress", "QA-Review", "Done"]:
    items = groups.get(col, [])
    print(f"\n[{col.upper()}] ({len(items)})")
    if not items:
        print("  (kosong)")
    for item in items[-8:]:
        tid = item.get("id", "N/A")
        ag = item.get("assignee", "Auto")
        title = item.get("title", "")
        print(f"  • {tid} [{ag}]: {title[:65]}")
EOF

