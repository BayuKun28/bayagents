---
name: server-cleanup
description: >-
  Pembersihan aman disk, log systemd journal vacuum, cache apt, dan dangling docker image.
---

# Server Cleanup Skill

Gunakan skill ini untuk membersihkan cache dan log tanpa mengganggu stabilitas sistem:

## Prosedur:
1. **Cek Ukuran Log Journal**:
   ```bash
   journalctl --disk-usage
   ```
2. **Pangkas Log Lama (Vacuum)**:
   ```bash
   journalctl --vacuum-time=3d
   ```
3. **Bersihkan Cache APT & Temporary**:
   ```bash
   rm -rf ~/.cache/* /tmp/pip* 2>/dev/null || true
   ```
4. **Bersihkan Docker Dangling Image**:
   ```bash
   docker image prune -f 2>/dev/null || true
   ```
