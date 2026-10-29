#!/bin/bash
# ==============================================================================
# Script untuk mengirim perintah proyek ke LUHUT dari CLI server
# ==============================================================================

if [ -z "$*" ]; then
    echo "⚠️ Harap sertakan deskripsi tugas!"
    echo "Penggunaan: $0 <deskripsi proyek/tugas>"
    echo "Contoh: $0 Buatkan REST API produk di backend dan UI tabel di frontend"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BAYAGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$BAYAGENTS_DIR/.env" ]; then
    set -a
    . "$BAYAGENTS_DIR/.env"
    set +a
fi

SESSION="${TMUX_SESSION_NAME:-agy_agents}"

# Pastikan sesi tmux agy_agents berjalan
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Sesi $SESSION belum berjalan, menjalankan launcher..."
    "$SCRIPT_DIR/start_agents.sh" daemon
    sleep 2
fi

# Kirim teks ke pane 0 (LUHUT)
tmux send-keys -t "$SESSION:0.0" "$*" Enter

echo "🚀 [SUKSES] Tugas telah dikirim ke LUHUT (Pane 0)!"
echo "Instruksi: \"$*\""
echo ""
echo "Tips:"
echo "• Cek papan kanban di CLI : $SCRIPT_DIR/kanban.sh"
echo "• Masuk ke layar 4 agen   : tmux attach -t $SESSION (atau $SCRIPT_DIR/start_agents.sh)"
