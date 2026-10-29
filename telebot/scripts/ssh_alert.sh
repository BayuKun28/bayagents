#!/bin/bash
if [ "$PAM_TYPE" = "open_session" ]; then
    BOT_TOKEN="8899183243:AAGIXvdrOZcdKpD942mubV05Xsws4tsDNSg"
    CHAT_ID="675312281"
    USER="${PAM_USER:-bay}"
    RHOST="${PAM_RHOST:-localhost}"
    DATE=$(TZ='Asia/Jakarta' date '+%d %b %Y, %H:%M:%S WIB')
    HOSTNAME=$(hostname)
    
    INFO=""
    if [[ "$RHOST" == 100.* ]]; then
        INFO=" (Tailscale VPN)"
    elif [[ "$RHOST" == 192.168.* || "$RHOST" == 10.* || "$RHOST" == 172.* ]]; then
        INFO=" (Jaringan Lokal LAN)"
    elif [[ "$RHOST" != "localhost" && "$RHOST" != "127.0.0.1" ]]; then
        INFO=" (IP Publik / Luar) ⚠️"
    fi

    TEXT="🔐 *[SECURITY ALERT: Login SSH Baru]*
🖥️ *Host:* \`${HOSTNAME}\`
👤 *User:* \`${USER}\`
🌐 *IP Remote:* \`${RHOST}\`${INFO}
🕒 *Waktu:* _${DATE}_"

    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        --data-urlencode "text=${TEXT}" \
        -d "parse_mode=Markdown" >/dev/null 2>&1 &
fi
exit 0
