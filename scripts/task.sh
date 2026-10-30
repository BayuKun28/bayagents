#!/bin/bash
# ==============================================================================
# Script untuk mengirim perintah proyek ke tim agen dari CLI server
# Terintegrasi penuh dengan Kanban & Aturan Fast-Track Orchestrator
# ==============================================================================

if [ -z "$*" ]; then
    echo "⚠️ Harap sertakan deskripsi tugas!"
    echo "Penggunaan: $0 <deskripsi proyek/tugas>"
    echo "Contoh: $0 Buatkan REST API produk di backend dan UI tabel di frontend"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
BAYAGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$BAYAGENTS_DIR/.env" ]; then
    set -a
    . "$BAYAGENTS_DIR/.env"
    set +a
fi

BACKEND_DIR="$BAYAGENTS_DIR/bayoffice/backend"
PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="python3"
fi

"$PYTHON_BIN" - "$*" << 'EOF'
import sys, os
from pathlib import Path

instr = sys.argv[1]
backend_dir = Path("/home/bay/bayagents/bayoffice/backend")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    import service
    res = service.dispatch_task_from_web(instruction=instr)
    if res.get("success"):
        tid = res.get("task_id")
        agent = res.get("target_agent")
        cat = res.get("category")
        proj = res.get("project")
        print(f"🚀 [SUKSES] Tugas {tid} berhasil didaftarkan di Kanban!")
        print(f"📁 Proyek   : {proj} ({cat})")
        print(f"👤 Pelaksana: {agent}")
        print(f"📝 Instruksi: \"{instr}\"")
        print(f"⚡ Status   : Sinyal Fast-Track dikirim ke orkestrator.")
    else:
        print(f"⚠️ Gagal mendispatch tugas: {res.get('error')}")
except Exception as e:
    print(f"⚠️ Terjadi kesalahan: {e}")
EOF

