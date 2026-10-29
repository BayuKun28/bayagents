# 🏢 BayOffice - Custom Lightweight Virtual Office for Multi-Agent AI

BayOffice adalah webapp visualisasi kantor 2D Retro Pixel Art dan dashboard orkestrasi untuk 4 Agen AI (`LUHUT`, `JOKOWI`, `PRABOWO`, `GIBRAN`).

## ✨ Fitur Utama
1. **2D Pixel Art Virtual Office**: 4 meja kerja agen dengan avatar beranimasi (Sleeping/Zzz, Standby, Coding, Reviewing, Chat Bubble).
2. **Interactive Live Kanban Board**: Sinkronisasi instan real-time dengan `/home/bay/kanban.json` via Server-Sent Events (SSE).
3. **Task Dispatcher Web UI**: Form kirim tugas baru langsung ke sesi tmux dan disiarkan ke Telegram.
4. **Proteksi Autentikasi**: Dilindungi login session/cookie aman.
5. **Ultra-Low Memory Footprint**: Dirancang khusus hemat RAM (< 25 MB RAM) untuk mesin 2-core.

## 🚀 Menjalankan Service
```bash
# Melalui script
cd /home/bay/bayoffice
./scripts/start_service.sh

# Melalui systemd
sudo systemctl start bayoffice.service
```

Akses webapp di `http://192.168.100.145:8888` atau melalui Cloudflare Tunnel `https://office.baydev.my.id`.
