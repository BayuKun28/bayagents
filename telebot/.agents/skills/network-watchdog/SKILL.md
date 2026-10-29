---
name: network-watchdog
description: >-
  Diagnostik jaringan, IP lokal (LAN), interface aktif, Tailscale VPN, Cloudflare Tunnel, dan port listening.
---

# Network Watchdog Skill

Gunakan skill ini untuk diagnosa jaringan server:

## Prosedur:
1. **Interface & IP Address**:
   ```bash
   ip -br addr
   ```
2. **Port Listening**:
   ```bash
   ss -tulpn
   ```
3. **Konektivitas Internet**:
   ```bash
   ping -c 3 1.1.1.1
   ```
4. **Status Tailscale / Cloudflare Tunnel**:
   ```bash
   tailscale status 2>/dev/null || systemctl status tailscaled --no-pager
   systemctl status cloudflared --no-pager 2>/dev/null || true
   ```
