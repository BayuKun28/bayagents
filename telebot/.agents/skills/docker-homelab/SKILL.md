---
name: docker-homelab
description: >-
  Manajemen dan pemantauan kontainer Docker homelab (status kontainer, logs, resource usage, restart kontainer).
---

# Docker Homelab Skill

Gunakan skill ini untuk mengelola dan memantau kontainer Docker homelab:

## Prosedur Pemantauan:
1. **Daftar Kontainer & Status**:
   ```bash
   docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```
2. **Penggunaan Resource Kontainer**:
   ```bash
   docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
   ```
3. **Cek Log Kontainer**:
   ```bash
   docker logs --tail 50 <container_name>
   ```
4. **Restart Kontainer Aman**:
   ```bash
   docker restart <container_name>
   ```
