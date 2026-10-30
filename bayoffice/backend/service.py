import os
import json
import time
import glob
import csv
import io
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

from storage import atomic_read_json, atomic_write_json

CURRENT_DIR = Path(__file__).resolve().parent
BAYOFFICE_DIR = CURRENT_DIR.parent
ROOT_BAYAGENTS = BAYOFFICE_DIR.parent
ROOT_ENV_FILE = ROOT_BAYAGENTS / ".env"
if ROOT_ENV_FILE.exists():
    load_dotenv(dotenv_path=ROOT_ENV_FILE)
elif (BAYOFFICE_DIR / ".env").exists():
    load_dotenv(dotenv_path=BAYOFFICE_DIR / ".env")

BAYAGENTS_DIR = Path(os.getenv("BAYAGENTS_DIR", str(ROOT_BAYAGENTS)))
WORKSPACE_DIR = Path(os.getenv("WORKSPACE_DIR", str(Path.home())))
DATA_DIR = Path(os.getenv("DATA_DIR", str(BAYAGENTS_DIR / "data")))
SCRIPTS_DIR = Path(os.getenv("SCRIPTS_DIR", str(BAYAGENTS_DIR / "scripts")))
TELEBOT_DIR = Path(os.getenv("TELEBOT_DIR", str(BAYAGENTS_DIR / "telebot")))

KANBAN_PATH = os.getenv("KANBAN_PATH", str(DATA_DIR / "kanban.json"))
PROJECTS_PATH = os.getenv("PROJECTS_PATH", str(DATA_DIR / "projects.json"))
TELEBOT_SCRIPT = os.getenv("TELEBOT_SCRIPT", str(TELEBOT_DIR / "bot.py"))
START_AGENTS_SCRIPT = os.getenv("START_AGENTS_SCRIPT", str(SCRIPTS_DIR / "start_agents.sh"))
TMUX_SESSION_NAME = os.getenv("TMUX_SESSION_NAME", "agy_agents")

TELEBOT_VENV_PYTHON = TELEBOT_DIR / ".venv" / "bin" / "python"
TELEBOT_PYTHON = str(TELEBOT_VENV_PYTHON) if TELEBOT_VENV_PYTHON.exists() else "python3"

def launch_agents_daemon(task_summary: str = ""):
    """Menjalankan launcher agen di cgroup independen (session.slice) via systemd-run agar tidak mati saat bayoffice direstart."""
    cmd = [
        "sudo", "systemd-run",
        "--slice=session.slice",
        "--uid=bay", "--gid=bay",
        str(START_AGENTS_SCRIPT), "daemon"
    ]
    if task_summary:
        cmd.append(task_summary)
    subprocess.Popen(cmd)

AGENT_PANES = {
    "LUHUT": f"{TMUX_SESSION_NAME}:0.0",
    "GIBRAN": f"{TMUX_SESSION_NAME}:0.1",
    "JOKOWI": f"{TMUX_SESSION_NAME}:0.2",
    "PRABOWO": f"{TMUX_SESSION_NAME}:0.3"
}

def get_kanban_data() -> Dict[str, Any]:
    """Membaca isi kanban.json dengan aman menggunakan atomic reader."""
    if not os.path.exists(KANBAN_PATH):
        return {"tasks": [], "mtime": 0}
    try:
        mtime = os.path.getmtime(KANBAN_PATH)
        data = atomic_read_json(KANBAN_PATH, default={"tasks": []})
        data["mtime"] = mtime
        return data
    except Exception as e:
        return {"tasks": [], "error": str(e), "mtime": 0}

def get_system_metrics() -> Dict[str, Any]:
    """Membaca metrik RAM dan CPU tanpa overhead tinggi."""
    metrics = {
        "ram_total": "3.2 GiB",
        "ram_used": "1.0 GiB",
        "ram_available": "2.2 GiB",
        "ram_percent": 31,
        "load_avg": [0.0, 0.0, 0.0],
        "tmux_active": False
    }
    
    # 1. CPU Load
    try:
        metrics["load_avg"] = [round(x, 2) for x in os.getloadavg()]
    except Exception:
        pass
        
    # 2. RAM dari /proc/meminfo
    try:
        mem_info = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    mem_info[key] = int(val)
        
        total_kb = mem_info.get("MemTotal", 0)
        avail_kb = mem_info.get("MemAvailable", 0)
        used_kb = total_kb - avail_kb
        
        if total_kb > 0:
            metrics["ram_total"] = f"{total_kb / 1024 / 1024:.1f} GiB"
            metrics["ram_used"] = f"{used_kb / 1024 / 1024:.1f} GiB"
            metrics["ram_available"] = f"{avail_kb / 1024 / 1024:.1f} GiB"
            metrics["ram_percent"] = round((used_kb / total_kb) * 100)
    except Exception:
        pass

    # 3. Status Sesi Tmux
    try:
        res = subprocess.run(["tmux", "has-session", "-t", "agy_agents"], capture_output=True)
        metrics["tmux_active"] = (res.returncode == 0)
    except Exception:
        metrics["tmux_active"] = False

    return metrics

def get_agents_status() -> Dict[str, Any]:
    """Mendapatkan status kerja, animasi, dan pesan terakhir 4 agen."""
    k_data = get_kanban_data()
    tasks = k_data.get("tasks", [])
    sys_metrics = get_system_metrics()
    tmux_active = sys_metrics["tmux_active"]

    agents = {
        "LUHUT": {
            "name": "LUHUT",
            "role": "Lead Orchestrator & DevOps",
            "state": "sleeping" if not tmux_active else "idle",
            "current_task": None,
            "bubble_text": "Hibernasi (hemat RAM)." if not tmux_active else "Memantau sprint dari Executive Suite.",
            "desk": {"x": 220, "y": 125, "color": "#FF6B6B"}
        },
        "GIBRAN": {
            "name": "GIBRAN",
            "role": "QA Auditor & Security",
            "state": "sleeping" if not tmux_active else "idle",
            "current_task": None,
            "bubble_text": "Standby pasif." if not tmux_active else "Standby di kantin, siap audit QA.",
            "desk": {"x": 860, "y": 125, "color": "#4ECDC4"}
        },
        "JOKOWI": {
            "name": "JOKOWI",
            "role": "Backend Engineer",
            "state": "sleeping" if not tmux_active else "idle",
            "current_task": None,
            "bubble_text": "Standby pasif." if not tmux_active else "Santai di kantin, backend siap.",
            "desk": {"x": 540, "y": 125, "color": "#45B7D1"}
        },
        "PRABOWO": {
            "name": "PRABOWO",
            "role": "Frontend Engineer",
            "state": "sleeping" if not tmux_active else "idle",
            "current_task": None,
            "bubble_text": "Standby pasif." if not tmux_active else "Rehat di game room, frontend siap.",
            "desk": {"x": 700, "y": 125, "color": "#FFA07A"}
        },
        "HABIBIE": {
            "name": "HABIBIE",
            "role": "Chief Architect",
            "state": "idle",
            "current_task": None,
            "bubble_text": "Cinta Sejati",
            "desk": {"x": 345, "y": 88, "color": "#8B5CF6"}
        }
    }

    # Jika tmux aktif, cari tugas aktif di kanban
    for t in reversed(tasks):
        if not isinstance(t, dict):
            continue
        status = str(t.get("status", "")).strip().lower()
        assignee = str(t.get("assignee", "")).strip().upper()
        
        # In-Progress
        if status in ["in-progress", "in progress", "working"]:
            if assignee in agents and agents[assignee]["state"] != "working":
                if tmux_active or assignee == "HABIBIE":
                    agents[assignee]["state"] = "working"
                    agents[assignee]["current_task"] = t
                    agents[assignee]["bubble_text"] = f"Mengerjakan {t.get('id')}: {t.get('title', '')[:30]}..."
        
        # QA-Review
        elif status in ["qa-review", "qa review"]:
            if tmux_active and agents["GIBRAN"]["state"] != "reviewing":
                agents["GIBRAN"]["state"] = "reviewing"
                agents["GIBRAN"]["current_task"] = t
                agents["GIBRAN"]["bubble_text"] = f"Audit QA {t.get('id')} ({assignee})..."

    return agents

def register_project_if_new(project_id: str, project_name: str = None) -> None:
    """Mendaftarkan proyek baru ke projects.json secara otomatis jika belum ada."""
    path = PROJECTS_PATH
    clean_id = project_id.lower().strip().replace(" ", "-")
    if not clean_id or not os.path.exists(path):
        return
    try:
        registry = atomic_read_json(path, default={"projects": {}})
        projects = registry.get("projects", {})
        if clean_id not in projects:
            root_dir = str(WORKSPACE_DIR / clean_id)
            os.makedirs(root_dir, exist_ok=True)
            projects[clean_id] = {
                "id": clean_id,
                "name": project_name or clean_id.capitalize(),
                "description": f"Proyek {clean_id} di {root_dir}",
                "root_dir": root_dir,
                "frontend_dir": f"{root_dir}/frontend" if os.path.exists(f"{root_dir}/frontend") else root_dir,
                "backend_dir": f"{root_dir}/backend" if os.path.exists(f"{root_dir}/backend") else root_dir,
                "tech_stack": {
                    "frontend": "Web Frontend",
                    "backend": "Backend API"
                },
                "dual_server_sync": False,
                "rules_file": f"{root_dir}/RULES.md" if os.path.exists(f"{root_dir}/RULES.md") else str(WORKSPACE_DIR / "GEMINI.md")
            }
            registry["projects"] = projects
            atomic_write_json(path, registry)
    except Exception as e:
        print(f"Error registering project {clean_id}: {e}")

def get_projects_registry() -> Dict[str, Any]:
    """Membaca daftar proyek dari projects.json."""
    return atomic_read_json(PROJECTS_PATH, default={"projects": {}})

def get_expanded_system_metrics() -> Dict[str, Any]:
    """Membaca metrik mendalam (RAM, CPU, Suhu APU, Swap, Disk, Services) tanpa overhead."""
    metrics = get_system_metrics()

    # 1. Swap / ZRAM dari /proc/meminfo
    metrics["swap_total"] = "0 MiB"
    metrics["swap_used"] = "0 MiB"
    metrics["swap_percent"] = 0
    try:
        mem_info = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    mem_info[parts[0].strip()] = int(parts[1].strip().split()[0])
        s_total = mem_info.get("SwapTotal", 0)
        s_free = mem_info.get("SwapFree", 0)
        s_used = s_total - s_free
        if s_total > 0:
            metrics["swap_total"] = f"{s_total / 1024:.0f} MiB"
            metrics["swap_used"] = f"{s_used / 1024:.0f} MiB"
            metrics["swap_percent"] = round((s_used / s_total) * 100)
    except Exception:
        pass

    # 2. Suhu APU (k10temp hwmon)
    metrics["cpu_temp"] = "N/A"
    metrics["cpu_temp_val"] = 0
    try:
        for path in glob.glob("/sys/class/hwmon/hwmon*/name"):
            with open(path, "r") as f:
                if "k10temp" in f.read():
                    tpath = path.replace("name", "temp1_input")
                    with open(tpath, "r") as tf:
                        c_val = round(int(tf.read().strip()) / 1000, 1)
                        metrics["cpu_temp"] = f"{c_val}°C"
                        metrics["cpu_temp_val"] = c_val
                    break
    except Exception:
        pass

    # 3. Disk Usage Partisi Root
    metrics["disk_total"] = "0 GiB"
    metrics["disk_used"] = "0 GiB"
    metrics["disk_free"] = "0 GiB"
    metrics["disk_percent"] = 0
    try:
        st = os.statvfs("/")
        total_b = st.f_blocks * st.f_frsize
        free_b = st.f_bavail * st.f_frsize
        used_b = total_b - free_b
        if total_b > 0:
            metrics["disk_total"] = f"{total_b / (1024**3):.1f} GiB"
            metrics["disk_used"] = f"{used_b / (1024**3):.1f} GiB"
            metrics["disk_free"] = f"{free_b / (1024**3):.1f} GiB"
            metrics["disk_percent"] = round((used_b / total_b) * 100)
    except Exception:
        pass

    # 4. Status Service Vital
    services = ["bayoffice.service", "nginx.service", "postgresql.service", "cloudflared.service"]
    service_status = {}
    for s in services:
        try:
            r = subprocess.run(["systemctl", "is-active", s], capture_output=True, text=True)
            service_status[s.replace(".service", "")] = r.stdout.strip()
        except Exception:
            service_status[s.replace(".service", "")] = "unknown"
    metrics["services"] = service_status

    return metrics

def get_agent_logs(agent_name: str, lines: int = 120) -> Dict[str, Any]:
    """Membaca riwayat terminal terakhir dari panel tmux agen."""
    agent_name = agent_name.upper().strip()
    if agent_name not in AGENT_PANES:
        return {"success": False, "error": f"Agen '{agent_name}' tidak dikenal. Pilihan: LUHUT, GIBRAN, JOKOWI, PRABOWO"}

    pane = AGENT_PANES[agent_name]
    res_tmux = subprocess.run(["tmux", "has-session", "-t", TMUX_SESSION_NAME], capture_output=True)
    if res_tmux.returncode != 0:
        return {
            "success": True,
            "agent": agent_name,
            "pane": pane,
            "active": False,
            "logs": f"💤 Sesi tmux '{TMUX_SESSION_NAME}' saat ini sedang HIBERNASI (hemat RAM).\nPanel agen {agent_name} akan otomatis aktif saat ada tugas baru yang dikirimkan via Web UI atau Telegram."
        }

    try:
        capture_cmd = ["tmux", "capture-pane", "-p", "-t", pane, "-S", f"-{lines}"]
        result = subprocess.run(capture_cmd, capture_output=True, text=True, errors="replace", timeout=3)
        raw_output = result.stdout
        if not raw_output.strip():
            raw_output = f"(Panel {agent_name} aktif di {pane}, belum ada log baru)"
        return {
            "success": True,
            "agent": agent_name,
            "pane": pane,
            "active": True,
            "logs": raw_output
        }
    except Exception as e:
        return {"success": False, "error": f"Gagal membaca capture pane: {e}"}

def delete_task(task_id: str) -> Dict[str, Any]:
    """Menghapus tugas dari kanban.json."""
    task_id = task_id.strip()
    try:
        k_data = atomic_read_json(KANBAN_PATH, default={"tasks": []})
        tasks = k_data.get("tasks", [])
        found = False
        new_tasks = []
        deleted_task = None
        for t in tasks:
            if isinstance(t, dict) and t.get("id") == task_id:
                found = True
                deleted_task = t
            else:
                new_tasks.append(t)
        if not found:
            return {"success": False, "error": f"Tugas {task_id} tidak ditemukan"}
        k_data["tasks"] = new_tasks
        atomic_write_json(KANBAN_PATH, k_data)
        return {"success": True, "message": f"Tugas {task_id} berhasil dihapus", "task": deleted_task}
    except Exception as e:
        return {"success": False, "error": f"Gagal menghapus tugas: {e}"}

def update_task_status(task_id: str, new_status: str, notes: Optional[str] = None) -> Dict[str, Any]:
    """Memperbarui status tugas secara manual di kanban.json."""
    valid_statuses = ["To-Do", "In-Progress", "QA-Review", "Done"]
    normalized_status = None
    for vs in valid_statuses:
        if vs.lower() == new_status.lower().strip():
            normalized_status = vs
            break
    if not normalized_status:
        return {"success": False, "error": f"Status tidak valid: {new_status}"}

    try:
        k_data = atomic_read_json(KANBAN_PATH, default={"tasks": []})
        found = False
        target_t = None
        for t in k_data.get("tasks", []):
            if isinstance(t, dict) and t.get("id") == task_id:
                found = True
                target_t = t
                t["status"] = normalized_status
                if notes:
                    t["notes"] = notes
                if normalized_status == "Done" and not t.get("completed_at"):
                    t["completed_at"] = datetime.now().astimezone().isoformat()
                break
        if not found:
            return {"success": False, "error": f"Tugas {task_id} tidak ditemukan"}
        atomic_write_json(KANBAN_PATH, k_data)
        return {"success": True, "message": f"Status {task_id} diperbarui menjadi {normalized_status}", "task": target_t}
    except Exception as e:
        return {"success": False, "error": f"Gagal memperbarui status: {e}"}

def retry_task(task_id: str) -> Dict[str, Any]:
    """Menjalankan ulang (retry) tugas yang ada ke agen terkait."""
    try:
        k_data = atomic_read_json(KANBAN_PATH, default={"tasks": []})
        found = False
        target_t = None
        for t in k_data.get("tasks", []):
            if isinstance(t, dict) and t.get("id") == task_id:
                found = True
                target_t = t
                t["status"] = "In-Progress"
                t["notes"] = f"Tugas di-retry manual via BayOffice Web UI pada {datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S')}."
                break
        if not found:
            return {"success": False, "error": f"Tugas {task_id} tidak ditemukan"}
        atomic_write_json(KANBAN_PATH, k_data)

        assignee = target_t.get("assignee", "LUHUT")
        pane = AGENT_PANES.get(assignee, f"{TMUX_SESSION_NAME}:0.0")
        target_dir = target_t.get("target_dir", str(WORKSPACE_DIR))
        instr = target_t.get("description", target_t.get("title", ""))
        project_id = target_t.get("project", "bayoffice")

        res = subprocess.run(["tmux", "has-session", "-t", TMUX_SESSION_NAME], capture_output=True)
        if res.returncode == 0:
            msg = f"{assignee}: Tugas {task_id} [Proyek: {project_id}] di-retry manual di {target_dir}. Lanjutkan eksekusi: '{instr}'"
            subprocess.run(["tmux", "send-keys", "-t", pane, msg, "Enter"], check=False)
        else:
            task_summary = f"{task_id} [Proyek: {project_id}] (Retry): {instr}"
            launch_agents_daemon(task_summary)

        try:
            subprocess.Popen([TELEBOT_PYTHON, TELEBOT_SCRIPT, f"[BayOffice]: 🔁 Tugas *{task_id}* di-retry manual untuk agen `{assignee}`."])
        except Exception:
            pass

        return {"success": True, "message": f"Tugas {task_id} berhasil di-retry untuk {assignee}", "task": target_t}
    except Exception as e:
        return {"success": False, "error": f"Gagal retry tugas: {e}"}

def export_kanban_csv() -> str:
    """Mengonversi seluruh tugas kanban menjadi format CSV."""
    k_data = get_kanban_data()
    tasks = k_data.get("tasks", [])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Project", "Assignee", "Status", "Title", "Description", "Created At", "Completed At", "Notes", "QA Review"])
    for t in tasks:
        if isinstance(t, dict):
            writer.writerow([
                t.get("id", ""),
                t.get("project", ""),
                t.get("assignee", ""),
                t.get("status", ""),
                t.get("title", ""),
                t.get("description", ""),
                t.get("created_at", ""),
                t.get("completed_at", ""),
                t.get("notes", ""),
                t.get("qa_review", "")
            ])
    return output.getvalue()

def dispatch_task_from_web(instruction: str, category_hint: str = "auto", project_hint: str = "auto", engine: str = "agy") -> Dict[str, Any]:
    """Mengeksekusi penugasan baru dari Web UI persis seperti /task di Telegram."""
    instruction = instruction.strip()
    if not instruction:
        return {"success": False, "error": "Instruksi tidak boleh kosong"}

    # 1. Tentukan Proyek
    instr_lower = instruction.lower()
    if project_hint and project_hint != "auto":
        project_id = project_hint.lower().strip()
    else:
        if "bayoffice" in instr_lower or "canvas" in instr_lower or "8888" in instr_lower:
            project_id = "bayoffice"
        elif "infobay" in instr_lower or "portofolio" in instr_lower or "porto" in instr_lower:
            project_id = "infobay"
        else:
            project_id = "infobay"

    project_root = str(WORKSPACE_DIR / project_id)
    register_project_if_new(project_id)

    # 2. Klasifikasi Keahlian & Target Direktori
    fe_keywords = ["frontend", "ui", "tampilan", "footer", "header", "navbar", "css", "button", "tombol", "halaman", "porto", "komponen", "vite", "react", "styling", "warna", "fab", "canvas"]
    be_keywords = ["backend", "api", "database", "migrasi", "seeder", "laravel", "controller", "tabel", "model", "sanctum", "endpoint", "query", "postgresql", "pgsql", "fastapi"]

    if category_hint == "frontend":
        is_fe, is_be = True, False
    elif category_hint == "backend":
        is_fe, is_be = False, True
    elif category_hint == "fullstack":
        is_fe, is_be = True, True
    elif category_hint == "ops":
        is_fe, is_be = False, False
    else:
        is_fe = any(k in instr_lower for k in fe_keywords)
        is_be = any(k in instr_lower for k in be_keywords)

    if is_fe and not is_be:
        category = "Frontend"
        target_agent = "PRABOWO"
        task_prefix = "TASK-FE"
        skills = ["Frontend Engineering", "UI/UX"]
        target_dir = os.path.join(project_root, "frontend") if os.path.exists(os.path.join(project_root, "frontend")) else project_root
    elif is_be and not is_fe:
        category = "Backend"
        target_agent = "JOKOWI"
        task_prefix = "TASK-BE"
        skills = ["Backend Engineering", "API & Database"]
        target_dir = os.path.join(project_root, "backend") if os.path.exists(os.path.join(project_root, "backend")) else project_root
    elif is_fe and is_be:
        category = "Fullstack"
        target_agent = "LUHUT"
        task_prefix = "TASK-FS"
        skills = ["Fullstack", "Lead Orchestrator"]
        target_dir = project_root
    else:
        category = "General"
        target_agent = "LUHUT"
        task_prefix = "TASK-OPS"
        skills = ["Lead Orchestrator", "Task Delegation"]
        target_dir = project_root

    task_id = f"{task_prefix}-01"
    now_iso = datetime.now().astimezone().isoformat()
    try:
        k_data = atomic_read_json(KANBAN_PATH, default={"tasks": []})

        existing_nums = []
        for t in k_data.get("tasks", []):
            if isinstance(t, dict):
                tid = str(t.get("id", ""))
                if tid.startswith(task_prefix + "-"):
                    part = tid.replace(task_prefix + "-", "")
                    if part.isdigit():
                        existing_nums.append(int(part))
        next_num = max(existing_nums, default=0) + 1
        task_id = f"{task_prefix}-{next_num:02d}"

        new_task_entry = {
            "id": task_id,
            "project": project_id,
            "assignee": target_agent,
            "title": (instruction[:80] + "...") if len(instruction) > 80 else instruction,
            "skills_required": skills,
            "description": instruction,
            "status": "To-Do",
            "target_dir": target_dir,
            "created_at": now_iso,
            "notes": f"Tugas baru via BayOffice Web UI [Proyek: {project_id} | {category}]. Target pelaksana: {target_agent}."
        }
        k_data.setdefault("tasks", []).append(new_task_entry)
        atomic_write_json(KANBAN_PATH, k_data)
    except Exception as e:
        return {"success": False, "error": f"Gagal menulis ke kanban.json: {e}"}

    # Jika memilih Engine 9Router: Jalankan Virtual Squad via 9Router di latar belakang
    if engine == "9router":
        try:
            import threading
            import sys
            if str(TELEBOT_DIR) not in sys.path:
                sys.path.insert(0, str(TELEBOT_DIR))
            import emergency_agent

            def run_squad_async():
                def tele_prog(p_text):
                    try:
                        subprocess.Popen(["python3", TELEBOT_SCRIPT, f"[BayOffice 9Router]:\n{p_text}"])
                    except Exception:
                        pass
                
                final_rep = emergency_agent.run_virtual_squad_9router(
                    task_instruction=instruction,
                    project_id=project_id,
                    progress_callback=tele_prog
                )
                try:
                    subprocess.Popen(["python3", TELEBOT_SCRIPT, final_rep])
                except Exception:
                    pass

            threading.Thread(target=run_squad_async, daemon=True).start()

            # Notifikasi awal Telegram
            try:
                msg = f"[BayOffice 9Router]: ⚡ Tugas baru *{task_id}* [Proyek: `{project_id}` | {category}] dialirkan ke 9Router Virtual Squad ({target_agent})."
                subprocess.Popen(["python3", TELEBOT_SCRIPT, msg])
            except Exception:
                pass

            return {
                "success": True,
                "task_id": task_id,
                "project": project_id,
                "category": category,
                "target_agent": f"{target_agent} [9Router]",
                "target_dir": target_dir,
                "engine": "9router",
                "message": f"Tugas {task_id} berhasil dialirkan ke 9Router Virtual Squad ({target_agent}) di server 146."
            }
        except Exception as e:
            return {"success": False, "error": f"Gagal menjalankan 9Router Virtual Squad: {e}"}

    # Default: Engine Antigravity (agy) -> Bangunkan atau suntikkan ke tmux
    res = subprocess.run(["tmux", "has-session", "-t", TMUX_SESSION_NAME], capture_output=True)
    if res.returncode != 0:
        task_summary = f"{task_id} [Proyek: {project_id}] ({category}): {instruction}"
        launch_agents_daemon(task_summary)
    else:
        try:
            if target_agent == "PRABOWO":
                delegation_hint = f"Tugas Frontend: Segera bangunkan PRABOWO ({TMUX_SESSION_NAME}:0.3) di {target_dir}"
            elif target_agent == "JOKOWI":
                delegation_hint = f"Tugas Backend: Segera bangunkan JOKOWI ({TMUX_SESSION_NAME}:0.2) di {target_dir}"
            else:
                delegation_hint = f"Dekomposisi tugas proyek {project_id} ke PRABOWO atau JOKOWI"

            prompt_to_luhut = (
                f"Tugas baru [Proyek: {project_id}]: '{instruction}'. Telah dicatat di kanban.json sebagai {task_id} ({category}) di {target_dir}. "
                f"ATURAN FAST-TRACK: {delegation_hint} via tmux send-keys, laporkan ke Telegram via python3 {TELEBOT_SCRIPT} '[LUHUT]: ...', "
                f"lalu MASUK STANDBY PASIF. DILARANG audit kode atau loop checking!"
            )
            subprocess.run(
                ["tmux", "send-keys", "-t", f"{TMUX_SESSION_NAME}:0.0", prompt_to_luhut, "Enter"],
                check=True
            )
        except Exception as e:
            return {"success": False, "error": f"Gagal mengirim sinyal ke tmux: {e}"}

    # Siarkan notifikasi ke Telegram
    try:
        msg = f"[BayOffice]: 💻 Tugas baru *{task_id}* [Proyek: `{project_id}` | {category}] via Web: \"{instruction[:70]}...\". Target: `{target_agent}`."
        subprocess.Popen([TELEBOT_PYTHON, TELEBOT_SCRIPT, msg])
    except Exception:
        pass

    return {
        "success": True,
        "task_id": task_id,
        "project": project_id,
        "category": category,
        "target_agent": target_agent,
        "target_dir": target_dir,
        "message": f"Tugas {task_id} [Proyek: {project_id}] berhasil diterbitkan dan diteruskan ke tim agen."
    }

# ==========================================================
# SCHEDULED TASKS (SCHEDULER / CRON) SERVICE WRAPPERS
# ==========================================================
import scheduler

def get_schedules(project: Optional[str] = None, enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    """Mengambil seluruh data task terjadwal."""
    return scheduler.get_schedules(project=project, enabled=enabled)

def get_schedule(schedule_id: str) -> Optional[Dict[str, Any]]:
    """Mengambil satu task terjadwal berdasarkan ID."""
    return scheduler.get_schedule(schedule_id)

def get_schedules_summary() -> Dict[str, Any]:
    """Mengambil ringkasan status scheduler."""
    return scheduler.get_schedules_summary()

def create_schedule(schedule_in: Dict[str, Any]) -> Dict[str, Any]:
    """Mendaftarkan task terjadwal baru."""
    return scheduler.create_schedule(schedule_in)

def update_schedule(schedule_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Memperbarui parameter task terjadwal."""
    return scheduler.update_schedule(schedule_id, updates)

def delete_schedule(schedule_id: str) -> Dict[str, Any]:
    """Menghapus task terjadwal."""
    return scheduler.delete_schedule(schedule_id)

def toggle_schedule(schedule_id: str, enabled: Optional[bool] = None) -> Dict[str, Any]:
    """Mengaktifkan atau menjeda task terjadwal."""
    return scheduler.toggle_schedule(schedule_id, enabled)

def execute_schedule_now(schedule_id: str) -> Dict[str, Any]:
    """Menjalankan task terjadwal secara manual."""
    return scheduler.execute_schedule_now(schedule_id, dispatch_fn=dispatch_task_from_web)


# ==========================================================
# IMPLEMENTATION PLANS (HABIBIE)
# ==========================================================
import plans_manager

def get_plans_list() -> List[Dict[str, Any]]:
    """Mengambil daftar seluruh implementation plan yang dirancang HABIBIE."""
    return plans_manager.list_plans()

def get_plan_detail(plan_id: str) -> Optional[Dict[str, Any]]:
    """Mengambil detail dokumen implementation plan."""
    return plans_manager.get_plan(plan_id)

def generate_plan_ai(idea: str, project: str = "bayoffice", engine: str = "9router") -> Dict[str, Any]:
    """Meminta HABIBIE menyusun implementation plan teknis."""
    return plans_manager.generate_plan_ai(idea=idea, project=project, engine=engine)

def dispatch_plan_to_kanban(plan_id: str) -> Dict[str, Any]:
    """Mendelegasikan implementation plan ke tim agen di Kanban."""
    return plans_manager.dispatch_plan_to_kanban(plan_id, dispatch_fn=dispatch_task_from_web)

def delete_plan_by_id(plan_id: str) -> Dict[str, Any]:
    """Menghapus dokumen implementation plan."""
    return plans_manager.delete_plan(plan_id)

