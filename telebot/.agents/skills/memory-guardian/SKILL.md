---
name: memory-guardian
description: >-
  Pemantauan penggunaan RAM ketat, Swap, ZRAM, deteksi kernel OOM-killer, dan optimasi memory pressure.
---

# Memory Guardian Skill

Gunakan skill ini untuk memantau penggunaan memori dan mencegah server crash akibat Out Of Memory (OOM):

## Prosedur:
1. **Analisis Memori Rinci**:
   ```bash
   free -m
   cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Buffers|Cached|SwapTotal|SwapFree"
   ```
2. **Proses Terbesar Pengonsumsi RAM**:
   ```bash
   ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -n 10
   ```
3. **Deteksi OOM Killer di Kernel Log**:
   ```bash
   dmesg -T 2>/dev/null | grep -i -E "oom|out of memory|killed process" | tail -n 20 || true
   ```
