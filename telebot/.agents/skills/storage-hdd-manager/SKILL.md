---
name: storage-hdd-manager
description: >-
  Manajemen storage, harddisk, SMART health test, cek kapasitas partisi dan investigasi file besar.
---

# Storage HDD Manager Skill

Gunakan skill ini untuk memeriksa kesehatan dan kapasitas media penyimpanan:

## Prosedur:
1. **Cek Partisi dan Mount Point**:
   ```bash
   lsblk -f
   df -h
   ```
2. **Cek SMART Health**:
   ```bash
   smartctl -H /dev/sda
   ```
3. **Investigasi File/Direktori Ukuran Besar**:
   ```bash
   du -ahx / 2>/dev/null | sort -rh | head -n 20
   ```
