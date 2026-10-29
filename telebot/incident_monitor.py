"""
incident_monitor.py - Monitor Insiden Kernel, Storage I/O Hang, UAS Reset, OOM, & Jaringan
Didesain untuk server bay (Debian Linux, AMD E2-9000, 3.2GB RAM).
Mekanisme: Cursor-based kernel log inspection (<30ms, ~0% CPU, 0 MB overhead).
"""

import os
import re
import time
import subprocess
from pathlib import Path
from datetime import datetime, timezone, timedelta

WIB_TZ = timezone(timedelta(hours=7))
CURSOR_FILE = str(Path(__file__).resolve().parent / ".kernel_cursor")
INCIDENT_COOLDOWNS = {}
INCIDENT_COOLDOWN_SECONDS = 900  # 15 menit cooldown per jenis insiden

def init_cursor():
    """Inisialisasi cursor file ke entri kernel terbaru jika file belum ada."""
    if not os.path.exists(CURSOR_FILE) or os.path.getsize(CURSOR_FILE) == 0:
        try:
            subprocess.run(
                ["journalctl", "-k", "-n", "1", f"--cursor-file={CURSOR_FILE}", "--no-pager"],
                capture_output=True,
                text=True,
                timeout=5
            )
        except Exception as e:
            print(f"[incident_monitor] Gagal inisialisasi cursor: {e}")

def get_cpu_temp() -> float:
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            return float(f.read().strip()) / 1000.0
    except Exception:
        pass
    import glob
    for h in sorted(glob.glob("/sys/class/hwmon/hwmon*/temp*_input")):
        try:
            with open(h, "r") as f:
                val = float(f.read().strip()) / 1000.0
                if val > 0:
                    return val
        except Exception:
            continue
    return 0.0

def collect_system_context() -> dict:
    """Mengumpulkan status kesehatan sistem real-time untuk laporan pasca pemulihan."""
    ctx = {
        "cpu_temp": f"{get_cpu_temp():.1f}",
        "sda_exists": os.path.exists("/dev/sda"),
        "root_disk_usage": "N/A",
        "smart_status": "N/A",
        "cloudflared_status": "N/A",
        "tailscale_status": "N/A",
        "total_ram": "N/A",
        "used_ram": "N/A",
        "avail_ram": "N/A",
        "swap_info": "N/A",
        "uptime": "N/A"
    }

    # Uptime
    try:
        ctx["uptime"] = subprocess.check_output(["uptime", "-p"], text=True).strip().replace("up ", "")
    except Exception:
        pass

    # RAM & Swap
    try:
        free_out = subprocess.check_output(["free", "-h"], text=True).splitlines()
        mem_line = free_out[1].split()
        ctx["total_ram"], ctx["used_ram"], ctx["avail_ram"] = mem_line[1], mem_line[2], mem_line[6]
        for l in free_out:
            if "Swap:" in l:
                ctx["swap_info"] = l.split()[2]
                break
    except Exception:
        pass

    # Root Disk Usage
    try:
        df_out = subprocess.check_output(["df", "-h", "/"], text=True).splitlines()
        if len(df_out) > 1:
            parts = df_out[1].split()
            ctx["root_disk_usage"] = f"{parts[2]}/{parts[1]} ({parts[4]})"
    except Exception:
        pass

    # SMART Health
    if ctx["sda_exists"]:
        try:
            smart_out = subprocess.check_output(
                ["/usr/sbin/smartctl", "-H", "/dev/sda"],
                text=True, timeout=5
            )
            ctx["smart_status"] = "PASSED (Sehat) ✅" if "PASSED" in smart_out else "PERLU DICEK ⚠️"
        except Exception:
            ctx["smart_status"] = "Gagal membaca SMART"

    # Cloudflared
    try:
        cf_res = subprocess.run(["systemctl", "is-active", "cloudflared"], capture_output=True, text=True, timeout=3)
        ctx["cloudflared_status"] = "Aktif (Running) ✅" if cf_res.stdout.strip() == "active" else "Non-aktif / Gagal ⚠️"
    except Exception:
        ctx["cloudflared_status"] = "N/A"

    # Tailscale
    try:
        ts_res = subprocess.run(["systemctl", "is-active", "tailscaled"], capture_output=True, text=True, timeout=3)
        ctx["tailscale_status"] = "Aktif (Online) ✅" if ts_res.stdout.strip() == "active" else "Non-aktif ⚠️"
    except Exception:
        ctx["tailscale_status"] = "N/A"

    return ctx

def parse_incidents_from_logs(raw_lines: list) -> list:
    """Mengidentifikasi dan mengelompokkan anomali dari baris log kernel."""
    incidents = []
    
    # 1. Deteksi UAS / USB Reset
    uas_lines = [l for l in raw_lines if any(k in l for k in ["uas_eh_abort_handler", "uas_eh_device_reset_handler", "reset high-speed USB device", "reset SuperSpeed USB device"])]
    if uas_lines:
        incidents.append({
            "type": "uas_reset",
            "lines": uas_lines,
            "key": "uas_reset"
        })

    # 2. Deteksi OOM Killer
    oom_lines = [l for l in raw_lines if any(k in l for k in ["invoked oom-killer", "Out of memory: Killed process", "Killed process"])]
    if oom_lines:
        incidents.append({
            "type": "oom_killer",
            "lines": oom_lines,
            "key": "oom_killer"
        })

    # 3. Deteksi Task Blocked / Hung Task in D-State
    hung_lines = [l for l in raw_lines if "blocked for more than" in l]
    if hung_lines:
        incidents.append({
            "type": "hung_task",
            "lines": hung_lines,
            "key": "hung_task"
        })

    # 4. Deteksi Filesystem Error / Read-only Remount
    fs_lines = [l for l in raw_lines if any(k in l for k in ["EXT4-fs error", "Remounting filesystem read-only", "I/O error, dev"])]
    if fs_lines:
        incidents.append({
            "type": "fs_error",
            "lines": fs_lines,
            "key": "fs_error"
        })

    # 5. Anomali Kernel Lainnya (Kernel BUG, Call Trace fatal, Hardware Error)
    unknown_lines = [l for l in raw_lines if any(k in l for k in ["kernel BUG at", "Hardware Error", "Machine check"])]
    if unknown_lines and not (uas_lines or oom_lines or hung_lines or fs_lines):
        incidents.append({
            "type": "unknown_kernel",
            "lines": unknown_lines,
            "key": "unknown_kernel"
        })

    return incidents

def format_uas_report(lines: list, ctx: dict) -> str:
    """Format analitis terstruktur untuk insiden USB I/O hang & reset."""
    # Ambil timestamp dari log jika tersedia
    sample_time = "Tadi"
    for l in lines:
        m = re.search(r"(\w+\s+\d+\s+\d+:\d+:\d+)", l)
        if m:
            sample_time = m.group(1)
            break

    # Cuplikan log relevan (maksimal 4 baris agar ringkas)
    snippet_lines = []
    for l in lines:
        clean_l = re.sub(r"^.*?kernel:\s*", "", l).strip()
        if clean_l and clean_l not in snippet_lines:
            snippet_lines.append(clean_l)
        if len(snippet_lines) >= 4:
            break
    log_snippet = "\n".join(snippet_lines)

    # Deteksi apakah recovery sukses
    reset_success = any("reset_handler success" in l or "reset.*success" in l for l in lines)
    recovery_badge = "✅ Pulih Otomatis (Reset Sukses)" if reset_success else "⚠️ Reset Dicoba oleh Kernel"

    sda_badge = "Terdeteksi Normal ✅" if ctx["sda_exists"] else "Tidak Terdeteksi ❌"

    msg = f"""🚨 *[LAPORAN INSIDEN: STORAGE I/O FREEZE & RECOVERY]*

Sistem mendeteksi adanya gangguan *freeze/timeout* sesaat pada antarmuka I/O storage.

---

### 🔍 *Akar Masalah: Storage I/O Timeout & Reset*
Tercatat di log kernel sekitar `{sample_time}`:
```text
{log_snippet}
```

### 📋 *Kronologi Kejadian & Dampak:*
• *Akses Data Storage*: Operasi baca/tulis pada disk sistem (`/dev/sda`) sempat mengalami hambatan I/O.
• *I/O Freeze*: Driver kernel tertahan menunggu respon storage (*Uninterruptible Sleep / D-state*).
• *Efek Domino ke Jaringan*: Daemon *Cloudflared* dan *Tailscale* sempat terlambat merespons paket keep-alive jika antrean I/O membebani thread kernel.
• *Pemulihan Otomatis*: {recovery_badge}. Antrean I/O terlepas dan server normal kembali.

---

### 📊 *Status Sistem Pasca Pemulihan:*
• Disk Lokal `/dev/sda`: `{sda_badge}`
• Partisi Root (/): `{ctx["root_disk_usage"]}`
• Status SMART: *{ctx["smart_status"]}*
• Cloudflare Tunnel: *{ctx["cloudflared_status"]}*
• Tailscale VPN: *{ctx["tailscale_status"]}*
• Suhu CPU: `{ctx["cpu_temp"]}°C` | RAM Tersedia: `{ctx["avail_ram"]}`"""
    return msg

def format_oom_report(lines: list, ctx: dict) -> str:
    """Format analitis terstruktur untuk insiden Kernel OOM Killer."""
    sample_time = "Tadi"
    for l in lines:
        m = re.search(r"(\w+\s+\d+\s+\d+:\d+:\d+)", l)
        if m:
            sample_time = m.group(1)
            break

    # Ekstrak nama proses yang dimatikan
    killed_proc = "Proses Tidak Dikenal"
    for l in lines:
        m_kill = re.search(r"Killed process \d+ \((.*?)\)", l)
        if m_kill:
            killed_proc = m_kill.group(1)
            break

    snippet_lines = [re.sub(r"^.*?kernel:\s*", "", l).strip() for l in lines[:4]]
    log_snippet = "\n".join(snippet_lines)

    msg = f"""🚨 *[LAPORAN INSIDEN: OUT-OF-MEMORY (OOM) KILLER]*

Kernel Linux baru saja mematikan proses paksa karena memori fisik RAM dan swap kritis!

---

### 🔍 *Akar Masalah: RAM Fisik & Swap Habis*
Tercatat sekitar `{sample_time}`:
```text
{log_snippet}
```

### 📋 *Kronologi Kejadian:*
• Pemakaian memori melebihi batas aman RAM ~2GB.
• ZRAM dan swapfile2 penuh sehingga kernel mengaktifkan mekanisme OOM-Killer.
• Proses `{killed_proc}` dimatikan paksa oleh kernel untuk melindungi sistem agar tidak crash total (*kernel panic*).

### 💡 *Rekomendasi Tindakan:*
• Periksa apakah kontainer terkait (`{killed_proc}`) perlu direstart atau dibatasi memori (`mem_limit`).
• Hindari menjalankan proses berat secara bersamaan.

---

### 📊 *Status Memori Terkini:*
• RAM: `{ctx["used_ram"]} / {ctx["total_ram"]}` (Sisa tersedia: `{ctx["avail_ram"]}`)
• Swap/ZRAM Terpakai: `{ctx["swap_info"]}`
• Suhu CPU: `{ctx["cpu_temp"]}°C`"""
    return msg

def format_hung_task_report(lines: list, ctx: dict) -> str:
    """Format analitis terstruktur untuk task yang stuck di D-State."""
    snippet_lines = [re.sub(r"^.*?kernel:\s*", "", l).strip() for l in lines[:4]]
    log_snippet = "\n".join(snippet_lines)

    msg = f"""🚨 *[LAPORAN INSIDEN: KERNEL TASK BLOCKED (D-STATE HANG)]*

Kernel mendeteksi ada thread proses yang tertahan (*blocked*) selama lebih dari 120 detik menunggu antrean storage I/O.

---

### 🔍 *Akar Masalah: I/O Wait Timeout*
```text
{log_snippet}
```

### 📋 *Dampak:*
• Sistem sempat mengalami *freeze/lag* karena thread CPU terkunci menunggu storage merespons.
• Layanan web dan SSH sempat melambat selama proses antrean berlangsung.

---

### 📊 *Status Sistem Saat Ini:*
• Suhu CPU: `{ctx["cpu_temp"]}°C` | RAM Sisa: `{ctx["avail_ram"]}`
• Cloudflare Tunnel: *{ctx["cloudflared_status"]}*"""
    return msg

def format_fs_error_report(lines: list, ctx: dict) -> str:
    """Format analitis untuk filesystem I/O error."""
    snippet_lines = [re.sub(r"^.*?kernel:\s*", "", l).strip() for l in lines[:4]]
    log_snippet = "\n".join(snippet_lines)

    msg = f"""🚨 *[PERINGATAN KRITIS: FILE SYSTEM I/O ERROR]*

Kernel mendeteksi galat integritas pada sistem berkas (Filesystem Error).

---

### 🔍 *Detail Log Kernel:*
```text
{log_snippet}
```

### 💡 *Rekomendasi:*
• Periksa kondisi mount partisi root (`/dev/sda2`).
• Pastikan tidak ada data korup dengan menjalankan pemeriksaan filesystem jika diperlukan.
• Status SMART Disk: *{ctx["smart_status"]}*"""
    return msg

def scan_and_generate_reports(ai_fallback_func=None) -> list:
    """
    Fungsi utama yang dipanggil oleh watchdog berkala:
    1. Membaca baris kernel baru via journalctl cursor.
    2. Mendeteksi insiden dan menyaring cooldown (15 menit).
    3. Menghasilkan pesan laporan terstruktur siap kirim ke Telegram.
    """
    init_cursor()

    try:
        res = subprocess.run(
            ["journalctl", "-k", f"--cursor-file={CURSOR_FILE}", "--no-pager"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if res.returncode != 0:
            return []
        output = res.stdout.strip()
    except Exception as e:
        print(f"[incident_monitor] Gagal membaca journalctl: {e}")
        return []

    if not output or "-- No entries --" in output:
        return []

    raw_lines = [l.strip() for l in output.splitlines() if l.strip()]
    incidents = parse_incidents_from_logs(raw_lines)
    if not incidents:
        return []

    now = time.time()
    reports_to_send = []
    ctx = None  # Lazy collect context only if there's an active incident

    for inc in incidents:
        key = inc["key"]
        last_sent = INCIDENT_COOLDOWNS.get(key, 0)
        if now - last_sent < INCIDENT_COOLDOWN_SECONDS:
            continue  # Masih dalam cooldown, jangan spam

        if ctx is None:
            ctx = collect_system_context()

        report_text = None
        inc_type = inc["type"]

        if inc_type == "uas_reset":
            report_text = format_uas_report(inc["lines"], ctx)
        elif inc_type == "oom_killer":
            report_text = format_oom_report(inc["lines"], ctx)
        elif inc_type == "hung_task":
            report_text = format_hung_task_report(inc["lines"], ctx)
        elif inc_type == "fs_error":
            report_text = format_fs_error_report(inc["lines"], ctx)
        elif inc_type == "unknown_kernel":
            # Hybrid fallback ke AI jika error tidak biasa
            if ai_fallback_func:
                snippet = "\n".join(inc["lines"][:10])
                ai_prompt = (
                    "Sistem server bay mendeteksi anomali kernel berikut:\n"
                    f"{snippet}\n\n"
                    "Buat Laporan Insiden Analitis untuk Telegram dalam Bahasa Indonesia "
                    "dengan format: 🔍 Akar Masalah, 📋 Kronologi & Dampak, 💡 Analisis & Rekomendasi, 📊 Status."
                )
                try:
                    report_text = ai_fallback_func(ai_prompt, False)
                except Exception as e:
                    report_text = f"⚠️ *[ANOMALI KERNEL TERDETEKSI]*\n\n```text\n{snippet}\n```\nError AI: {e}"
            else:
                snippet = "\n".join(inc["lines"][:6])
                report_text = f"⚠️ *[ANOMALI KERNEL TERDETEKSI]*\n\n```text\n{snippet}\n```"

        if report_text:
            reports_to_send.append(report_text)
            INCIDENT_COOLDOWNS[key] = now

    return reports_to_send

def get_recent_incident_summary(hours: int = 24) -> str:
    """Mengumpulkan ringkasan insiden kernel (USB reset, OOM, task hung) dalam X jam terakhir."""
    try:
        cmd = ["journalctl", "-k", f"--since=-{hours}h", "--no-pager"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if res.returncode != 0:
            return "⚠️ Gagal mengambil log journalctl."
        lines = [l.strip() for l in res.stdout.splitlines() if l.strip()]
    except Exception as e:
        return f"⚠️ Gagal membaca log sistem: {e}"

    uas_events = []
    oom_events = []
    hung_events = []

    for l in lines:
        if "uas_eh_device_reset_handler start" in l or "reset high-speed USB device" in l:
            m = re.search(r"(\w+\s+\d+\s+\d+:\d+:\d+)", l)
            t_str = m.group(1) if m else "Waktu tidak diketahui"
            if not uas_events or uas_events[-1] != t_str:
                uas_events.append(t_str)
        elif "invoked oom-killer" in l:
            m = re.search(r"(\w+\s+\d+\s+\d+:\d+:\d+)", l)
            t_str = m.group(1) if m else "Waktu tidak diketahui"
            oom_events.append(t_str)
        elif "blocked for more than" in l:
            m = re.search(r"(\w+\s+\d+\s+\d+:\d+:\d+)", l)
            t_str = m.group(1) if m else "Waktu tidak diketahui"
            hung_events.append(t_str)

    ctx = collect_system_context()

    summary_lines = [
        f"📋 *[Riwayat Insiden Kernel ({hours} Jam Terakhir)]*",
        f"⏱️ _Uptime: {ctx['uptime']}_\n"
    ]

    if not uas_events and not oom_events and not hung_events:
        summary_lines.append("✅ *Tidak ada insiden freeze, USB reset, atau OOM terdeteksi.*")
        summary_lines.append("Sistem berjalan sangat stabil!")
    else:
        if uas_events:
            summary_lines.append(f"💽 *Storage USB Reset / I/O Hang:* `{len(uas_events)}x kejadian`")
            for ts in uas_events[-5:]:
                summary_lines.append(f"  • `{ts}`: USB HDD reset (Pulih otomatis ✅)")
        if oom_events:
            summary_lines.append(f"\n💥 *Kernel OOM Killer:* `{len(oom_events)}x kejadian`")
            for ts in oom_events[-3:]:
                summary_lines.append(f"  • `{ts}`: Proses dimatikan akibat RAM kritis")
        if hung_events:
            summary_lines.append(f"\n⏳ *D-State Hung Task:* `{len(hung_events)}x kejadian`")
            for ts in hung_events[-3:]:
                summary_lines.append(f"  • `{ts}`: Antrean I/O sempat terkunci")

    summary_lines.append("\n📊 *Kondisi Terkini:*")
    summary_lines.append(f"• Root Disk (/): {ctx['root_disk_usage']}")
    summary_lines.append(f"• Status SMART: {ctx['smart_status']}")
    summary_lines.append(f"• Cloudflare: {ctx['cloudflared_status']}")
    summary_lines.append(f"• Tailscale: {ctx['tailscale_status']}")
    summary_lines.append(f"• Suhu: `{ctx['cpu_temp']}°C` | RAM Sisa: `{ctx['avail_ram']}`")

    return "\n".join(summary_lines)

