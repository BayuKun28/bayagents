---
name: server-ops
description: >-
  Inspeksi kesehatan dan performa server Linux (CPU load, suhu hardware, RAM, swap, storage df, dan failed systemd services).
---

# Server Operations Skill

Gunakan skill ini untuk memeriksa status operasional server Linux:

## Prosedur Inspeksi:
1. **CPU & Uptime**:
   ```bash
   uptime
   lscpu | grep "Model name"
   ```
2. **Suhu Hardware**:
   ```bash
   cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null
   for f in /sys/class/hwmon/hwmon*/temp*_input; do
     [ -f "$f" ] && echo "$f: $(awk '{printf "%.1f°C\n", $1/1000}' $f)"
   done
   ```
3. **Penggunaan Memori & Swap**:
   ```bash
   free -h
   ```
4. **Kapasitas Penyimpanan Disk**:
   ```bash
   df -h -l
   ```
5. **Layanan Gagal (Failed Services)**:
   ```bash
   systemctl --failed --no-pager
   ```
