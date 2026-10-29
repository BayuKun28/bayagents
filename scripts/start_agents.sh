#!/bin/bash
# ==============================================================================
# Antigravity 4-Agent Orchestration Launcher (Fast-Track & Passive Standby)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BAYAGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Muat root .env
if [ -f "$BAYAGENTS_DIR/.env" ]; then
    set -a
    . "$BAYAGENTS_DIR/.env"
    set +a
fi

BAY_USER="${BAY_USER:-$USER}"
BAY_HOME="${BAY_HOME:-$HOME}"
WORK_DIR="${WORKSPACE_DIR:-$BAY_HOME}"
SESSION="${TMUX_SESSION_NAME:-agy_agents}"

CONFIGS_DIR="${CONFIGS_DIR:-$BAYAGENTS_DIR/configs}"
TELEBOT_DIR="${TELEBOT_DIR:-$BAYAGENTS_DIR/telebot}"

export HOME="$BAY_HOME"
export PATH="$BAY_HOME/.gemini/antigravity-cli/bin:$BAY_HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$WORK_DIR"

INITIAL_TASK="$2"
# Bersihkan newline dan tanda kutip agar aman dari error sintaks shell
CLEAN_TASK=$(echo "$INITIAL_TASK" | tr '\n\r"'"'" '    ' | sed 's/  */ /g' | xargs)

if [ -n "$CLEAN_TASK" ]; then
    LUHUT_PROMPT="Nama kamu LUHUT (DevOps & Orchestrator). Ada tugas baru dari Mas Bay: '$CLEAN_TASK'. Baca $CONFIGS_DIR/luhut.yaml. ATURAN FAST-TRACK: Segera catat/update ke kanban.json, delegasikan ke PRABOWO (Frontend: $SESSION:0.3) atau JOKOWI (Backend: $SESSION:0.2) via tmux send-keys, laporkan ke Telegram via python3 $TELEBOT_DIR/bot.py '[LUHUT]: ...', lalu MASUK STANDBY PASIF. DILARANG audit kode aplikasi atau loop checking!"
else
    LUHUT_PROMPT="Nama kamu LUHUT. Baca konfigurasi di $CONFIGS_DIR/luhut.yaml. Laporkan status standby siap dan langsung masuk ke mode STANDBY PASIF (berhenti memanggil tool)."
fi

# Jika session belum ada, buat tmux session dengan 4 pane agen
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Memulai sesi orkestrasi 4 agen AI (Mode Fast-Track & Passive Standby)..."
    # Pane 0: LUHUT (DevOps & Lead Orchestrator)
    tmux new-session -d -s "$SESSION" "cd $WORK_DIR && agy --dangerously-skip-permissions -i \"$LUHUT_PROMPT\""
    
    # Beri jeda 0.5 detik agar server tmux dan window 0 terbentuk stabil
    sleep 0.5

    # Pane 1: JOKOWI (Backend Engineer)
    tmux split-window -h -t "$SESSION" "cd $WORK_DIR && agy --dangerously-skip-permissions -i 'Nama kamu JOKOWI. Baca $CONFIGS_DIR/jokowi.yaml. Laporkan kesiapan singkat lalu BERHENTI MEMANGGIL TOOL (STANDBY PASIF). Tunggu tugas dari LUHUT via tmux send-keys.'"
    
    # Pane 2: PRABOWO (Frontend Engineer)
    tmux split-window -v -t "$SESSION" "cd $WORK_DIR && agy --dangerously-skip-permissions -i 'Nama kamu PRABOWO. Baca $CONFIGS_DIR/prabowo.yaml. Laporkan kesiapan singkat lalu BERHENTI MEMANGGIL TOOL (STANDBY PASIF). Tunggu tugas dari LUHUT via tmux send-keys.'"
    
    # Pane 3: GIBRAN (QA & Code Auditor)
    tmux select-pane -t "$SESSION:0.0"
    tmux split-window -v -t "$SESSION" "cd $WORK_DIR && agy --dangerously-skip-permissions -i 'Nama kamu GIBRAN. Baca $CONFIGS_DIR/gibran.yaml. Laporkan kesiapan singkat lalu BERHENTI MEMANGGIL TOOL (STANDBY PASIF). Tunggu tugas dari PRABOWO/JOKOWI via tmux send-keys.'"
fi

# Jika dijalankan interaktif dari terminal (TTY) dan bukan mode daemon, attach ke tmux
if [ "$1" != "daemon" ] && [ -t 0 ]; then
    tmux attach-session -t "$SESSION"
else
    echo "Sesi orkestrasi '$SESSION' berjalan di background."
    echo "Gunakan 'tmux attach -t $SESSION' untuk melihat layar kerja agen."
fi
