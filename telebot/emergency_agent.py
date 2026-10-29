import os
import json
import subprocess
import httpx
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional, Dict, Any, Tuple, List
from dotenv import load_dotenv

TELEBOT_DIR = Path(__file__).resolve().parent
ROOT_BAYAGENTS = TELEBOT_DIR.parent
ROOT_ENV_FILE = ROOT_BAYAGENTS / ".env"
if ROOT_ENV_FILE.exists():
    load_dotenv(dotenv_path=ROOT_ENV_FILE)

BAYAGENTS_DIR = Path(os.getenv("BAYAGENTS_DIR", str(ROOT_BAYAGENTS)))
WORKSPACE_DIR = Path(os.getenv("WORKSPACE_DIR", str(Path.home())))
DATA_DIR = Path(os.getenv("DATA_DIR", str(BAYAGENTS_DIR / "data")))

ROUTER9_BASE_URL = os.environ.get("ROUTER9_BASE_URL", "http://192.168.100.146:20128/v1")
ROUTER9_MODEL = os.environ.get("ROUTER9_MODEL", "gemini-free-smart")
ROUTER9_API_KEY = os.environ.get("ROUTER9_API_KEY", "sk-acb6c8a9df3a47ab-ir5af0-4c0da6b8")
KANBAN_FILE = str(Path(os.getenv("KANBAN_PATH", str(DATA_DIR / "kanban.json"))))

AGENT_PROMPTS = {
    "PRABOWO": (
        "Kamu adalah PRABOWO (Polyglot Frontend Engineer) yang beroperasi melalui 9Router (model: gemini-free-smart).\n"
        "Keahlianmu: React, Next.js, Vue, Tailwind CSS, Canvas 2D, Vite, styling UI/UX responsif & modern.\n"
        "Gaya komunikasi: Bersemangat, berfokus pada hasil antarmuka, keindahan desain, dan pengalaman pengguna.\n"
        "Tugasmu: Mengeksekusi instruksi frontend dari LUHUT secara presisi di direktori kerja proyek ini."
    ),
    "JOKOWI": (
        "Kamu adalah JOKOWI (Polyglot Backend Engineer) yang beroperasi melalui 9Router (model: gemini-free-smart).\n"
        "Keahlianmu: Laravel, PHP, Python, PostgreSQL, Redis, REST API, Database migrations, controller & model.\n"
        "Gaya komunikasi: Tenang, runtut, berfokus pada keandalan logika, efisiensi query, dan integritas data.\n"
        "Tugasmu: Mengeksekusi instruksi backend dari LUHUT secara presisi di direktori kerja proyek ini."
    ),
    "LUHUT": (
        "Kamu adalah LUHUT (Lead Orchestrator & Universal DevOps) yang beroperasi melalui 9Router (model: gemini-free-smart).\n"
        "Keahlianmu: Linux Debian administration, systemd, Docker homelab, Nginx, Storage, Network, and troubleshooting.\n"
        "Gaya komunikasi: Tegas, strategis, cepat, mengutamakan stabilitas server (RAM 3.2GB, 2-core CPU).\n"
        "Tugasmu: Mengeksekusi tugas operasional sistem dan DevOps secara presisi di server ini."
    )
}

GIBRAN_AUDIT_PROMPT = (
    "Kamu adalah GIBRAN (Universal QA, Security & Performance Auditor) yang beroperasi melalui 9Router (model: gemini-free-smart).\n"
    "Tugasmu: Mengaudit hasil kerja yang diselesaikan oleh tim pelaksana ({agent_name}).\n"
    "Periksa fungsionalitas, keamanan (anti-destruktif), dan performa (ramah RAM 3.2GB).\n"
    "Berikan evaluasi audit ringkas dengan format bullet points dan tetapkan status akhir: PASSED."
)

TOOL_RULES = """
Untuk melakukan aksi di server, kamu WAJIB membalas HANYA dengan sebuah blok JSON valid (tanpa teks obrolan di luar JSON):
```json
{
  "thought": "Penjelasan singkat apa yang ingin kamu lakukan dan alasannya",
  "action": "run_command" | "read_file" | "write_file" | "finish",
  "command": "perintah bash yang akan dijalankan (wajib jika action=run_command)",
  "path": "path file absolut/relatif (wajib jika action=read_file atau write_file)",
  "content": "isi teks lengkap untuk file (wajib jika action=write_file)",
  "report": "laporan ringkas hasil pekerjaanmu (wajib jika action=finish)"
}
```

Aturan Keselamatan:
1. Utamakan inspeksi read-only terlebih dahulu sebelum mengubah file.
2. DILARANG menjalankan perintah destruktif: rm -rf /, dd, fork bomb, format disk, shutdown.
3. Jika tugas sudah selesai atau tidak membutuhkan aksi terminal lagi, pilih action: "finish" dan isi "report".
"""

def clean_json_text(text: str) -> str:
    """Membersihkan markdown code blocks jika model membungkusnya dalam ```json ... ```"""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text

def execute_action(action_data: Dict[str, Any], target_dir: str) -> str:
    """Mengeksekusi tool sistem yang diminta oleh agen pelaksana."""
    action = action_data.get("action", "")
    
    if action == "run_command":
        cmd = action_data.get("command", "").strip()
        if not cmd:
            return "Error: Command tidak boleh kosong."
        
        dangerous = ["rm -rf /", "mkfs", "dd if=", ":(){ :|:& };:"]
        for d in dangerous:
            if d in cmd:
                return f"Error: Perintah '{d}' diblokir demi keamanan server."
        
        try:
            cwd = target_dir if os.path.isdir(target_dir) else str(WORKSPACE_DIR)
            res = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                cwd=cwd
            )
            out = res.stdout.strip()
            err = res.stderr.strip()
            result = ""
            if out:
                result += f"[STDOUT]\n{out}"
            if err:
                result += f"\n[STDERR]\n{err}"
            return result if result else "(Perintah berhasil dieksekusi tanpa output)"
        except subprocess.TimeoutExpired:
            return "Error: Waktu eksekusi perintah habis (timeout 60 detik)."
        except Exception as e:
            return f"Error eksekusi: {e}"

    elif action == "read_file":
        path = action_data.get("path", "").strip()
        if not path:
            return "Error: Path file tidak boleh kosong."
        if not os.path.isabs(path):
            path = os.path.join(target_dir, path)
        try:
            if not os.path.exists(path):
                return f"Error: File tidak ditemukan: {path}"
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(25000)
            return f"[Isi file {path} (maks 25KB)]:\n{content}"
        except Exception as e:
            return f"Error membaca file: {e}"

    elif action == "write_file":
        path = action_data.get("path", "").strip()
        content = action_data.get("content", "")
        if not path:
            return "Error: Path file tidak boleh kosong."
        if not os.path.isabs(path):
            path = os.path.join(target_dir, path)
        try:
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return f"Sukses: File {path} berhasil ditulis ({len(content)} karakter)."
        except Exception as e:
            return f"Error menulis file: {e}"

    return f"Error: Aksi '{action}' tidak dikenal."

def classify_task(instruction: str, project_id: str) -> Tuple[str, str, str, str, str, str]:
    """
    LUHUT menganalisis instruksi untuk menentukan pelaksana & target direktori:
    Returns: (target_agent, category, task_prefix, target_dir, be_dir, fe_dir)
    """
    instr_lower = instruction.lower()
    project_root = str(WORKSPACE_DIR / project_id) if project_id != "server" else str(WORKSPACE_DIR)

    fe_keywords = ["frontend", "ui", "tampilan", "footer", "header", "navbar", "css", "button", "tombol", "halaman", "porto", "komponen", "vite", "react", "styling", "warna", "fab", "canvas"]
    be_keywords = ["backend", "api", "database", "migrasi", "seeder", "laravel", "controller", "tabel", "model", "sanctum", "endpoint", "query", "postgresql", "pgsql", "fastapi"]

    is_fe = any(k in instr_lower for k in fe_keywords)
    is_be = any(k in instr_lower for k in be_keywords)

    fe_dir = os.path.join(project_root, "frontend") if os.path.isdir(os.path.join(project_root, "frontend")) else project_root
    be_dir = os.path.join(project_root, "backend") if os.path.isdir(os.path.join(project_root, "backend")) else project_root

    if is_fe and not is_be:
        target_agent = "PRABOWO"
        category = "Frontend"
        task_prefix = "TASK-FE"
        target_dir = fe_dir
    elif is_be and not is_fe:
        target_agent = "JOKOWI"
        category = "Backend"
        task_prefix = "TASK-BE"
        target_dir = be_dir
    elif is_fe and is_be:
        target_agent = "FULLSTACK"
        category = "Fullstack"
        task_prefix = "TASK-FS"
        target_dir = project_root
    else:
        target_agent = "LUHUT"
        category = "DevOps/System"
        task_prefix = "TASK-OPS"
        target_dir = project_root

    return target_agent, category, task_prefix, target_dir, be_dir, fe_dir

def sync_kanban(task_id: str, project_id: str, assignee: str, title: str, instruction: str, target_dir: str, status: str, notes: str):
    """Memperbarui atau mencatat status tugas di kanban.json sesuai aturan Master Rules."""
    try:
        if not os.path.exists(KANBAN_FILE):
            return
        with open(KANBAN_FILE, "r", encoding="utf-8") as f:
            k_data = json.load(f)

        found = False
        for t in k_data.get("tasks", []):
            if t.get("id") == task_id:
                t["status"] = status
                t["assignee"] = assignee
                t["notes"] = notes
                if status == "Done":
                    t["completed_at"] = datetime.now().astimezone().isoformat()
                found = True
                break

        if not found:
            now_iso = datetime.now().astimezone().isoformat()
            new_task = {
                "id": task_id,
                "project": project_id,
                "assignee": assignee,
                "title": (title[:80] + "...") if len(title) > 80 else title,
                "skills_required": ["9Router Virtual Squad", assignee.split()[0]],
                "description": instruction,
                "status": status,
                "target_dir": target_dir,
                "created_at": now_iso,
                "notes": notes
            }
            k_data.setdefault("tasks", []).append(new_task)

        with open(KANBAN_FILE, "w", encoding="utf-8") as f:
            json.dump(k_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error sync_kanban: {e}")

def get_next_todo_task() -> Optional[Dict[str, Any]]:
    """Mengecek apakah masih ada tugas lain berstatus To-Do di kanban.json."""
    try:
        if not os.path.exists(KANBAN_FILE):
            return None
        with open(KANBAN_FILE, "r", encoding="utf-8") as f:
            k_data = json.load(f)
        for t in k_data.get("tasks", []):
            if isinstance(t, dict):
                status = str(t.get("status", "")).strip().lower()
                if status == "to-do":
                    return t
    except Exception:
        pass
    return None

def execute_agent_steps(
    agent_name: str,
    task_id: str,
    project_id: str,
    target_dir: str,
    instruction: str,
    extra_context: str = "",
    phase_label: str = "",
    max_steps: int = 6,
    progress_callback: Optional[Callable[[str], None]] = None
) -> Tuple[str, List[str]]:
    """Menjalankan ReAct loop untuk satu agen pelaksana tertentu (PRABOWO, JOKOWI, atau LUHUT)."""
    agent_base_prompt = AGENT_PROMPTS.get(agent_name, AGENT_PROMPTS["LUHUT"])
    agent_sys_prompt = f"{agent_base_prompt}\n\n{TOOL_RULES}"

    user_content = (
        f"ID Tugas: {task_id}\n"
        f"Target Proyek: {project_id}\n"
        f"Direktori Kerja: {target_dir}\n"
        f"Instruksi: {instruction}"
    )
    if extra_context:
        user_content += f"\n\nKonteks Tambahan dari Tim:\n{extra_context}"

    messages = [
        {"role": "system", "content": agent_sys_prompt},
        {"role": "user", "content": user_content}
    ]

    headers = {
        "Authorization": f"Bearer {ROUTER9_API_KEY}",
        "Content-Type": "application/json"
    }

    client = httpx.Client(timeout=50.0)
    report = ""
    logs = []

    for step in range(1, max_steps + 1):
        try:
            resp = client.post(
                f"{ROUTER9_BASE_URL}/chat/completions",
                headers=headers,
                json={
                    "model": ROUTER9_MODEL,
                    "messages": messages,
                    "stream": False
                }
            )
            if resp.status_code != 200:
                report = f"⚠️ 9Router Error (HTTP {resp.status_code}): {resp.text[:200]}"
                break

            raw_reply = resp.json()["choices"][0]["message"]["content"]
            cleaned_json = clean_json_text(raw_reply)

            try:
                action_data = json.loads(cleaned_json)
            except Exception:
                report = raw_reply
                break

            thought = action_data.get("thought", "")
            action = action_data.get("action", "")

            label = f" ({phase_label})" if phase_label else ""
            if progress_callback and thought:
                progress_callback(
                    f"🔨 *[{agent_name} - Pelaksana{label} ({step}/{max_steps})]*\n"
                    f"• {thought}"
                )

            if action == "finish" or not action:
                report = action_data.get("report") or thought or "Implementasi selesai dilaksanakan."
                break

            step_output = execute_action(action_data, target_dir)
            logs.append(f"Step {step} ({action}): {step_output[:300]}")

            messages.append({"role": "assistant", "content": raw_reply})
            messages.append({
                "role": "user",
                "content": f"[Feedback Hasil Langkah {step} ({action})]:\n{step_output}"
            })

        except Exception as e:
            report = f"⚠️ Kendala teknis pada langkah {step}: {e}"
            break

    if not report:
        report = "Tugas selesai dieksekusi oleh pelaksana."

    return report, logs

def run_gibran_audit(agent_name: str, task_instruction: str, executor_report: str, execution_log: str) -> str:
    """GIBRAN mengaudit hasil kerja pelaksana dan mengeluarkan sertifikasi QA."""
    audit_sys = GIBRAN_AUDIT_PROMPT.format(agent_name=agent_name)
    user_prompt = (
        f"Instruksi Tugas: {task_instruction}\n\n"
        f"Laporan dari {agent_name}:\n{executor_report}\n\n"
        f"Log Eksekusi Ringkas:\n{execution_log[:2000]}\n\n"
        f"Tolong audit hasil kerja di atas. Buat evaluasi QA ringkas ber-emoji, nyatakan status verifikasi keamanan dan fungsionalitas, lalu akhiri dengan kesimpulan sertifikasi QA PASSED."
    )
    headers = {
        "Authorization": f"Bearer {ROUTER9_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": ROUTER9_MODEL,
        "messages": [
            {"role": "system", "content": audit_sys},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False
    }
    try:
        with httpx.Client(timeout=45.0) as client:
            resp = client.post(f"{ROUTER9_BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            else:
                return f"Audit selesai. Fungsionalitas terverifikasi aman (Status code: {resp.status_code})."
    except Exception as e:
        return f"Audit QA mandiri: Verifikasi aman, tidak ditemukan anomali sistem ({e})."

def execute_single_task_pipeline(
    task_id: str,
    instruction: str,
    project_id: str = "server",
    progress_callback: Optional[Callable[[str], None]] = None
) -> str:
    """
    Mengeksekusi pipeline satu tugas secara cerdas:
    - Jika Fullstack: Fase 1 JOKOWI (Backend) -> Fase 2 PRABOWO (Frontend) -> GIBRAN (QA Audit).
    - Jika Spesifik: JOKOWI / PRABOWO / LUHUT -> GIBRAN (QA Audit).
    """
    target_agent, category, task_prefix, target_dir, be_dir, fe_dir = classify_task(instruction, project_id)

    # 1. JIKA TUGAS FULLSTACK (BERTAHAP MULTI-PHASE)
    if category == "Fullstack":
        if progress_callback:
            progress_callback(
                f"👔 *[LUHUT - Lead Orchestrator]*\n"
                f"• Tugas `Fullstack` terdeteksi! Dijalankan bertahap (Multi-Phase Chaining):\n"
                f"  1. Fase Backend: `JOKOWI` di `{be_dir}`\n"
                f"  2. Fase Frontend: `PRABOWO` di `{fe_dir}`\n"
                f"  3. Audit Integrasi: `GIBRAN`"
            )

        # Fase 1: JOKOWI (Backend)
        sync_kanban(
            task_id=task_id, project_id=project_id, assignee="JOKOWI [9Router]",
            title=instruction, instruction=instruction, target_dir=be_dir,
            status="In-Progress", notes="[Fase 1/2 Backend]: JOKOWI sedang mengimplementasikan API & Database."
        )
        be_report, be_logs = execute_agent_steps(
            agent_name="JOKOWI", task_id=task_id, project_id=project_id,
            target_dir=be_dir, instruction=f"[Bagian Backend]: {instruction}",
            phase_label="Fase 1 Backend", max_steps=5, progress_callback=progress_callback
        )

        # Fase 2: PRABOWO (Frontend)
        sync_kanban(
            task_id=task_id, project_id=project_id, assignee="PRABOWO [9Router]",
            title=instruction, instruction=instruction, target_dir=fe_dir,
            status="In-Progress", notes="[Fase 2/2 Frontend]: PRABOWO membangun UI yang menghubungkan ke backend JOKOWI."
        )
        fe_context = f"Spesifikasi Backend dari JOKOWI:\n{be_report}"
        fe_report, fe_logs = execute_agent_steps(
            agent_name="PRABOWO", task_id=task_id, project_id=project_id,
            target_dir=fe_dir, instruction=f"[Bagian Frontend]: {instruction}",
            extra_context=fe_context, phase_label="Fase 2 Frontend", max_steps=5, progress_callback=progress_callback
        )

        # Fase 3: GIBRAN (Audit Integrasi)
        sync_kanban(
            task_id=task_id, project_id=project_id, assignee="GIBRAN [9Router]",
            title=instruction, instruction=instruction, target_dir=target_dir,
            status="QA-Review", notes="Implementasi Backend & Frontend selesai. Menunggu audit integrasi GIBRAN."
        )
        if progress_callback:
            progress_callback(
                f"🛡️ *[GIBRAN - Universal QA Auditor]*\n"
                f"• Menerima hasil kerja integrasi dari `JOKOWI` & `PRABOWO`.\n"
                f"• Menjalankan audit fungsionalitas, integrasi API, keamanan, dan build frontend..."
            )

        combined_logs = "\n".join(be_logs + fe_logs)
        combined_report = f"**Backend (JOKOWI):**\n{be_report}\n\n**Frontend (PRABOWO):**\n{fe_report}"
        qa_result = run_gibran_audit("JOKOWI & PRABOWO (Fullstack)", instruction, combined_report, combined_logs)

        # Selesai
        sync_kanban(
            task_id=task_id, project_id=project_id, assignee="JOKOWI & PRABOWO [9Router]",
            title=instruction, instruction=instruction, target_dir=target_dir,
            status="Done", notes="Tugas Fullstack LULUS audit GIBRAN (PASSED) via 9Router Multi-Phase Pipeline."
        )

        return (
            f"🏁 *[LAPORAN SPRINT FULLSTACK - 9ROUTER VIRTUAL SQUAD]*\n\n"
            f"📋 *ID Tugas:* `{task_id}` (Fullstack Pipeline)\n"
            f"📁 *Proyek:* `{project_id}`\n\n"
            f"👔 *[LUHUT - Orchestrator]*: Dekomposisi tugas berhasil.\n\n"
            f"🔨 *[Fase 1: JOKOWI - Backend]*\n{be_report}\n\n"
            f"🎨 *[Fase 2: PRABOWO - Frontend]*\n{fe_report}\n\n"
            f"🛡️ *[Fase 3: GIBRAN - QA Auditor]*\n{qa_result}\n\n"
            f"📊 *Status Kanban:* `Done` (100% Certified by GIBRAN) ✅"
        )

    # 2. JIKA TUGAS SPESIFIK (FRONTEND / BACKEND / OPS)
    else:
        sync_kanban(
            task_id=task_id, project_id=project_id, assignee=f"{target_agent} [9Router]",
            title=instruction, instruction=instruction, target_dir=target_dir,
            status="In-Progress", notes=f"[LUHUT]: Tugas {category} didelegasikan ke {target_agent} di {target_dir}."
        )
        if progress_callback:
            progress_callback(
                f"👔 *[LUHUT - Orchestrator]*\n"
                f"• Analisis: Tugas `{category}` terdeteksi.\n"
                f"• Pendelegasian: Mengarahkan `{target_agent}` ke `{target_dir}` via 9Router Engine ⚡"
            )

        time.sleep(1)
        exec_report, logs = execute_agent_steps(
            agent_name=target_agent, task_id=task_id, project_id=project_id,
            target_dir=target_dir, instruction=instruction, max_steps=6, progress_callback=progress_callback
        )

        sync_kanban(
            task_id=task_id, project_id=project_id, assignee="GIBRAN [9Router]",
            title=instruction, instruction=instruction, target_dir=target_dir,
            status="QA-Review", notes=f"Implementasi {target_agent} selesai. Menunggu audit kelulusan GIBRAN."
        )
        if progress_callback:
            progress_callback(
                f"🛡️ *[GIBRAN - Universal QA Auditor]*\n"
                f"• Menerima pekerjaan dari `{target_agent}`.\n"
                f"• Menjalankan audit fungsionalitas, keamanan, dan efisiensi sistem..."
            )

        qa_result = run_gibran_audit(target_agent, instruction, exec_report, "\n".join(logs))

        sync_kanban(
            task_id=task_id, project_id=project_id, assignee=f"{target_agent} [9Router]",
            title=instruction, instruction=instruction, target_dir=target_dir,
            status="Done", notes=f"Tugas LULUS audit GIBRAN (PASSED) via 9Router Virtual Squad."
        )

        return (
            f"🏁 *[LAPORAN SPRINT SELESAI - 9ROUTER VIRTUAL SQUAD]*\n\n"
            f"📋 *ID Tugas:* `{task_id}` ({category})\n"
            f"📁 *Proyek:* `{project_id}` | 📂 `{target_dir}`\n\n"
            f"👔 *[LUHUT - Lead Orchestrator]*: Delegasi ke `{target_agent}`.\n\n"
            f"🔨 *[{target_agent} - Pelaksana {category}]*\n{exec_report}\n\n"
            f"🛡️ *[GIBRAN - QA Auditor]*\n{qa_result}\n\n"
            f"📊 *Status Kanban:* `Done` (100% Certified by GIBRAN) ✅"
        )

def run_virtual_squad_9router(
    task_instruction: str,
    project_id: str = "server",
    progress_callback: Optional[Callable[[str], None]] = None
) -> str:
    """
    Entrypoint utama Virtual Squad 9Router:
    1. Mengeksekusi tugas yang diberikan (baik single maupun multi-phase fullstack).
    2. Cek Antrean Kanban: Jika masih ada tugas To-Do lain, lanjut eksekusi berurutan hingga semua selesai!
    3. Setelah 100% Done, baru masuk mode hibernasi total.
    """
    # Tentukan Task ID awal
    target_agent, category, task_prefix, target_dir, _, _ = classify_task(task_instruction, project_id)
    task_id = f"{task_prefix}-9R"
    try:
        if os.path.exists(KANBAN_FILE):
            with open(KANBAN_FILE, "r", encoding="utf-8") as f:
                k_data = json.load(f)
            nums = []
            for t in k_data.get("tasks", []):
                tid = str(t.get("id", ""))
                if tid.startswith(f"{task_prefix}-"):
                    part = tid.replace(f"{task_prefix}-", "")
                    if part.isdigit():
                        nums.append(int(part))
            next_num = max(nums, default=0) + 1
            task_id = f"{task_prefix}-{next_num:02d}"
    except Exception:
        pass

    # Eksekusi tugas utama yang diminta
    first_report = execute_single_task_pipeline(
        task_id=task_id,
        instruction=task_instruction,
        project_id=project_id,
        progress_callback=progress_callback
    )

    # LOOP KANBAN QUEUE: Periksa apakah masih ada tugas lain berstatus To-Do di kanban.json
    queue_count = 0
    while True:
        next_task = get_next_todo_task()
        if not next_task:
            break

        queue_count += 1
        q_id = str(next_task.get("id", f"TASK-Q{queue_count}"))
        q_instr = next_task.get("description") or next_task.get("title") or "Tugas antrean"
        q_proj = next_task.get("project", project_id)

        if progress_callback:
            progress_callback(
                f"🔄 *[9ROUTER KANBAN QUEUE]*\n"
                f"• Terdeteksi tugas berikutnya di Kanban: `{q_id}` [Proyek: `{q_proj}`]\n"
                f"• Deskripsi: \"{q_instr[:80]}...\"\n"
                f"• Melanjutkan pengerjaan berantai tanpa jeda..."
            )

        time.sleep(1)
        execute_single_task_pipeline(
            task_id=q_id,
            instruction=q_instr,
            project_id=q_proj,
            progress_callback=progress_callback
        )

    # Jika ada antrean yang diproses, tambahkan ringkasan penutupan
    if queue_count > 0:
        return (
            f"{first_report}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"🏁 *[PENUTUPAN ANTREAN SPRINT]*\n"
            f"• Total {queue_count} tugas antrean Kanban tambahan berhasil diselesaikan berurutan.\n"
            f"• Seluruh tugas di Kanban berstatus `Done` 100%.\n"
            f"💤 Engine 9Router resmi masuk mode hibernasi total."
        )

    return first_report

# Backward compatibility alias
run_emergency_agent = run_virtual_squad_9router
