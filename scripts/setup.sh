#!/bin/bash
# ==============================================================================
# Master Installer & Environment Setup for bayagents
# Mendukung instalasi di partisi/direktori mana saja dan multi-user.
# Penggunaan:
#   sudo ./scripts/setup.sh                 (Instalasi penuh)
#   sudo ./scripts/setup.sh --deps-only     (Hanya dependensi OS & Python)
#   sudo ./scripts/setup.sh --services-only (Hanya generate/start systemd)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BAYAGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================================="
echo "🚀 Memulai Setup bayagents di: $BAYAGENTS_DIR"
echo "=========================================================="

# 1. Pastikan dijalankan dengan hak akses root/sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️ Skrip ini memerlukan hak akses root untuk install paket dan systemd."
    echo "Jalankan dengan: sudo $0 $@"
    exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
REAL_GROUP="$(id -gn "$REAL_USER" 2>/dev/null || echo "$REAL_USER")"

# 2. Inisialisasi file .env bila belum ada
ENV_FILE="$BAYAGENTS_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "📄 File .env belum ditemukan. Menyalin dari .env.example..."
    cp "$BAYAGENTS_DIR/.env.example" "$ENV_FILE"
    sed -i "s|^BAY_USER=.*|BAY_USER=$REAL_USER|" "$ENV_FILE"
    sed -i "s|^BAY_GROUP=.*|BAY_GROUP=$REAL_GROUP|" "$ENV_FILE"
    sed -i "s|^BAYAGENTS_DIR=.*|BAYAGENTS_DIR=$BAYAGENTS_DIR|" "$ENV_FILE"
    sed -i "s|^WORKSPACE_DIR=.*|WORKSPACE_DIR=$(eval echo "~$REAL_USER")|" "$ENV_FILE"
    sed -i "s|^DATA_DIR=.*|DATA_DIR=$BAYAGENTS_DIR/data|" "$ENV_FILE"
    sed -i "s|^KANBAN_PATH=.*|KANBAN_PATH=$BAYAGENTS_DIR/data/kanban.json|" "$ENV_FILE"
    sed -i "s|^PROJECTS_PATH=.*|PROJECTS_PATH=$BAYAGENTS_DIR/data/projects.json|" "$ENV_FILE"
    sed -i "s|^CONFIGS_DIR=.*|CONFIGS_DIR=$BAYAGENTS_DIR/configs|" "$ENV_FILE"
    sed -i "s|^SCRIPTS_DIR=.*|SCRIPTS_DIR=$BAYAGENTS_DIR/scripts|" "$ENV_FILE"
    sed -i "s|^TELEBOT_DIR=.*|TELEBOT_DIR=$BAYAGENTS_DIR/telebot|" "$ENV_FILE"
fi

# Muat variabel konfigurasi
set -a
. "$ENV_FILE"
set +a

BAY_USER="${BAY_USER:-$REAL_USER}"
BAY_GROUP="${BAY_GROUP:-$REAL_GROUP}"
BAYAGENTS_DIR="${BAYAGENTS_DIR:-$BAYAGENTS_DIR}"
WORKSPACE_DIR="${WORKSPACE_DIR:-$(eval echo "~$BAY_USER")}"

MODE="${1:-all}"

# ==============================================================================
# FASE A: Dependensi Sistem (apt) & Python Virtualenv
# ==============================================================================
if [ "$MODE" = "all" ] || [ "$MODE" = "--deps-only" ]; then
    echo ""
    echo "📦 [1/4] Memeriksa & Menginstal Paket Sistem Operasi (apt)..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq python3 python3-venv python3-pip tmux curl jq git

    echo ""
    echo "🐍 [2/4] Menyiapkan Virtualenv Python untuk telebot..."
    TELEBOT_VENV="$BAYAGENTS_DIR/telebot/.venv"
    if [ ! -d "$TELEBOT_VENV" ]; then
        echo "   Membuat venv baru di $TELEBOT_VENV..."
        python3 -m venv "$TELEBOT_VENV"
    fi
    # Perbaiki shebang path jika sebelumnya dipindahkan
    sed -i "s|#!/.*/bin/python|#!$TELEBOT_VENV/bin/python|" "$TELEBOT_VENV/bin/"* 2>/dev/null || true
    echo "   Menginstal dependensi pip telebot..."
    "$TELEBOT_VENV/bin/pip" install --upgrade pip -q
    if [ -f "$BAYAGENTS_DIR/telebot/requirements.txt" ]; then
        "$TELEBOT_VENV/bin/pip" install -r "$BAYAGENTS_DIR/telebot/requirements.txt" -q
    fi

    echo ""
    echo "🐍 [3/4] Menyiapkan Virtualenv Python untuk bayoffice backend..."
    BAYOFFICE_VENV="$BAYAGENTS_DIR/bayoffice/backend/.venv"
    if [ ! -d "$BAYOFFICE_VENV" ]; then
        echo "   Membuat venv baru di $BAYOFFICE_VENV..."
        python3 -m venv "$BAYOFFICE_VENV"
    fi
    # Perbaiki shebang path jika sebelumnya dipindahkan
    sed -i "s|#!/.*/bin/python|#!$BAYOFFICE_VENV/bin/python|" "$BAYOFFICE_VENV/bin/"* 2>/dev/null || true
    echo "   Menginstal dependensi pip bayoffice..."
    "$BAYOFFICE_VENV/bin/pip" install --upgrade pip -q
    if [ -f "$BAYAGENTS_DIR/bayoffice/backend/requirements.txt" ]; then
        "$BAYOFFICE_VENV/bin/pip" install -r "$BAYAGENTS_DIR/bayoffice/backend/requirements.txt" -q
    fi

    # Set hak akses kepemilikan folder instalasi
    chown -R "$BAY_USER:$BAY_GROUP" "$BAYAGENTS_DIR"
    chmod +x "$BAYAGENTS_DIR/scripts/"*.sh 2>/dev/null || true

    # Sinkronisasi path proyek internal bayoffice di data/projects.json
    if [ -f "$BAYAGENTS_DIR/data/projects.json" ]; then
        sed -i "s|\"root_dir\": \".*/bayoffice\"|\"root_dir\": \"$BAYAGENTS_DIR/bayoffice\"|" "$BAYAGENTS_DIR/data/projects.json"
        sed -i "s|\"frontend_dir\": \".*/bayoffice/frontend\"|\"frontend_dir\": \"$BAYAGENTS_DIR/bayoffice/frontend\"|" "$BAYAGENTS_DIR/data/projects.json"
        sed -i "s|\"backend_dir\": \".*/bayoffice/backend\"|\"backend_dir\": \"$BAYAGENTS_DIR/bayoffice/backend\"|" "$BAYAGENTS_DIR/data/projects.json"
        sed -i "s|\"rules_file\": \".*/bayoffice/README.md\"|\"rules_file\": \"$BAYAGENTS_DIR/bayoffice/README.md\"|" "$BAYAGENTS_DIR/data/projects.json"
    fi
fi

# ==============================================================================
# FASE B: Konfigurasi & Aktivasi Systemd Services
# ==============================================================================
if [ "$MODE" = "all" ] || [ "$MODE" = "--services-only" ]; then
    echo ""
    echo "⚙️ [4/4] Mendaftarkan Systemd Services Dinamis..."

    # 1. agy-telebot.service
    cat <<EOF > /etc/systemd/system/agy-telebot.service
[Unit]
Description=Antigravity Telegram Bot & System Auditor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${BAY_USER}
Group=${BAY_GROUP}
WorkingDirectory=${BAYAGENTS_DIR}/telebot
ExecStart=${BAYAGENTS_DIR}/telebot/.venv/bin/python ${BAYAGENTS_DIR}/telebot/bot.py
Restart=always
RestartSec=10
TimeoutStopSec=10
EnvironmentFile=-${BAYAGENTS_DIR}/.env
Environment="PATH=${BAYAGENTS_DIR}/telebot/.venv/bin:/home/${BAY_USER}/.gemini/antigravity-cli/bin:/home/${BAY_USER}/.local/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 2. bayoffice.service
    cat <<EOF > /etc/systemd/system/bayoffice.service
[Unit]
Description=BayOffice - Virtual Workspace for Multi-Agent AI (Port ${BAYOFFICE_PORT:-8888})
After=network.target

[Service]
Type=simple
User=${BAY_USER}
Group=${BAY_GROUP}
WorkingDirectory=${BAYAGENTS_DIR}/bayoffice
ExecStart=${BAYAGENTS_DIR}/bayoffice/scripts/start_service.sh
Restart=always
RestartSec=5
TimeoutStopSec=5
KillMode=mixed
EnvironmentFile=-${BAYAGENTS_DIR}/.env
Environment="PATH=${BAYAGENTS_DIR}/bayoffice/backend/.venv/bin:/home/${BAY_USER}/.gemini/antigravity-cli/bin:/home/${BAY_USER}/.local/bin:/usr/local/bin:/usr/bin:/bin"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 3. agy-agents.service
    cat <<EOF > /etc/systemd/system/agy-agents.service
[Unit]
Description=Antigravity 4-Agent Orchestration (LUHUT, JOKOWI, PRABOWO, GIBRAN)
After=network-online.target agy-telebot.service
Wants=network-online.target

[Service]
Type=forking
User=${BAY_USER}
Group=${BAY_GROUP}
WorkingDirectory=${WORKSPACE_DIR}
ExecStart=${BAYAGENTS_DIR}/scripts/start_agents.sh daemon
ExecStop=/usr/bin/tmux kill-session -t ${TMUX_SESSION_NAME:-agy_agents}
RemainAfterExit=yes
Restart=no
EnvironmentFile=-${BAYAGENTS_DIR}/.env
Environment="PATH=/home/${BAY_USER}/.gemini/antigravity-cli/bin:/home/${BAY_USER}/.local/bin:/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable agy-telebot.service bayoffice.service agy-agents.service
    systemctl restart agy-telebot.service bayoffice.service

    echo "✅ Layanan systemd berhasil diperbarui dan dijalankan."
fi

echo ""
echo "=========================================================="
echo "🎉 Setup bayagents Selesai 100%!"
echo "• Direktori Instalasi : $BAYAGENTS_DIR"
echo "• User Pelaksana      : $BAY_USER"
echo "• Status Layanan Telebot  : $(systemctl is-active agy-telebot.service 2>/dev/null || echo 'inactive')"
echo "• Status Layanan BayOffice: $(systemctl is-active bayoffice.service 2>/dev/null || echo 'inactive')"
echo "=========================================================="

if grep -q "YOUR_TELEGRAM_BOT_TOKEN" "$ENV_FILE" 2>/dev/null; then
    echo ""
    echo "⚠️  [PENTING] Token Telegram belum diatur di .env:"
    echo "    Buka '$ENV_FILE' dan masukkan TELEGRAM_BOT_TOKEN serta TELEGRAM_ALLOWED_USER_ID Anda."
fi

if ! command -v agy &>/dev/null && [ ! -f "/home/$BAY_USER/.local/bin/agy" ] && [ ! -f "/home/$BAY_USER/.gemini/antigravity-cli/bin/agy" ]; then
    echo ""
    echo "💡 [INFO] Binary 'agy' (Antigravity CLI) belum terpasang di PATH pengguna."
    echo "   Dashboard BayOffice & Bot tetap berjalan normal. Pasang Antigravity CLI jika"
    echo "   ingin menjalankan fitur orkestrasi 4 agen AI di terminal/tmux."
fi
