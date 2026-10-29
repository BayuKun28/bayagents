# BayAgents — Ekosistem Multi-Agent AI & Virtual Workspace

`bayagents` adalah repositori dan direktori terpusat untuk seluruh sistem orkestrasi multi-agen (LUHUT, JOKOWI, PRABOWO, GIBRAN), bot Telegram & incident auditor (`telebot`), virtual workspace dashboard 2D pixel (`bayoffice`), konfigurasi profil agen (YAML), CLI scripts, serta data state kanban.

---

## 📁 Struktur Direktori

```
bayagents/
├── install.sh               # Shortcut master installer (sudo ./install.sh)
├── .env                     # Single Source of Truth (Port, Path, Token, User)
├── .env.example             # Template konfigurasi portabel
│
├── telebot/                 # Telegram Bot & Incident Monitor
│   ├── bot.py
│   ├── emergency_agent.py
│   ├── incident_monitor.py
│   ├── engine_config.json
│   ├── requirements.txt
│   └── .venv/
│
├── bayoffice/               # 2D Retro Canvas Web Dashboard & API (Port 8888)
│   ├── backend/             (FastAPI Service & .venv)
│   ├── frontend/            (Canvas 2D HTML/CSS/JS)
│   └── scripts/             (start_service.sh)
│
├── configs/                 # YAML Configuration 4 Agen AI
│   ├── luhut.yaml           (Lead Orchestrator & DevOps)
│   ├── jokowi.yaml          (Backend Engineer)
│   ├── prabowo.yaml         (Frontend Engineer)
│   └── gibran.yaml          (Universal QA & Code Auditor)
│
├── scripts/                 # Utilitas Eksekusi & Manajemen CLI
│   ├── setup.sh             (Master dependency & systemd installer)
│   ├── start_agents.sh      (Launcher tmux session agy_agents)
│   ├── kanban.sh            (Inspeksi cepat papan kanban di terminal)
│   └── task.sh              (Kirim tugas langsung ke LUHUT via CLI)
│
└── data/                    # State Persistence
    ├── kanban.json          (State alur kerja sprint agen)
    └── projects.json        (Registry konfigurasi multi-proyek)
```

---

## ⚙️ Konfigurasi Terpusat (`.env`)

Seluruh pengaturan disimpan di level paling atas (`.env`). Tidak ada path atau port yang di-hardcode ke file kode.

| Variabel | Keterangan | Contoh Nilai |
| :--- | :--- | :--- |
| `BAY_USER` | Akun user Linux yang menjalankan proses | `bay` atau `masbay` |
| `BAYAGENTS_DIR` | Path absolut folder instalasi bayagents | `/home/bay/bayagents` atau `/opt/bayagents` |
| `WORKSPACE_DIR` | Folder workspace repositori proyek | `/home/bay` atau `/mnt/storage/projects` |
| `BAYOFFICE_PORT`| Port layanan dashboard BayOffice | `8888` |
| `TELEGRAM_BOT_TOKEN` | Token API bot Telegram | `8899183243:...` |
| `TELEGRAM_ALLOWED_USER_ID` | Telegram User ID yang diizinkan | `675312281` |

---

## 🚀 Panduan Instalasi / Pindah Laptop (Partisi Bebas)

Jika sistem ini di-clone atau dipindahkan ke mesin lain, partisi lain (seperti `/opt/bayagents` atau `/mnt/data/bayagents`), atau berganti user:

1. **Salin konfigurasi**:
   ```bash
   cp .env.example .env
   ```
2. **Sesuaikan variabel `.env`** (`BAY_USER`, `BAYAGENTS_DIR`, `WORKSPACE_DIR`, dan token Telegram Anda).
3. **Jalankan Installer Mandiri**:
   ```bash
   sudo ./install.sh
   ```
   *Skrip ini akan otomatis memasang paket sistem OS via `apt`, membuat Python virtualenv, menginstal dependensi pip, men-generate unit systemd sesuai path partisi Anda, dan menyalakan semua service.*

---

## 🛠️ Perintah Berguna (CLI)

- **Cek status Kanban**:
  ```bash
  ./scripts/kanban.sh
  ```
- **Kirim tugas ke tim agen**:
  ```bash
  ./scripts/task.sh "Buatkan endpoint REST API produk baru"
  ```
- **Buka dashboard 4 agen di tmux**:
  ```bash
  tmux attach -t agy_agents
  ```
- **Akses Dashboard Web**:
  Buka browser di `http://<IP_SERVER>:8888`
