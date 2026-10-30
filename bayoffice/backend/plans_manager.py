"""
BayOffice - Implementation Plans Manager
Mengelola dokumen Implementation Plan teknis yang dirancang oleh HABIBIE.
Dokumen disimpan lokal di bayagents/data/plans/ dalam format Markdown + YAML Frontmatter.
Direktori ini di-ignore oleh Git untuk keamanan dan privasi homelab.
"""

import os
import re
import json
import time
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml
import httpx

# Zona Waktu Server (WIB / UTC+7)
WIB_TZ = timezone(timedelta(hours=7))

BACKEND_DIR = Path(__file__).resolve().parent
BAYAGENTS_DIR = BACKEND_DIR.parent.parent
PLANS_DIR = BAYAGENTS_DIR / "data" / "plans"
HABIBIE_LOG_FILE = BAYAGENTS_DIR / "data" / "habibie.log"
CONFIGS_DIR = BAYAGENTS_DIR / "configs"
HABIBIE_CONFIG = CONFIGS_DIR / "habibie.yaml"

ROUTER9_BASE_URL = os.environ.get("ROUTER9_BASE_URL", "http://192.168.100.146:20128/v1")
ROUTER9_MODEL = os.environ.get("ROUTER9_MODEL", "gemini-free-smart")
ROUTER9_API_KEY = os.environ.get("ROUTER9_API_KEY", "")


def _get_local_now() -> datetime:
    return datetime.now(WIB_TZ)


def log_habibie_activity(message: str) -> None:
    """Mencatat log aktivitas Chief Architect HABIBIE ke data/habibie.log."""
    try:
        now_str = _get_local_now().strftime("%Y-%m-%d %H:%M:%S WIB")
        HABIBIE_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HABIBIE_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{now_str}] {message}\n")
    except Exception:
        pass


def _ensure_plans_dir():
    PLANS_DIR.mkdir(parents=True, exist_ok=True)
    keep_file = PLANS_DIR / ".gitkeep"
    if not keep_file.exists():
        keep_file.touch()


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:35].strip("-") or "plan"


def _parse_frontmatter(file_content: str) -> tuple[Dict[str, Any], str]:
    """Memisahkan metadata frontmatter YAML dan konten Markdown."""
    if file_content.startswith("---"):
        parts = file_content.split("---", 2)
        if len(parts) >= 3:
            try:
                meta = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()
                return meta, body
            except Exception:
                pass
    return {}, file_content.strip()


def _render_frontmatter(meta: Dict[str, Any], body: str) -> str:
    yaml_str = yaml.dump(meta, sort_keys=False, allow_unicode=True).strip()
    return f"---\n{yaml_str}\n---\n\n{body}\n"


def load_habibie_system_prompt() -> str:
    """Memuat system prompt HABIBIE dari habibie.yaml."""
    if HABIBIE_CONFIG.exists():
        try:
            with open(HABIBIE_CONFIG, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                prompt = (data.get("system_prompt") or "").strip()
                if prompt:
                    return f"[Instruksi Sistem HABIBIE:\n{prompt}]\n\n"
        except Exception as e:
            print(f"⚠️ Gagal membaca habibie.yaml di plans_manager: {e}")
    return (
        "[Instruksi Sistem: Kamu adalah HABIBIE (Chief Architect, Strategic Planner & Homelab System Advisor). "
        "Susun implementation plan teknis yang presisi, terstruktur, dan anti-overengineering.]\n\n"
    )


def list_plans() -> List[Dict[str, Any]]:
    """Mengambil daftar seluruh implementation plan yang tersimpan di data/plans/."""
    _ensure_plans_dir()
    plans = []

    for file_path in PLANS_DIR.glob("*.md"):
        try:
            content = file_path.read_text(encoding="utf-8")
            meta, body = _parse_frontmatter(content)
            
            plan_id = meta.get("id") or file_path.stem
            title = meta.get("title")
            if not title:
                # Ambil heading pertama jika ada
                match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
                title = match.group(1).strip() if match else file_path.stem

            created_at = meta.get("created_at")
            if not created_at:
                created_at = datetime.fromtimestamp(file_path.stat().st_mtime, tz=WIB_TZ).isoformat()

            # Buat ringkasan singkat 160 karakter
            clean_body = re.sub(r"[#*`_-]", "", body)
            summary = (clean_body[:160] + "...") if len(clean_body) > 160 else clean_body

            plans.append({
                "id": plan_id,
                "filename": file_path.name,
                "title": title,
                "project": meta.get("project", "bayoffice"),
                "author": meta.get("author", "HABIBIE"),
                "status": meta.get("status", "Draft"),
                "created_at": created_at,
                "updated_at": meta.get("updated_at", created_at),
                "dispatched_task_id": meta.get("dispatched_task_id"),
                "summary": summary.strip()
            })
        except Exception as e:
            print(f"⚠️ Gagal membaca file plan {file_path.name}: {e}")

    # Urutkan berdasarkan created_at descending (terbaru di atas)
    plans.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return plans


def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Mengambil satu dokumen plan lengkap beserta isi markdown-nya."""
    _ensure_plans_dir()
    plan_id = plan_id.strip()

    target_file = None
    for file_path in PLANS_DIR.glob("*.md"):
        if file_path.stem == plan_id or file_path.name == plan_id or file_path.stem.startswith(f"{plan_id}-"):
            target_file = file_path
            break
        # Cek isi frontmatter jika ID tidak ada di nama file
        try:
            content = file_path.read_text(encoding="utf-8")
            meta, _ = _parse_frontmatter(content)
            if meta.get("id") == plan_id:
                target_file = file_path
                break
        except Exception:
            continue

    if not target_file or not target_file.exists():
        return None

    try:
        content = target_file.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(content)
        title = meta.get("title")
        if not title:
            match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
            title = match.group(1).strip() if match else target_file.stem

        return {
            "id": meta.get("id", target_file.stem),
            "filename": target_file.name,
            "title": title,
            "project": meta.get("project", "bayoffice"),
            "author": meta.get("author", "HABIBIE"),
            "status": meta.get("status", "Draft"),
            "engine": meta.get("engine", "agy"),
            "model": meta.get("model"),
            "created_at": meta.get("created_at"),
            "updated_at": meta.get("updated_at"),
            "dispatched_task_id": meta.get("dispatched_task_id"),
            "content": body,
            "raw_file": content
        }
    except Exception as e:
        print(f"⚠️ Gagal membaca plan {plan_id}: {e}")
        return None


def save_plan(title: str,
              content: str,
              project: str = "bayoffice",
              author: str = "HABIBIE",
              status: str = "Draft",
              plan_id: Optional[str] = None,
              dispatched_task_id: Optional[str] = None,
              engine: Optional[str] = None,
              model: Optional[str] = None) -> Dict[str, Any]:
    """Menyimpan atau memperbarui dokumen plan ke data/plans/."""
    _ensure_plans_dir()
    now_dt = _get_local_now()
    now_iso = now_dt.isoformat()

    # Generate plan_id jika baru: PLAN-YYYYMMDD-01
    if not plan_id:
        date_str = now_dt.strftime("%Y%m%d")
        existing_plans = list_plans()
        prefix = f"PLAN-{date_str}-"
        seqs = []
        for p in existing_plans:
            pid = p.get("id", "")
            if pid.startswith(prefix):
                try:
                    num = int(pid.replace(prefix, ""))
                    seqs.append(num)
                except Exception:
                    pass
        next_seq = (max(seqs) + 1) if seqs else 1
        plan_id = f"{prefix}{next_seq:02d}"

    slug = _slugify(title)
    filename = f"{plan_id}-{slug}.md"
    file_path = PLANS_DIR / filename

    # Cek apakah ada file lama dengan ID sama untuk di-update
    for old_file in PLANS_DIR.glob(f"{plan_id}*.md"):
        if old_file != file_path:
            old_file.unlink(missing_ok=True)

    meta = {
        "id": plan_id,
        "title": title.strip(),
        "project": project.strip() if project else "bayoffice",
        "author": author or "HABIBIE",
        "created_at": now_iso,
        "updated_at": now_iso,
        "status": status or "Draft",
        "dispatched_task_id": dispatched_task_id
    }
    if engine:
        meta["engine"] = engine
    if model:
        meta["model"] = model

    full_text = _render_frontmatter(meta, content.strip())
    file_path.write_text(full_text, encoding="utf-8")

    return {
        "success": True,
        "id": plan_id,
        "filename": filename,
        "title": title,
        "project": meta["project"],
        "status": meta["status"],
        "engine": meta.get("engine"),
        "model": meta.get("model"),
        "created_at": now_iso,
        "file_path": str(file_path)
    }


def generate_plan_ai(idea: str,
                     project: str = "bayoffice",
                     engine: str = "agy",
                     model: Optional[str] = None) -> Dict[str, Any]:
    """Meminta HABIBIE merancang Implementation Plan teknis secara AI."""
    idea = idea.strip()
    if not idea:
        return {"success": False, "error": "Ide atau instruksi fitur wajib diisi"}

    habibie_sys = load_habibie_system_prompt()
    plan_prompt = (
        f"Sebagai HABIBIE (Chief Architect & Strategic Planner), buatkan 'Implementation Plan' "
        f"teknis yang presisi, efisien, dan anti-overengineering untuk proyek '{project}':\n\n"
        f"Kebutuhan Fitur: '{idea}'\n\n"
        f"Wajib gunakan format Markdown terstruktur dengan bagian berikut:\n"
        f"# Implementation Plan: <Judul Rencana Singkat & Jelas>\n\n"
        f"## 1. 🎯 Tujuan & Scope Fitur\n"
        f"- Ringkasan problem & solusi yang akan dibangun.\n\n"
        f"## 2. 🗄️ Tugas Backend (JOKOWI)\n"
        f"- Kebutuhan Database / Migration, Schema, Models.\n"
        f"- RESTful API Endpoints & Business Logic.\n\n"
        f"## 3. 🎨 Tugas Frontend (PRABOWO)\n"
        f"- Antarmuka UI (Neubrutalism/Tailwind), Layout & State Management.\n"
        f"- Interaksi pengguna, modal/dialog & responsivitas mobile.\n\n"
        f"## 4. 🛡️ Checklist QA & Verifikasi (GIBRAN)\n"
        f"- Test cases, edge cases, verifikasi keamanan & build passing.\n\n"
        f"## 5. 🚀 Catatan Orkestrasi & Deployment (LUHUT)\n"
        f"- Urutan eksekusi, dependensi antar-agen, dan langkah deployment server."
    )

    plan_markdown = ""
    # Panggil AGY CLI atau fallback ke 9Router
    if engine == "agy":
        try:
            env = os.environ.copy()
            env["HOME"] = str(Path.home())
            env["PATH"] = f"{Path.home()}/.gemini/antigravity-cli/bin:{Path.home()}/.local/bin:/usr/local/bin:/usr/bin:/bin:{env.get('PATH', '')}"
            cmd = ["agy", "-p", f"{habibie_sys}{plan_prompt}", "--dangerously-skip-permissions"]
            if model and model.strip():
                cmd.extend(["--model", model.strip()])
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=180, env=env)
            plan_markdown = res.stdout.strip()
        except Exception as e:
            print(f"⚠️ AGY CLI error saat generate plan: {e}")

    if not plan_markdown:
        # Default fallback: 9Router proxy server 146
        headers = {
            "Authorization": f"Bearer {ROUTER9_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": ROUTER9_MODEL,
            "messages": [
                {"role": "system", "content": habibie_sys},
                {"role": "user", "content": plan_prompt}
            ],
            "stream": False
        }
        try:
            with httpx.Client(timeout=65.0) as client:
                resp = client.post(f"{ROUTER9_BASE_URL}/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    plan_markdown = data["choices"][0]["message"]["content"].strip()
                else:
                    return {"success": False, "error": f"9Router HTTP {resp.status_code}: {resp.text[:200]}"}
        except Exception as e:
            return {"success": False, "error": f"Gagal menghubungi model AI: {e}"}

    if not plan_markdown:
        return {"success": False, "error": "Model AI tidak menghasilkan keluaran teks."}

    # Bersihkan markdown dan ambil judul dari heading # jika ada
    title = idea[:50]
    match = re.search(r"^#\s+(?:Implementation Plan:\s*)?(.+)$", plan_markdown, re.MULTILINE | re.IGNORECASE)
    if match:
        title = match.group(1).strip()

    # Simpan plan ke file lokal data/plans/
    saved = save_plan(
        title=title,
        content=plan_markdown,
        project=project,
        author="HABIBIE",
        status="Draft",
        engine=engine,
        model=model if engine == "agy" else None
    )
    model_tag = f", model: {model}" if (engine == "agy" and model) else ""
    log_habibie_activity(f"DRAFTED PLAN: [{saved['id']}] '{title}' untuk proyek '{project}' (engine: {engine}{model_tag})")
    saved["content"] = plan_markdown
    saved["plan"] = {
        "id": saved["id"],
        "filename": saved["filename"],
        "title": saved["title"],
        "project": saved["project"],
        "status": saved["status"],
        "engine": saved.get("engine", engine),
        "model": saved.get("model", model if engine == "agy" else None),
        "created_at": saved["created_at"],
        "content": plan_markdown
    }
    return saved


def dispatch_plan_to_kanban(plan_id: str, dispatch_fn) -> Dict[str, Any]:
    """Meneruskan Implementation Plan ke tim agen di Kanban & membangunkan LUHUT via tmux."""
    plan = get_plan(plan_id)
    if not plan:
        return {"success": False, "error": f"Plan dengan ID '{plan_id}' tidak ditemukan"}

    instruction = f"[Dari Plan {plan['id']}: {plan['title']}]\n\n{plan['content'][:600]}..."
    project = plan.get("project", "bayoffice")

    # Panggil fungsi dispatch Kanban yang sudah ada
    res = dispatch_fn(
        instruction=instruction,
        category_hint="auto",
        project_hint=project,
        engine=plan.get("engine", "agy"),
        model=plan.get("model")
    )

    if not res.get("success"):
        return {"success": False, "error": res.get("error", "Gagal meneruskan tugas ke tim agen")}

    task_id = res.get("task_id", "TASK-OPS")

    # Update metadata plan menjadi Dispatched
    save_plan(
        title=plan["title"],
        content=plan["content"],
        project=project,
        author=plan.get("author", "HABIBIE"),
        status="Dispatched",
        plan_id=plan["id"],
        dispatched_task_id=task_id
    )

    log_habibie_activity(f"DISPATCHED PLAN: [{plan['id']}] '{plan['title']}' didelegasikan ke Kanban sebagai task '{task_id}' ({project})")

    return {
        "success": True,
        "plan_id": plan["id"],
        "task_id": task_id,
        "message": f"Rencana '{plan['title']}' berhasil didelegasikan ke Kanban sebagai {task_id}."
    }


def delete_plan(plan_id: str) -> Dict[str, Any]:
    """Menghapus file implementation plan."""
    _ensure_plans_dir()
    plan = get_plan(plan_id)
    if not plan:
        return {"success": False, "error": f"Plan '{plan_id}' tidak ditemukan"}

    filename = plan.get("filename")
    if filename:
        target = PLANS_DIR / filename
        if target.exists():
            target.unlink()
            log_habibie_activity(f"DELETED PLAN: [{plan_id}] '{plan.get('title', plan_id)}' telah dihapus dari direktori plans")
            return {"success": True, "message": f"Plan '{plan_id}' berhasil dihapus."}

    return {"success": False, "error": "File plan tidak dapat dihapus."}
