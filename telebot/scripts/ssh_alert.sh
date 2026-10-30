#!/bin/bash
if [ "$PAM_TYPE" = "open_session" ]; then
    # Load environment variables if available
    if [ -f "/home/bay/bayagents/.env" ]; then
        # shellcheck disable=SC1091
        BOT_TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' /home/bay/bayagents/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        CHAT_ID=$(grep -E '^TELEGRAM_ALLOWED_USER_ID=' /home/bay/bayagents/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi

    # Fallback credentials
    BOT_TOKEN="${BOT_TOKEN:-8899183243:AAGIXvdrOZcdKpD942mubV05Xsws4tsDNSg}"
    CHAT_ID="${CHAT_ID:-675312281}"
    USER="${PAM_USER:-bay}"
    RHOST="${PAM_RHOST:-localhost}"
    DATE=$(TZ='Asia/Jakarta' date '+%d %b %Y, %H:%M:%S WIB')
    HOSTNAME=$(hostname)
    
    INFO=""
    if [[ "$RHOST" == 100.* ]]; then
        INFO=" (Tailscale VPN)"
    elif [[ "$RHOST" == 192.168.* || "$RHOST" == 10.* || "$RHOST" == 172.* ]]; then
        INFO=" (Jaringan Lokal LAN)"
    elif [[ "$RHOST" != "localhost" && "$RHOST" != "127.0.0.1" && -n "$RHOST" ]]; then
        INFO=" (IP Publik / Luar) ⚠️"
    fi

    TEXT="🔐 *[SECURITY ALERT: Login SSH Baru]*
🖥️ *Host:* \`${HOSTNAME}\`
👤 *User:* \`${USER}\`
🌐 *IP Remote:* \`${RHOST}\`${INFO}
🕒 *Waktu:* _${DATE}_"

    curl -4 -s --max-time 8 -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        --data-urlencode "text=${TEXT}" \
        -d "parse_mode=Markdown" >/dev/null 2>&1 &
fi
exit 0
