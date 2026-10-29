import os
import json
import asyncio
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Path Konfigurasi
CURRENT_DIR = Path(__file__).resolve().parent
BAYOFFICE_DIR = CURRENT_DIR.parent
ROOT_BAYAGENTS = BAYOFFICE_DIR.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(ROOT_BAYAGENTS / "data")))
SCHEDULES_PATH = Path(os.getenv("SCHEDULES_PATH", str(DATA_DIR / "schedules.json")))
TELEBOT_SCRIPT = os.getenv("TELEBOT_SCRIPT", str(ROOT_BAYAGENTS / "telebot" / "bot.py"))

_file_lock = threading.Lock()
_scheduler_task: Optional[asyncio.Task] = None
_stop_event = asyncio.Event()

# Presets Cron Standar
CRON_PRESETS = {
    "@hourly": "0 * * * *",
    "@daily": "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@weekly": "0 0 * * 0",
    "@monthly": "0 0 1 * *",
}


def _get_local_now() -> datetime:
    """Mengembalikan waktu saat ini dengan timezone lokal sistem."""
    return datetime.now().astimezone()


def match_cron_field(field_str: str, val: int, min_val: int, max_val: int, is_dow: bool = False) -> bool:
    """Mencocokkan satu segmen field cron (mendukung *, */N, range N-M, list N,M, step N-M/S)."""
    field_str = field_str.strip()
    if field_str == "*":
        return True

    for part in field_str.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            if "/" in part:
                sub_range, step_str = part.split("/", 1)
                step = int(step_str)
                if step <= 0:
                    return False
                if sub_range == "*":
                    start, end = min_val, max_val
                elif "-" in sub_range:
                    start, end = map(int, sub_range.split("-", 1))
                else:
                    start, end = int(sub_range), max_val

                if val in range(start, end + 1, step):
                    return True
                if is_dow and val == 0 and 7 in range(start, end + 1, step):
                    return True
            elif "-" in part:
                start, end = map(int, part.split("-", 1))
                if start <= val <= end:
                    return True
                if is_dow and val == 0 and start <= 7 <= end:
                    return True
            else:
                p_val = int(part)
                if p_val == val or (is_dow and val == 0 and p_val == 7):
                    return True
        except (ValueError, TypeError):
            continue

    return False


def validate_cron_expression(cron_expr: str) -> Tuple[bool, str]:
    """Memvalidasi ekspresi cron 5-field standar."""
    cron_expr = cron_expr.strip()
    if cron_expr in CRON_PRESETS:
        return True, CRON_PRESETS[cron_expr]

    parts = cron_expr.split()
    if len(parts) != 5:
        return False, f"Format cron harus memiliki 5 field (minute hour dom month dow), diterima {len(parts)} field."

    ranges = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 7)]
    for i, p in enumerate(parts):
        min_v, max_v = ranges[i]
        # Validasi dasar karakter
        for char in p:
            if not (char.isdigit() or char in ["*", "/", "-", ","]):
                return False, f"Karakter tidak valid '{char}' pada field {i+1} cron."

    return True, cron_expr


def calculate_next_cron_run(cron_expr: str, from_dt: Optional[datetime] = None) -> Optional[datetime]:
    """Menghitung waktu eksekusi cron berikutnya dengan algoritma fast-forwarding."""
    if from_dt is None:
        from_dt = _get_local_now()

    is_valid, normalized = validate_cron_expression(cron_expr)
    if not is_valid:
        return None

    m_expr, h_expr, dom_expr, mon_expr, dow_expr = normalized.split()

    curr = from_dt.replace(second=0, microsecond=0) + timedelta(minutes=1)
    limit_dt = curr + timedelta(days=730)  # Maksimum 2 tahun ke depan

    while curr < limit_dt:
        # 1. Cek Bulan
        if not match_cron_field(mon_expr, curr.month, 1, 12):
            if curr.month == 12:
                curr = datetime(curr.year + 1, 1, 1, 0, 0, tzinfo=curr.tzinfo)
            else:
                curr = datetime(curr.year, curr.month + 1, 1, 0, 0, tzinfo=curr.tzinfo)
            continue

        # 2. Cek Tanggal & Hari dalam Pekan
        cron_dow = (curr.weekday() + 1) % 7
        dom_match = match_cron_field(dom_expr, curr.day, 1, 31)
        dow_match = match_cron_field(dow_expr, cron_dow, 0, 6, is_dow=True)

        if dom_expr != "*" and dow_expr != "*":
            day_match = dom_match or dow_match
        else:
            day_match = dom_match and dow_match

        if not day_match:
            curr = (curr + timedelta(days=1)).replace(hour=0, minute=0)
            continue

        # 3. Cek Jam
        if not match_cron_field(h_expr, curr.hour, 0, 23):
            curr = (curr + timedelta(hours=1)).replace(minute=0)
            continue

        # 4. Cek Menit
        if not match_cron_field(m_expr, curr.minute, 0, 59):
            curr += timedelta(minutes=1)
            continue

        return curr

    return None


def calculate_next_run(schedule_type: str,
                       cron_expression: Optional[str] = None,
                       interval_minutes: Optional[int] = None,
                       run_at: Optional[str] = None,
                       from_dt: Optional[datetime] = None) -> Optional[str]:
    """Menghitung waktu eksekusi berikutnya dan mengembalikan format ISO string."""
    if from_dt is None:
        from_dt = _get_local_now()

    stype = (schedule_type or "").lower().strip()

    if stype == "cron":
        if not cron_expression:
            return None
        next_dt = calculate_next_cron_run(cron_expression, from_dt)
        return next_dt.isoformat() if next_dt else None

    elif stype == "interval":
        mins = interval_minutes or 60
        if mins <= 0:
            mins = 60
        next_dt = from_dt + timedelta(minutes=mins)
        return next_dt.isoformat()

    elif stype == "once":
        if not run_at:
            return None
        try:
            target_dt = datetime.fromisoformat(run_at.replace("Z", "+00:00"))
            if target_dt.tzinfo is None:
                target_dt = target_dt.replace(tzinfo=from_dt.tzinfo)
            if target_dt > from_dt:
                return target_dt.isoformat()
            return None
        except Exception:
            return None

    return None


def _load_schedules_unlocked() -> Dict[str, Any]:
    """Membaca file schedules.json tanpa lock internal."""
    if not SCHEDULES_PATH.exists():
        initial_data = {
            "version": "1.0",
            "updated_at": _get_local_now().isoformat(),
            "schedules": []
        }
        try:
            SCHEDULES_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(SCHEDULES_PATH, "w", encoding="utf-8") as f:
                json.dump(initial_data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
        return initial_data

    try:
        with open(SCHEDULES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "schedules" not in data:
            data["schedules"] = []
        return data
    except Exception as e:
        return {"version": "1.0", "schedules": [], "error": str(e)}


def _save_schedules_unlocked(data: Dict[str, Any]) -> bool:
    """Menyimpan data schedules ke schedules.json secara atomik."""
    try:
        data["updated_at"] = _get_local_now().isoformat()
        SCHEDULES_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = SCHEDULES_PATH.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp_path.replace(SCHEDULES_PATH)
        return True
    except Exception as e:
        print(f"Error saving schedules.json: {e}")
        return False


def get_schedules(project: Optional[str] = None, enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    """Mengambil daftar task terjadwal dengan filter opsional."""
    with _file_lock:
        data = _load_schedules_unlocked()
        schedules = data.get("schedules", [])

        filtered = []
        for s in schedules:
            if not isinstance(s, dict):
                continue
            if project and s.get("project", "").lower() != project.lower().strip():
                continue
            if enabled is not None and s.get("enabled") != enabled:
                continue
            filtered.append(s)

        return filtered


def get_schedule(schedule_id: str) -> Optional[Dict[str, Any]]:
    """Mengambil satu detail task terjadwal berdasarkan ID."""
    with _file_lock:
        data = _load_schedules_unlocked()
        for s in data.get("schedules", []):
            if isinstance(s, dict) and s.get("id") == schedule_id:
                return s
        return None


def get_schedules_summary() -> Dict[str, Any]:
    """Mengambil ringkasan status scheduler untuk dashboard dan widget."""
    with _file_lock:
        data = _load_schedules_unlocked()
        schedules = data.get("schedules", [])
        total = len(schedules)
        active = sum(1 for s in schedules if s.get("enabled", True))
        paused = total - active

        upcoming = []
        for s in schedules:
            if s.get("enabled") and s.get("next_run_at"):
                upcoming.append({
                    "id": s.get("id"),
                    "title": s.get("title"),
                    "next_run_at": s.get("next_run_at"),
                    "project": s.get("project")
                })
        upcoming.sort(key=lambda x: x["next_run_at"])

        return {
            "total": total,
            "active": active,
            "paused": paused,
            "scheduler_running": _scheduler_task is not None and not _scheduler_task.done(),
            "next_upcoming": upcoming[0] if upcoming else None,
            "updated_at": data.get("updated_at")
        }


def create_schedule(schedule_in: Dict[str, Any]) -> Dict[str, Any]:
    """Membuat task terjadwal baru."""
    title = str(schedule_in.get("title", "")).strip()
    instruction = str(schedule_in.get("instruction", "")).strip()
    if not title:
        return {"success": False, "error": "Judul (title) wajib diisi"}
    if not instruction:
        return {"success": False, "error": "Instruksi task tidak boleh kosong"}

    schedule_type = str(schedule_in.get("schedule_type", "cron")).lower().strip()
    if schedule_type not in ["cron", "interval", "once"]:
        return {"success": False, "error": "schedule_type harus 'cron', 'interval', atau 'once'"}

    cron_expr = schedule_in.get("cron_expression")
    interval_mins = schedule_in.get("interval_minutes")
    run_at = schedule_in.get("run_at")

    if schedule_type == "cron":
        if not cron_expr:
            return {"success": False, "error": "cron_expression wajib diisi untuk tipe 'cron'"}
        valid, normalized = validate_cron_expression(cron_expr)
        if not valid:
            return {"success": False, "error": f"Ekspresi cron tidak valid: {normalized}"}
        cron_expr = normalized

    elif schedule_type == "interval":
        if not interval_mins or int(interval_mins) <= 0:
            return {"success": False, "error": "interval_minutes harus berupa bilangan bulat positif"}
        interval_mins = int(interval_mins)

    elif schedule_type == "once":
        if not run_at:
            return {"success": False, "error": "run_at wajib diisi untuk tipe 'once'"}
        try:
            dt = datetime.fromisoformat(run_at.replace("Z", "+00:00"))
            if dt <= _get_local_now():
                return {"success": False, "error": "run_at harus berupa waktu di masa depan"}
        except Exception as e:
            return {"success": False, "error": f"Format run_at tidak valid (gunakan ISO 8601): {e}"}

    with _file_lock:
        data = _load_schedules_unlocked()
        schedules = data.setdefault("schedules", [])

        # Penomoran ID SCHED-01, SCHED-02, dst.
        existing_nums = []
        for s in schedules:
            if isinstance(s, dict):
                sid = str(s.get("id", ""))
                if sid.startswith("SCHED-"):
                    part = sid.replace("SCHED-", "")
                    if part.isdigit():
                        existing_nums.append(int(part))
        next_num = max(existing_nums, default=0) + 1
        new_id = f"SCHED-{next_num:02d}"

        now_iso = _get_local_now().isoformat()
        next_run = calculate_next_run(
            schedule_type=schedule_type,
            cron_expression=cron_expr,
            interval_minutes=interval_mins,
            run_at=run_at
        )

        new_schedule = {
            "id": new_id,
            "title": title,
            "instruction": instruction,
            "project": schedule_in.get("project", "bayoffice") or "bayoffice",
            "category": schedule_in.get("category", "auto") or "auto",
            "engine": schedule_in.get("engine", "agy") or "agy",
            "schedule_type": schedule_type,
            "cron_expression": cron_expr,
            "interval_minutes": interval_mins,
            "run_at": run_at,
            "enabled": schedule_in.get("enabled", True) if schedule_in.get("enabled") is not None else True,
            "created_at": now_iso,
            "updated_at": now_iso,
            "last_run_at": None,
            "next_run_at": next_run,
            "run_count": 0,
            "last_status": None,
            "last_result": None,
            "last_task_id": None
        }

        schedules.append(new_schedule)
        _save_schedules_unlocked(data)

    return {
        "success": True,
        "message": f"Task terjadwal {new_id} berhasil dibuat",
        "schedule": new_schedule
    }


def update_schedule(schedule_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Memperbarui parameter task terjadwal."""
    with _file_lock:
        data = _load_schedules_unlocked()
        target_s = None
        for s in data.get("schedules", []):
            if isinstance(s, dict) and s.get("id") == schedule_id:
                target_s = s
                break

        if not target_s:
            return {"success": False, "error": f"Task terjadwal {schedule_id} tidak ditemukan"}

        # Validasi update fields
        if "title" in updates and updates["title"]:
            target_s["title"] = str(updates["title"]).strip()
        if "instruction" in updates and updates["instruction"]:
            target_s["instruction"] = str(updates["instruction"]).strip()
        if "project" in updates and updates["project"]:
            target_s["project"] = str(updates["project"]).strip()
        if "category" in updates and updates["category"]:
            target_s["category"] = str(updates["category"]).strip()
        if "engine" in updates and updates["engine"]:
            target_s["engine"] = str(updates["engine"]).strip()

        stype_changed = False
        if "schedule_type" in updates and updates["schedule_type"]:
            new_stype = str(updates["schedule_type"]).lower().strip()
            if new_stype in ["cron", "interval", "once"]:
                target_s["schedule_type"] = new_stype
                stype_changed = True

        if "cron_expression" in updates:
            new_cron = updates["cron_expression"]
            if new_cron:
                valid, normalized = validate_cron_expression(new_cron)
                if not valid:
                    return {"success": False, "error": f"Ekspresi cron tidak valid: {normalized}"}
                target_s["cron_expression"] = normalized
            else:
                target_s["cron_expression"] = None

        if "interval_minutes" in updates:
            if updates["interval_minutes"] is not None:
                mins = int(updates["interval_minutes"])
                if mins <= 0:
                    return {"success": False, "error": "interval_minutes harus positif"}
                target_s["interval_minutes"] = mins
            else:
                target_s["interval_minutes"] = None

        if "run_at" in updates:
            target_s["run_at"] = updates["run_at"]

        if "enabled" in updates and updates["enabled"] is not None:
            target_s["enabled"] = bool(updates["enabled"])

        target_s["updated_at"] = _get_local_now().isoformat()

        # Recalculate next run jika parameter jadwal atau enabled berubah
        if target_s.get("enabled"):
            target_s["next_run_at"] = calculate_next_run(
                schedule_type=target_s.get("schedule_type", "cron"),
                cron_expression=target_s.get("cron_expression"),
                interval_minutes=target_s.get("interval_minutes"),
                run_at=target_s.get("run_at")
            )
        else:
            target_s["next_run_at"] = None

        _save_schedules_unlocked(data)

    return {
        "success": True,
        "message": f"Task terjadwal {schedule_id} berhasil diperbarui",
        "schedule": target_s
    }


def delete_schedule(schedule_id: str) -> Dict[str, Any]:
    """Menghapus task terjadwal dari schedules.json."""
    with _file_lock:
        data = _load_schedules_unlocked()
        schedules = data.get("schedules", [])
        new_list = []
        deleted = None

        for s in schedules:
            if isinstance(s, dict) and s.get("id") == schedule_id:
                deleted = s
            else:
                new_list.append(s)

        if not deleted:
            return {"success": False, "error": f"Task terjadwal {schedule_id} tidak ditemukan"}

        data["schedules"] = new_list
        _save_schedules_unlocked(data)

    return {
        "success": True,
        "message": f"Task terjadwal {schedule_id} berhasil dihapus",
        "schedule": deleted
    }


def toggle_schedule(schedule_id: str, enabled: Optional[bool] = None) -> Dict[str, Any]:
    """Mengaktifkan atau menonaktifkan task terjadwal."""
    with _file_lock:
        data = _load_schedules_unlocked()
        target_s = None
        for s in data.get("schedules", []):
            if isinstance(s, dict) and s.get("id") == schedule_id:
                target_s = s
                break

        if not target_s:
            return {"success": False, "error": f"Task terjadwal {schedule_id} tidak ditemukan"}

        if enabled is None:
            target_s["enabled"] = not target_s.get("enabled", True)
        else:
            target_s["enabled"] = bool(enabled)

        target_s["updated_at"] = _get_local_now().isoformat()

        if target_s["enabled"]:
            target_s["next_run_at"] = calculate_next_run(
                schedule_type=target_s.get("schedule_type", "cron"),
                cron_expression=target_s.get("cron_expression"),
                interval_minutes=target_s.get("interval_minutes"),
                run_at=target_s.get("run_at")
            )
        else:
            target_s["next_run_at"] = None

        _save_schedules_unlocked(data)

    state_str = "diaktifkan" if target_s["enabled"] else "dijeda"
    return {
        "success": True,
        "message": f"Task terjadwal {schedule_id} berhasil {state_str}",
        "schedule": target_s
    }


def execute_schedule_now(schedule_id: str, dispatch_fn=None) -> Dict[str, Any]:
    """Mengeksekusi task terjadwal secara manual tanpa menunggu timer."""
    # Ambil data schedule
    with _file_lock:
        data = _load_schedules_unlocked()
        target_s = None
        for s in data.get("schedules", []):
            if isinstance(s, dict) and s.get("id") == schedule_id:
                target_s = s
                break

    if not target_s:
        return {"success": False, "error": f"Task terjadwal {schedule_id} tidak ditemukan"}

    return _run_single_schedule(target_s, dispatch_fn=dispatch_fn, is_manual=True)


def _run_single_schedule(target_s: Dict[str, Any], dispatch_fn=None, is_manual: bool = False) -> Dict[str, Any]:
    """Eksekusi internal satu task terjadwal dan pembaruan riwayat."""
    sched_id = target_s.get("id")
    title = target_s.get("title", "")
    instruction = target_s.get("instruction", "")
    project = target_s.get("project", "bayoffice")
    category = target_s.get("category", "auto")
    engine = target_s.get("engine", "agy")
    stype = target_s.get("schedule_type", "cron")

    # Jika dispatch_fn tidak diberikan, import service secara lazy
    if dispatch_fn is None:
        try:
            import service
            dispatch_fn = service.dispatch_task_from_web
        except Exception as e:
            return {"success": False, "error": f"Gagal memuat service dispatcher: {e}"}

    # Format instruksi eksekusi
    full_instruction = f"[Jadwal: {sched_id}] {instruction}"
    exec_result = dispatch_fn(
        instruction=full_instruction,
        category_hint=category,
        project_hint=project,
        engine=engine
    )

    now_iso = _get_local_now().isoformat()
    success = exec_result.get("success", False)
    task_id = exec_result.get("task_id")
    result_msg = exec_result.get("message") or exec_result.get("error", "Eksekusi selesai")

    # Update metadata schedule di file
    with _file_lock:
        data = _load_schedules_unlocked()
        for s in data.get("schedules", []):
            if isinstance(s, dict) and s.get("id") == sched_id:
                s["last_run_at"] = now_iso
                s["run_count"] = (s.get("run_count") or 0) + 1
                s["last_status"] = "success" if success else "failed"
                s["last_result"] = result_msg
                s["last_task_id"] = task_id
                s["updated_at"] = now_iso

                # Hitung jadwal berikutnya
                if stype == "once":
                    s["enabled"] = False
                    s["next_run_at"] = None
                elif s.get("enabled"):
                    s["next_run_at"] = calculate_next_run(
                        schedule_type=stype,
                        cron_expression=s.get("cron_expression"),
                        interval_minutes=s.get("interval_minutes"),
                        run_at=s.get("run_at")
                    )
                break
        _save_schedules_unlocked(data)

    # Siarkan ke Telegram
    try:
        import subprocess
        mode_str = "Manual Trigger" if is_manual else "Otomatis"
        status_emoji = "⏰" if success else "⚠️"
        tg_msg = (
            f"[BayOffice Scheduler]: {status_emoji} *{sched_id}* ({title})\n"
            f"Mode: `{mode_str}` | Proyek: `{project}`\n"
            f"Hasil: Task `{task_id or 'N/A'}` - {result_msg[:100]}"
        )
        subprocess.Popen(["python3", TELEBOT_SCRIPT, tg_msg])
    except Exception:
        pass

    return {
        "success": success,
        "schedule_id": sched_id,
        "task_id": task_id,
        "message": f"Task terjadwal {sched_id} dieksekusi: {result_msg}",
        "dispatch_result": exec_result
    }


def check_and_run_due_schedules(dispatch_fn=None) -> List[Dict[str, Any]]:
    """Memeriksa semua task terjadwal aktif dan mengeksekusi yang sudah jatuh tempo."""
    now_dt = _get_local_now()
    due_schedules = []

    with _file_lock:
        data = _load_schedules_unlocked()
        for s in data.get("schedules", []):
            if not isinstance(s, dict):
                continue
            if not s.get("enabled"):
                continue
            next_run_str = s.get("next_run_at")
            if not next_run_str:
                continue

            try:
                next_run_dt = datetime.fromisoformat(next_run_str.replace("Z", "+00:00"))
                if next_run_dt.tzinfo is None:
                    next_run_dt = next_run_dt.replace(tzinfo=now_dt.tzinfo)
                if now_dt >= next_run_dt:
                    due_schedules.append(s)
            except Exception:
                continue

    results = []
    for s in due_schedules:
        res = _run_single_schedule(s, dispatch_fn=dispatch_fn, is_manual=False)
        results.append(res)

    return results


async def scheduler_loop():
    """Background worker async loop yang memantau waktu jatuh tempo setiap 10 detik."""
    while not _stop_event.is_set():
        try:
            # Jalankan pemeriksaan task yang jatuh tempo dalam thread pool agar tidak memblokir event loop
            await asyncio.to_thread(check_and_run_due_schedules)
        except Exception as e:
            print(f"Error in scheduler_loop: {e}")

        try:
            # Tunggu 10 detik atau hingga stop_event diset
            await asyncio.wait_for(_stop_event.wait(), timeout=10.0)
            break
        except asyncio.TimeoutError:
            pass


async def start_scheduler_loop() -> asyncio.Task:
    """Memulai worker background scheduler."""
    global _scheduler_task, _stop_event
    _stop_event.clear()
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(scheduler_loop())
    return _scheduler_task


async def stop_scheduler_loop():
    """Menghentikan worker background scheduler dengan rapi."""
    global _scheduler_task, _stop_event
    _stop_event.set()
    if _scheduler_task and not _scheduler_task.done():
        try:
            await asyncio.wait_for(_scheduler_task, timeout=5.0)
        except asyncio.TimeoutError:
            _scheduler_task.cancel()
    _scheduler_task = None
