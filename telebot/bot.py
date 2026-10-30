import os
import sys

# FAST CLI NOTIFIER SHORTCUT:
# Jika dipanggil via CLI untuk kirim notifikasi singkat (misal: python3 bot.py "[LUHUT]: ..."),
# langsung kirim via stdlib urllib tanpa memuat library bot berat (menghemat 40MB RAM & <50ms vs 1800ms).
if len(sys.argv) > 1 and not any(arg in sys.argv for arg in ["--help", "-h"]):
    cli_text = sys.argv[1] if len(sys.argv) == 2 else " ".join(sys.argv[1:])

    from pathlib import Path
    _env_path = Path(__file__).resolve().parent.parent / ".env"
    token = None
    chat_id = None
    if _env_path.exists():
        with open(_env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("TELEGRAM_BOT_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"\'')
                elif line.startswith("TELEGRAM_ALLOWED_USER_ID="):
                    chat_id = line.split("=", 1)[1].strip().strip('"\'')

    token = token or os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = chat_id or os.getenv("TELEGRAM_ALLOWED_USER_ID")

    if not token or not chat_id:
        print(f"📢 [Local Notification]: {cli_text}")
        sys.exit(0)

    import urllib.request
    import urllib.parse

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": cli_text,
        "parse_mode": "Markdown"
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            pass
    except Exception:
        payload.pop("parse_mode", None)
        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                pass
        except Exception as e:
            print(f"Gagal kirim notifikasi CLI: {e}")
    sys.exit(0)

import re
import shutil
import subprocess
import asyncio
import json
import yaml
import time
from datetime import datetime, timezone, timedelta, time as dtime
from pathlib import Path
from telegram import Update, BotCommand, Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from dotenv import load_dotenv
import incident_monitor
import httpx
import emergency_agent

# Zona Waktu Server (WIB / UTC+7)
WIB_TZ = timezone(timedelta(hours=7))

# Auto-detect root bayagents directory & load .env
TELEBOT_DIR = Path(__file__).resolve().parent
ROOT_BAYAGENTS = TELEBOT_DIR.parent
ROOT_ENV_FILE = ROOT_BAYAGENTS / ".env"
if ROOT_ENV_FILE.exists():
    load_dotenv(dotenv_path=ROOT_ENV_FILE)

BAYAGENTS_DIR = Path(os.getenv("BAYAGENTS_DIR", str(ROOT_BAYAGENTS)))
WORKSPACE_DIR = Path(os.getenv("WORKSPACE_DIR", str(Path.home())))
DATA_DIR = Path(os.getenv("DATA_DIR", str(BAYAGENTS_DIR / "data")))
SCRIPTS_DIR = Path(os.getenv("SCRIPTS_DIR", str(BAYAGENTS_DIR / "scripts")))

# Import plans_manager & atomic storage engine dari bayoffice/backend
sys.path.append(str(ROOT_BAYAGENTS / "bayoffice" / "backend"))
try:
    import plans_manager
except Exception as _e:
    plans_manager = None

try:
    from storage import atomic_read_json, atomic_write_json
except Exception as _e:
    atomic_read_json = None
    atomic_write_json = None

def read_json_safe(filepath, default=None):
    if atomic_read_json:
        return atomic_read_json(filepath, default=default)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def write_json_safe(filepath, data):
    if atomic_write_json:
        return atomic_write_json(filepath, data)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return True

# Cooldown alert watchdog (2 jam) agar tidak berulang kali spam
ALERT_COOLDOWNS = {}
ALERT_COOLDOWN_SECONDS = 7200

# ==========================================
# KONFIGURASI DARI .ENV / DEFAULT
# ==========================================
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN wajib didefinisikan dalam file .env!")
ALLOWED_USER_ID = int(os.getenv("TELEGRAM_ALLOWED_USER_ID", "0"))
TMUX_SESSION_NAME = os.getenv("TMUX_SESSION_NAME", "agy_agents")

# ==========================================
# KONFIGURASI FILE & PERSISTENCE
# ==========================================
ENGINE_CONFIG_FILE = str(TELEBOT_DIR / "engine_config.json")
BOOT_FILE = str(TELEBOT_DIR / ".last_boot_time")
KANBAN_FILE = str(Path(os.getenv("KANBAN_PATH", str(DATA_DIR / "kanban.json"))))
PROJECTS_FILE = str(Path(os.getenv("PROJECTS_PATH", str(DATA_DIR / "projects.json"))))
START_AGENTS_SCRIPT = str(SCRIPTS_DIR / "start_agents.sh")
BOT_SCRIPT = str(TELEBOT_DIR / "bot.py")
PENDING_CHAT_QUERIES = {}  # Cache query untuk tombol switch/reask {q_id: {"prompt": str, "time": float}}

SUPPORTED_AGY_MODELS = [
    ("gemini-3.8-flash-high", "Gemini 3.8 Flash (High)", "⚡ Rekomendasi / Cepat"),
    ("claude-sonnet-4-6", "Claude Sonnet 4.6 (Thinking)", "🧠 Deep Reasoning"),
    ("claude-opus-4-6-thinking", "Claude Opus 4.6 (Thinking)", "🏛️ Arsitektur Kompleks"),
    ("gemini-3.8-flash-medium", "Gemini 3.8 Flash (Medium)", "⚖️ Seimbang"),
    ("gemini-3.8-flash-low", "Gemini 3.8 Flash (Low)", "🍃 Ringan"),
    ("gpt-oss-120b-medium", "GPT-OSS 120B (Medium)", "🌐 Open Source")
]

def get_current_model() -> str:
    """Membaca model AGY yang aktif dari engine_config.json atau environment."""
    try:
        if os.path.exists(ENGINE_CONFIG_FILE):
            with open(ENGINE_CONFIG_FILE, "r") as f:
                data = json.load(f)
                val = data.get("current_model")
                if val:
                    return val
    except Exception:
        pass
    return os.getenv("CURRENT_MODEL", "gemini-3.8-flash-high")

def set_current_model(model_name: str) -> None:
    """Menyimpan model AGY yang aktif secara persisten ke engine_config.json."""
    global CURRENT_MODEL
    CURRENT_MODEL = model_name
    try:
        data = {}
        if os.path.exists(ENGINE_CONFIG_FILE):
            with open(ENGINE_CONFIG_FILE, "r") as f:
                data = json.load(f)
        data["current_model"] = model_name
        write_json_safe(ENGINE_CONFIG_FILE, data)
    except Exception as e:
        print(f"Error saving model config: {e}")

CURRENT_MODEL = get_current_model()

def get_current_engine() -> str:
    """Membaca engine default: '9router', 'agy', atau 'ask' (interactive)."""
    try:
        if os.path.exists(ENGINE_CONFIG_FILE):
            with open(ENGINE_CONFIG_FILE, "r") as f:
                data = json.load(f)
                return data.get("default_engine", "agy")
    except Exception:
        pass
    return "agy"

def set_current_engine(engine_name: str) -> None:
    """Menyimpan engine default secara persisten."""
    try:
        data = {}
        if os.path.exists(ENGINE_CONFIG_FILE):
            with open(ENGINE_CONFIG_FILE, "r") as f:
                data = json.load(f)
        data["default_engine"] = engine_name
        write_json_safe(ENGINE_CONFIG_FILE, data)
    except Exception as e:
        print(f"Error saving engine config: {e}")

# ==========================================
# KONFIGURASI & MEMORI 9ROUTER (SERVER 146)
# ==========================================
ROUTER9_BASE_URL = os.environ.get("ROUTER9_BASE_URL", "http://192.168.100.146:20128/v1")
ROUTER9_MODEL = os.environ.get("ROUTER9_MODEL", "gemini-free-smart")
ROUTER9_API_KEY = os.environ.get("ROUTER9_API_KEY", "")

# Buffer memori riwayat chat multi-turn agar obrolan nyambung dengan konteks sebelumnya
ROUTER9_CHAT_HISTORY = []
ROUTER9_LAST_ACTIVITY = 0
ROUTER9_HISTORY_TIMEOUT = 1800  # Reset otomatis jika jeda percakapan > 30 menit
ROUTER9_MAX_PAIRS = 8  # Simpan 8 pasang obrolan terakhir (16 pesan)

# ==========================================
# AGEN STANDALONE: HABIBIE (CHIEF ARCHITECT & PLANNER)
# ==========================================
HABIBIE_CONFIG_FILE = BAYAGENTS_DIR / "configs" / "habibie.yaml"

def load_habibie_system_prompt() -> str:
    """Memuat system prompt HABIBIE dari file configs/habibie.yaml."""
    if HABIBIE_CONFIG_FILE.exists():
        try:
            with open(HABIBIE_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                prompt = (data.get("system_prompt") or "").strip()
                if prompt:
                    return f"[Instruksi Sistem HABIBIE:\n{prompt}]\n\n"
        except Exception as e:
            print(f"⚠️ Gagal membaca habibie.yaml: {e}")
    # Fallback default jika file yaml tidak terbaca
    return (
        "[Instruksi Sistem: Kamu adalah HABIBIE (Chief Architect, Strategic Planner & Homelab System Advisor) "
        "untuk server Debian (hostname: bay, AMD E2-9000 2-core, RAM ~3.2GB). "
        "Bantu pengguna menyusun implementation plan teknis, menjawab pertanyaan pemrograman, dan mengawasi kesehatan server. "
        "Jawab selalu dalam Bahasa Indonesia yang ringkas, terstruktur dengan emoji & bullet points. "
        "Awali respon dengan '[HABIBIE]: '.]\n\n"
    )

def call_9router(user_prompt: str, system_prompt: str = None) -> str:
    """Memanggil 9Router (gemini-free-smart) di host 192.168.100.146 dengan memori multi-turn context."""
    global ROUTER9_CHAT_HISTORY, ROUTER9_LAST_ACTIVITY
    now = time.time()
    if now - ROUTER9_LAST_ACTIVITY > ROUTER9_HISTORY_TIMEOUT:
        ROUTER9_CHAT_HISTORY.clear()
    ROUTER9_LAST_ACTIVITY = now

    sys_prompt = system_prompt or load_habibie_system_prompt()
    headers = {
        "Authorization": f"Bearer {ROUTER9_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Rakit payload dengan system prompt + riwayat percakapan sebelumnya + pertanyaan terbaru
    messages_payload = [{"role": "system", "content": sys_prompt}]
    messages_payload.extend(ROUTER9_CHAT_HISTORY)
    messages_payload.append({"role": "user", "content": user_prompt})

    payload = {
        "model": ROUTER9_MODEL,
        "messages": messages_payload,
        "stream": False
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(f"{ROUTER9_BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                # Simpan interaksi ke riwayat percakapan
                ROUTER9_CHAT_HISTORY.append({"role": "user", "content": user_prompt})
                ROUTER9_CHAT_HISTORY.append({"role": "assistant", "content": content})
                # Batasi buffer agar tidak melebihi batas token context window
                if len(ROUTER9_CHAT_HISTORY) > (ROUTER9_MAX_PAIRS * 2):
                    ROUTER9_CHAT_HISTORY = ROUTER9_CHAT_HISTORY[-(ROUTER9_MAX_PAIRS * 2):]
                return content
            else:
                return f"⚠️ 9Router Error HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        return f"⚠️ Gagal menghubungi 9Router: {e}"

# Interval laporan otomatis dalam detik (21600 detik = 6 jam)
AUDIT_INTERVAL_SECONDS = 21600

# Cari lokasi binary agy secara otomatis
AGY_BIN = shutil.which("agy") or str(WORKSPACE_DIR / ".local/bin/agy")

def run_agy(user_prompt: str, continue_session: bool = False) -> str:
    full_prompt = f"{load_habibie_system_prompt()}Permintaan User: {user_prompt}"
    env = os.environ.copy()
    env["HOME"] = str(WORKSPACE_DIR)
    env["PATH"] = f"{WORKSPACE_DIR}/.gemini/antigravity-cli/bin:{WORKSPACE_DIR}/.local/bin:/usr/local/bin:/usr/bin:/bin:{env.get('PATH', '')}"

    # Menggunakan argumen --model dengan ID yang valid
    cmd = [
        AGY_BIN, "-p", full_prompt, 
        "--dangerously-skip-permissions",
        "--model", CURRENT_MODEL
    ]
    if continue_session:
        cmd.append("--continue")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180, env=env)
        if result.returncode != 0 and continue_session:
            cmd.remove("--continue")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180, env=env)

        output = result.stdout.strip() or result.stderr.strip()
        return output[:4000] if output else "Perintah selesai tanpa output teks."
    except subprocess.TimeoutExpired:
        return "⚠️ Waktu eksekusi habis (timeout 3 menit)."
    except Exception as e:
        return f"⚠️ Gagal menjalankan agy: {e}"

def check_token_limit() -> str:
    """Mengecek sisa kuota dan limit token AI menggunakan perintah agy /usage."""
    env = os.environ.copy()
    env["HOME"] = str(WORKSPACE_DIR)
    env["PATH"] = f"{WORKSPACE_DIR}/.gemini/antigravity-cli/bin:{WORKSPACE_DIR}/.local/bin:/usr/local/bin:/usr/bin:/bin:{env.get('PATH', '')}"

    cmd = [
        AGY_BIN, "-p", "/usage",
        "--output-format", "json",
        "--dangerously-skip-permissions"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=env)
        if result.returncode != 0:
            # Fallback ke plain text jika format json gagal
            cmd_plain = [AGY_BIN, "-p", "/usage", "--dangerously-skip-permissions"]
            res_plain = subprocess.run(cmd_plain, capture_output=True, text=True, timeout=30, env=env)
            output = res_plain.stdout.strip() or res_plain.stderr.strip()
            return f"📊 *Sisa Limit Token & Kuota AI:*\n\n`{output}`" if output else "⚠️ Tidak ada data kuota yang diterima."

        data = json.loads(result.stdout)
        groups = data.get("command", {}).get("data", {}).get("groups", [])
        if not groups:
            resp = data.get("response", "").strip()
            return f"📊 *Sisa Limit Token & Kuota AI:*\n\n`{resp}`" if resp else "⚠️ Tidak ada informasi kuota yang ditemukan."

        lines = [
            "📊 *Sisa Limit Token & Kuota AI*",
            f"🤖 *Model Aktif:* `{CURRENT_MODEL}`\n"
        ]

        for grp in groups:
            grp_name = grp.get("name", "Model")
            lines.append(f"*{grp_name}:*")
            for b in grp.get("buckets", []):
                rem_frac = b.get("remaining_fraction", 0.0)
                rem_pct = rem_frac * 100.0
                name = b.get("name", "Limit")
                bid = b.get("id", "").lower()

                if "weekly" in bid or "weekly" in name.lower():
                    label = "Limit Mingguan (Weekly)"
                elif "5h" in bid or "five hour" in name.lower():
                    label = "Limit 5 Jam (5-Hour)"
                else:
                    label = name

                if rem_pct >= 60:
                    icon = "🟢"
                elif rem_pct >= 20:
                    icon = "🟡"
                else:
                    icon = "🔴"

                filled = max(0, min(10, int(round(rem_pct / 10))))
                bar = "█" * filled + "░" * (10 - filled)

                reset_str = ""
                reset_time = b.get("reset_time", "")
                if reset_time:
                    try:
                        dt = datetime.fromisoformat(reset_time.replace("Z", "+00:00")).astimezone()
                        reset_str = f"\n  ↳ Reset: {dt.strftime('%d-%m-%Y %H:%M %Z')}"
                    except Exception:
                        reset_str = f"\n  ↳ Reset: {reset_time}"

                lines.append(f"{icon} *{label}*: `{rem_pct:.1f}%`\n  `[{bar}]`{reset_str}")
            lines.append("")

        return "\n".join(lines).strip()
    except subprocess.TimeoutExpired:
        return "⚠️ Waktu eksekusi habis saat memeriksa limit token (timeout 30 detik)."
    except Exception as e:
        return f"⚠️ Gagal memeriksa limit token: {e}"

def build_model_keyboard(current_model: str) -> InlineKeyboardMarkup:
    """Membangun keyboard inline untuk pilihan model AGY."""
    buttons = []
    for m_id, m_name, m_tag in SUPPORTED_AGY_MODELS:
        check = " ✅" if m_id == current_model else ""
        buttons.append([InlineKeyboardButton(f"{m_name} ({m_tag}){check}", callback_data=f"model_set:{m_id}")])
    return InlineKeyboardMarkup(buttons)

# Perintah untuk mengganti model lewat Telegram
async def set_model_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    if context.args:
        chosen = context.args[0].lower().strip()
        matched_id = None
        for m_id, _, _ in SUPPORTED_AGY_MODELS:
            if chosen == m_id.lower() or chosen in m_id.lower():
                matched_id = m_id
                break
        if not matched_id:
            matched_id = chosen

        set_current_model(matched_id)
        await update.message.reply_text(f"✅ Model Antigravity (AGY) berhasil diubah ke: `{matched_id}`", parse_mode="Markdown")
        return

    cur = get_current_model()
    reply_markup = build_model_keyboard(cur)
    msg_text = (
        f"🧠 *PENGATURAN MODEL ANTIGRAVITY (AGY)*\n\n"
        f"• Model Aktif: `{cur}`\n\n"
        f"Pilih reasoning model yang diinginkan untuk sesi tim agen & HABIBIE:\n"
        f"1. ⚡ *Gemini 3.8 Flash (High)*: Rekomendasi utama, cepat & bernalar tinggi.\n"
        f"2. 🧠 *Claude Sonnet 4.6 (Thinking)*: Khusus arsitektur mendalam & coding teliti.\n"
        f"3. 🏛️ *Claude Opus 4.6 (Thinking)*: Problem arsitektur kompleks berskala besar.\n"
        f"4. ⚖️ *Gemini 3.8 Flash (Medium/Low)*: Varian hemat & ringan.\n"
        f"5. 🌐 *GPT-OSS 120B*: Alternatif open-weight model.\n\n"
        f"💡 Klik tombol di bawah untuk langsung mengganti model:"
    )
    await update.message.reply_text(msg_text, reply_markup=reply_markup, parse_mode="Markdown")

def cleanup_pending_queries():
    now = time.time()
    expired = [k for k, v in PENDING_CHAT_QUERIES.items() if now - v.get("time", 0) > 3600]
    for k in expired:
        PENDING_CHAT_QUERIES.pop(k, None)

# Perintah /engine atau /mode untuk memilih default engine chat AI
async def engine_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    cleanup_pending_queries()

    if context.args:
        chosen = context.args[0].lower().strip()
        if chosen in ["9router", "9", "router9"]:
            set_current_engine("9router")
            await update.message.reply_text("✅ Otak chat default diubah ke: ⚡ *9Router* (Cepat, hemat kuota & multi-turn memory).", parse_mode="Markdown")
            return
        elif chosen in ["agy", "antigravity"]:
            set_current_engine("agy")
            await update.message.reply_text("✅ Otak chat default diubah ke: 🧠 *AGY / Antigravity CLI* (Akses tool server & deep reasoning).", parse_mode="Markdown")
            return
        elif chosen in ["ask", "tanya", "interactive"]:
            set_current_engine("ask")
            await update.message.reply_text("✅ Mode interaktif diaktifkan: Bot akan *selalu menanyakan pilihan otak* di awal tiap chat.", parse_mode="Markdown")
            return

    current = get_current_engine()
    txt_current = (
        "⚡ *9Router* (Cepat, hemat kuota & memori multi-turn)" if current == "9router"
        else ("🧠 *AGY / Antigravity CLI* (Akses tool server & deep reasoning)" if current == "agy"
        else "❓ *Selalu Tanya Tiap Chat (Interactive)*")
    )

    keyboard = [
        [
            InlineKeyboardButton("⚡ 9Router (Cepat/Hemat)" + (" ✅" if current == "9router" else ""), callback_data="engine_set:9router"),
            InlineKeyboardButton("🧠 AGY (Server Tools)" + (" ✅" if current == "agy" else ""), callback_data="engine_set:agy")
        ],
        [
            InlineKeyboardButton("❓ Selalu Tanya Tiap Chat" + (" ✅" if current == "ask" else ""), callback_data="engine_set:ask")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    msg_text = (
        f"⚙️ *PENGATURAN OTAK CHAT DEFAULT*\n\n"
        f"• Mode Aktif: {txt_current}\n\n"
        f"Pilih mode yang diinginkan untuk memproses pesan teks biasa:\n"
        f"1. ⚡ *9Router*: Respon kilat, hemat kuota token, memori obrolan nyambung.\n"
        f"2. 🧠 *AGY*: Eksekusi server, inspeksi bash, & skills terpasang.\n"
        f"3. ❓ *Selalu Tanya*: Memunculkan tombol pilihan sebelum membalas.\n\n"
        f"💡 *Jalan Pintas Cepat (Tanpa Ganti Mode):*\n"
        f"• `/agy <pesan>` ➔ Langsung dijawab oleh AGY\n"
        f"• `/9 <pesan>` ➔ Langsung dijawab oleh 9Router"
    )
    await update.message.reply_text(msg_text, reply_markup=reply_markup, parse_mode="Markdown")

# Perintah cepat langsung ke AGY CLI: /agy <pesan>
async def direct_agy_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    prompt = " ".join(context.args).strip() if context.args else ""
    if not prompt:
        await update.message.reply_text("💡 *Penggunaan AGY Langsung:*\n`/agy <pertanyaan atau perintah>`\n\nContoh: `/agy periksa load average dan docker container aktif`", parse_mode="Markdown")
        return

    cleanup_pending_queries()
    msg = await update.message.reply_text("🧠 [AGY CLI] Sedang menganalisa & memproses...")
    reply = await asyncio.to_thread(run_agy, prompt, True)

    q_id = str(int(time.time() * 1000))[-8:]
    PENDING_CHAT_QUERIES[q_id] = {"prompt": prompt, "time": time.time()}
    keyboard = [[InlineKeyboardButton("⚡ Coba Tanya via 9Router", callback_data=f"reask:9router:{q_id}")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await msg.edit_text(reply, reply_markup=reply_markup, parse_mode="Markdown")
    except Exception:
        await msg.edit_text(reply, reply_markup=reply_markup)

# Perintah cepat langsung ke 9Router: /9 <pesan> atau /r9 <pesan>
async def direct_9router_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    prompt = " ".join(context.args).strip() if context.args else ""
    if not prompt:
        await update.message.reply_text("💡 *Penggunaan 9Router Langsung:*\n`/9 <pertanyaan>`\n\nContoh: `/9 jelaskan perbedaan postgresql dan redis`", parse_mode="Markdown")
        return

    cleanup_pending_queries()
    msg = await update.message.reply_text("⚡ [9Router] Mengetik...")
    reply = await asyncio.to_thread(call_9router, prompt)

    q_id = str(int(time.time() * 1000))[-8:]
    PENDING_CHAT_QUERIES[q_id] = {"prompt": prompt, "time": time.time()}
    keyboard = [[InlineKeyboardButton("🧠 Coba Tanya via AGY", callback_data=f"reask:agy:{q_id}")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    try:
        await msg.edit_text(reply, reply_markup=reply_markup, parse_mode="Markdown")
    except Exception:
        await msg.edit_text(reply, reply_markup=reply_markup)

# CallbackQueryHandler untuk tombol inline keyboard bot
async def callback_query_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query.from_user.id != ALLOWED_USER_ID:
        await query.answer("Akses ditolak.", show_alert=True)
        return

    data = query.data or ""
    await query.answer()

    # 1. Ganti Engine Setting: engine_set:<engine>
    if data.startswith("engine_set:"):
        chosen = data.split(":", 1)[1]
        set_current_engine(chosen)

        txt_chosen = (
            "⚡ 9Router (Cepat/Hemat)" if chosen == "9router"
            else ("🧠 AGY (Server Tools)" if chosen == "agy" else "❓ Selalu Tanya Tiap Chat")
        )

        keyboard = [
            [
                InlineKeyboardButton("⚡ 9Router (Cepat/Hemat)" + (" ✅" if chosen == "9router" else ""), callback_data="engine_set:9router"),
                InlineKeyboardButton("🧠 AGY (Server Tools)" + (" ✅" if chosen == "agy" else ""), callback_data="engine_set:agy")
            ],
            [
                InlineKeyboardButton("❓ Selalu Tanya Tiap Chat" + (" ✅" if chosen == "ask" else ""), callback_data="engine_set:ask")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        msg_text = (
            f"⚙️ *PENGATURAN OTAK CHAT DEFAULT*\n\n"
            f"• Mode Aktif: *{txt_chosen}*\n\n"
            f"Pilih mode yang diinginkan untuk memproses pesan teks biasa:\n"
            f"1. ⚡ *9Router*: Respon instan, hemat kuota token, memori obrolan nyambung.\n"
            f"2. 🧠 *AGY*: Eksekusi server, inspeksi bash, & skills terpasang.\n"
            f"3. ❓ *Selalu Tanya*: Memunculkan tombol pilihan sebelum membalas.\n\n"
            f"💡 *Jalan Pintas Cepat (Tanpa Ganti Mode):*\n"
            f"• `/agy <pesan>` ➔ Langsung dijawab oleh AGY\n"
            f"• `/9 <pesan>` ➔ Langsung dijawab oleh 9Router"
        )
        try:
            await query.edit_message_text(msg_text, reply_markup=reply_markup, parse_mode="Markdown")
        except Exception:
            pass
        return

    # 1b. Ganti Model AGY: model_set:<model_id>
    if data.startswith("model_set:"):
        chosen = data.split(":", 1)[1]
        set_current_model(chosen)
        reply_markup = build_model_keyboard(chosen)
        msg_text = (
            f"🧠 *PENGATURAN MODEL ANTIGRAVITY (AGY)*\n\n"
            f"• Model Aktif: `{chosen}` ✅\n\n"
            f"Pilih reasoning model yang diinginkan untuk sesi tim agen & HABIBIE:\n"
            f"1. ⚡ *Gemini 3.8 Flash (High)*: Rekomendasi utama, cepat & bernalar tinggi.\n"
            f"2. 🧠 *Claude Sonnet 4.6 (Thinking)*: Khusus arsitektur mendalam & coding teliti.\n"
            f"3. 🏛️ *Claude Opus 4.6 (Thinking)*: Problem arsitektur kompleks berskala besar.\n"
            f"4. ⚖️ *Gemini 3.8 Flash (Medium/Low)*: Varian hemat & ringan.\n"
            f"5. 🌐 *GPT-OSS 120B*: Alternatif open-weight model.\n\n"
            f"💡 Klik tombol di bawah untuk langsung mengganti model:"
        )
        try:
            await query.edit_message_text(msg_text, reply_markup=reply_markup, parse_mode="Markdown")
        except Exception:
            pass
        return

    # 2. Pilihan dari Mode Interactive: ask_engine:<engine>:<q_id>
    if data.startswith("ask_engine:"):
        parts = data.split(":")
        if len(parts) >= 3:
            target_engine = parts[1]
            q_id = parts[2]
            q_data = PENDING_CHAT_QUERIES.get(q_id)
            prompt = q_data.get("prompt", "") if q_data else ""
            if not prompt:
                await query.edit_message_text("⚠️ Sesi pertanyaan telah kadaluarsa. Silakan kirim ulang pesan Anda.")
                return

            if target_engine == "agy":
                await query.edit_message_text(f"📐 *[HABIBIE / AGY]* Sedang memproses:\n_{prompt[:60]}..._", parse_mode="Markdown")
                reply = await asyncio.to_thread(run_agy, prompt, True)
                keyboard = [[InlineKeyboardButton("⚡ Coba Tanya via 9Router", callback_data=f"reask:9router:{q_id}")]]
            else:
                await query.edit_message_text(f"📐 *[HABIBIE]* Sedang memproses:\n_{prompt[:60]}..._", parse_mode="Markdown")
                reply = await asyncio.to_thread(call_9router, prompt)
                if reply.startswith("⚠️"):
                    reply = await asyncio.to_thread(run_agy, prompt, True)
                keyboard = [[InlineKeyboardButton("🧠 Coba Tanya via AGY", callback_data=f"reask:agy:{q_id}")]]

            try:
                await query.edit_message_text(reply, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
            except Exception:
                await query.edit_message_text(reply, reply_markup=InlineKeyboardMarkup(keyboard))
        return

    # 3. Tanya Ulang (Re-ask): reask:<engine>:<q_id>
    if data.startswith("reask:"):
        parts = data.split(":")
        if len(parts) >= 3:
            target_engine = parts[1]
            q_id = parts[2]
            q_data = PENDING_CHAT_QUERIES.get(q_id)
            prompt = q_data.get("prompt", "") if q_data else ""
            if not prompt:
                await context.bot.send_message(chat_id=ALLOWED_USER_ID, text="⚠️ Sesi pertanyaan telah kadaluarsa. Silakan kirim ulang pesan Anda.")
                return

            if target_engine == "agy":
                wait_msg = await context.bot.send_message(chat_id=ALLOWED_USER_ID, text="🧠 [AGY CLI] Sedang menganalisa ulang...")
                reply = await asyncio.to_thread(run_agy, prompt, True)
                new_q_id = str(int(time.time() * 1000))[-8:]
                PENDING_CHAT_QUERIES[new_q_id] = {"prompt": prompt, "time": time.time()}
                keyboard = [[InlineKeyboardButton("⚡ Coba Tanya via 9Router", callback_data=f"reask:9router:{new_q_id}")]]
            else:
                wait_msg = await context.bot.send_message(chat_id=ALLOWED_USER_ID, text="⚡ [9Router] Mengetik ulang...")
                reply = await asyncio.to_thread(call_9router, prompt)
                new_q_id = str(int(time.time() * 1000))[-8:]
                PENDING_CHAT_QUERIES[new_q_id] = {"prompt": prompt, "time": time.time()}
                keyboard = [[InlineKeyboardButton("🧠 Coba Tanya via AGY", callback_data=f"reask:agy:{new_q_id}")]]

            try:
                await wait_msg.edit_text(reply, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
            except Exception:
                await wait_msg.edit_text(reply, reply_markup=InlineKeyboardMarkup(keyboard))
        return

# Perintah untuk mengecek sisa limit token & kuota AI
async def limit_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    msg = await update.message.reply_text("⏳ Sedang memeriksa sisa limit token & kuota AI...")
    reply = await asyncio.to_thread(check_token_limit)
    try:
        await msg.edit_text(reply, parse_mode="Markdown")
    except Exception:
        await msg.edit_text(reply)

async def skills_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    text = (
        "🧠 *Daftar Skills AI Agent Terpasang*\n\n"
        "1. 🛠️ *server-ops*\n"
        "   • Pantau CPU, suhu hardware (`/sys/class/thermal/...`), RAM, Swap, & Zram.\n"
        "   • Cek disk lokal `df -h -l` & failed services.\n\n"
        "2. 🐳 *docker-homelab*\n"
        "   • Monitoring & logs kontainer (Nextcloud).\n"
        "   • Cek resource kontainer (`docker stats`) & restart aman.\n\n"
        "3. 💽 *storage-hdd-manager*\n"
        "   • Cek SMART health harddisk lokal `/dev/sda` (`smartctl`).\n"
        "   • Investigasi kapasitas partisi root (`/dev/sda2`) & disk usage.\n\n"
        "4. 🌐 *network-watchdog*\n"
        "   • Diagnostik IP LAN (`192.168.100.145`), IP publik, Tailscale VPN, & Cloudflare Tunnel.\n"
        "   • Pengecekan status port listening & probe HTTP endpoint homelab.\n\n"
        "5. 🧠 *memory-guardian*\n"
        "   • Pemantauan efisiensi RAM ~3.2GB, ZRAM, dan Swap agar server tidak freeze.\n"
        "   • Deteksi kejadian kernel OOM-killer jika ada proses/kontainer yang crash.\n\n"
        "6. 🧹 *server-cleanup*\n"
        "   • Bersihkan log `journalctl --vacuum-time=3d`.\n"
        "   • Bersihkan cache apt & dangling docker images.\n\n"
        "7. 🤖 *personal-assistant*\n"
        "   • Persona asisten pribadi, format rapi & protokol keamanan eksekusi.\n\n"
        "💡 *Tips:* Anda bisa langsung bertanya lewat chat Telegram seperti:\n"
        "• *'Cek kondisi disk lokal dan partisi root'* \n"
        "• *'Bagaimana status Nextcloud, Tailscale, dan Cloudflare Tunnel?'* \n"
        "• *'Apakah ada tanda-tanda kehabisan memori atau OOM?'*"
    )
    await update.message.reply_text(text, parse_mode="Markdown")

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

def build_morning_briefing(current_model: str) -> str:
    now_str = datetime.now(WIB_TZ).strftime("%d %B %Y, %H:%M WIB")
    temp_c = get_cpu_temp()

    # Uptime
    try:
        uptime_res = subprocess.check_output(["uptime", "-p"], text=True).strip().replace("up ", "")
    except Exception:
        uptime_res = "N/A"

    # RAM
    try:
        free_out = subprocess.check_output(["free", "-h"], text=True).splitlines()
        mem_line = free_out[1].split()
        total_ram, used_ram, avail_ram = mem_line[1], mem_line[2], mem_line[6]
    except Exception:
        total_ram, used_ram, avail_ram = "N/A", "N/A", "N/A"

    # Docker
    total_containers, running_containers, stopped = 0, 0, []
    docker_available = shutil.which("docker") is not None
    if docker_available:
        try:
            dk_ps = subprocess.check_output(
                ["docker", "ps", "-a", "--format", "{{.Names}}:::{{.Status}}"],
                text=True
            ).strip().splitlines()
            total_containers = len(dk_ps)
            running_containers = sum(1 for c in dk_ps if "Up" in c)
            stopped = [c.split(":::")[0] for c in dk_ps if "Up" not in c]
        except Exception:
            docker_available = False

    # Storage
    try:
        df_out = subprocess.check_output(["df", "-h", "-l"], text=True).splitlines()
        disk_items = []
        for line in df_out[1:]:
            parts = line.split()
            if len(parts) >= 6 and parts[0].startswith("/dev/"):
                mount = parts[5]
                used_pct = parts[4]
                avail = parts[3]
                disk_items.append(f"• `{mount}`: *{used_pct}* terpakai (sisa {avail})")
    except Exception:
        disk_items = []

    lines = [
        "☀️ *[Morning Briefing Home Server]*",
        f"📅 _{now_str}_\n",
        f"🌡️ *Suhu CPU:* `{temp_c:.1f}°C` ({'Normal ✅' if temp_c < 65 else 'Hangat ⚠️'})",
        f"⏱️ *Uptime:* `{uptime_res}`",
        f"💾 *RAM:* `{used_ram}` / `{total_ram}` (Sisa tersedia: `{avail_ram}`)",
    ]
    if docker_available:
        lines.append(f"🐳 *Docker:* `{running_containers}/{total_containers}` kontainer aktif")
        if stopped:
            lines.append(f"   ↳ _Non-aktif: {', '.join(stopped[:4])}_")

    if disk_items:
        lines.append("\n💽 *Penyimpanan:*")
        lines.extend(disk_items)

    lines.append(f"\n🤖 *Model AI Aktif:* `{current_model}`")
    lines.append("\n_Server siap dan beroperasi optimal hari ini!_ 🚀")
    return "\n".join(lines)

def build_weekly_report() -> str:
    now_str = datetime.now(WIB_TZ).strftime("%d %B %Y, %H:%M WIB")

    # SMART health
    smart_status = "N/A"
    if shutil.which("smartctl") and os.path.exists("/dev/sda"):
        try:
            smart_h = subprocess.check_output(["smartctl", "-d", "sat", "-H", "/dev/sda"], text=True)
            smart_status = "PASSED ✅" if "PASSED" in smart_h else "WARNING / CHECK ⚠️"
        except Exception:
            smart_status = "N/A"

    # Journal size
    try:
        j_usage = subprocess.check_output(["journalctl", "--disk-usage"], text=True).strip()
    except Exception:
        j_usage = "N/A"

    # Dangling images
    dangling_count = 0
    if shutil.which("docker"):
        try:
            dangling_res = subprocess.check_output(
                ["docker", "images", "-f", "dangling=true", "-q"], text=True
            ).strip().splitlines()
            dangling_count = len([x for x in dangling_res if x])
        except Exception:
            dangling_count = 0

    lines = [
        "📅 *[Laporan Perawatan Mingguan Server]*",
        f"🗓️ _{now_str}_\n",
        "💽 *Kesehatan Media Penyimpanan (/dev/sda):*",
        f"• Status SMART: *{smart_status}*",
        f"• Journal Log Usage: `{j_usage}`",
    ]
    if shutil.which("docker"):
        lines.append(f"• Dangling Docker Images: `{dangling_count}` image(s)")
    lines.append("\n💡 *Rekomendasi Pemeliharaan:*")
    if dangling_count > 0:
        lines.append("• Bersihkan docker image tak terpakai: `docker image prune -f`")
    lines.append("• Bersihkan log sistem lama: `journalctl --vacuum-time=3d`")
    return "\n".join(lines)

def run_watchdog_checks() -> list:
    """Mengecek anomali kritis pada server. Mengembalikan list tuple (key, alert_message)."""
    alerts = []

    # 1. Suhu CPU
    temp_c = get_cpu_temp()
    if temp_c >= 75.0:
        alerts.append(("cpu_temp", f"🔥 *Peringatan Suhu Panas:* Suhu CPU mencapai `{temp_c:.1f}°C` (Ambang batas aman < 70°C)."))

    # 2. Harddisk USB / Storage terputus
    if not os.path.exists("/dev/sda"):
        alerts.append(("hdd_disconnect", "🔌 *Disk Penyimpanan Terputus!* Perangkat `/dev/sda` tidak terdeteksi di sistem."))

    # 3. RAM Kritis (< 120MB)
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
        mem_avail = None
        for l in lines:
            if l.startswith("MemAvailable:"):
                mem_avail = int(l.split()[1]) / 1024.0  # MB
                break
        if mem_avail is not None and mem_avail < 120.0:
            alerts.append(("low_ram", f"💾 *Peringatan Memori Kritis:* Sisa RAM fisik tersedia hanya `{mem_avail:.1f} MB`!"))
    except Exception:
        pass

    # 4. Storage Kritis
    try:
        df_out = subprocess.check_output(["df", "-h", "-l"], text=True).splitlines()
        for line in df_out[1:]:
            parts = line.split()
            if len(parts) >= 6 and parts[5] == "/":
                pct = int(parts[4].replace("%", ""))
                if pct >= 92:
                    alerts.append(("root_disk", f"💽 *Penyimpanan Root (/) Kritis:* Terpakai `{pct}%`!"))
    except Exception:
        pass

    # 5. Kontainer Utama Berhenti
    if shutil.which("docker"):
        essential = ["nextcloud-app"]
        try:
            running_raw = subprocess.check_output(
                ["docker", "ps", "--format", "{{.Names}}"], text=True
            ).strip().splitlines()
            running_set = set(running_raw)
            for c in essential:
                if c not in running_set:
                    alerts.append((f"docker_{c}", f"🐳 *Layanan Kontainer Berhenti:* Kontainer `{c}` tidak aktif!"))
        except Exception:
            pass

    # 6. Layanan Native Systemd Kritis Berhenti
    core_services = [
        ("nginx", "Web Server Nginx"),
        ("postgresql@17-main", "Database PostgreSQL 17"),
        ("mariadb", "Database MariaDB"),
        ("redis-server", "Redis Cache"),
        ("cloudflared", "Cloudflare Tunnel"),
        ("tailscaled", "Tailscale VPN"),
    ]
    for s_name, s_label in core_services:
        try:
            status = subprocess.check_output(
                ["systemctl", "is-active", s_name], text=True
            ).strip()
            if status != "active":
                alerts.append((f"svc_{s_name}", f"⚙️ *Layanan Sistem Berhenti:* `{s_label}` (`{s_name}`) tidak aktif (status: `{status}`)!"))
        except subprocess.CalledProcessError:
            alerts.append((f"svc_{s_name}", f"⚙️ *Layanan Sistem Mati:* `{s_label}` (`{s_name}`) gagal/mati!"))
        except Exception:
            pass

    return alerts

def generate_ai_weekly_digest() -> str:
    """Mengumpulkan metrik mingguan dan meminta AI membuat analisis tren & evaluasi homelab."""
    temp_c = get_cpu_temp()

    # Uptime
    try:
        uptime_res = subprocess.check_output(["uptime", "-p"], text=True).strip()
    except Exception:
        uptime_res = "N/A"

    # RAM & Swap
    try:
        free_out = subprocess.check_output(["free", "-h"], text=True).splitlines()
        ram_line = free_out[1].split()
        total_ram, used_ram, avail_ram = ram_line[1], ram_line[2], ram_line[6]
        swap_line = [l for l in free_out if "Swap:" in l]
        swap_info = swap_line[0].split()[2] if swap_line else "0B"
    except Exception:
        total_ram, used_ram, avail_ram, swap_info = "N/A", "N/A", "N/A", "N/A"

    # Docker status
    try:
        dk_all = subprocess.check_output(
            ["docker", "ps", "-a", "--format", "{{.Names}}:::{{.Status}}"], text=True
        ).strip().splitlines()
        running_cnt = sum(1 for c in dk_all if "Up" in c)
        exited_cnt = len(dk_all) - running_cnt
        exited_details = [c.replace(":::", " (") + ")" for c in dk_all if "Up" not in c]
    except Exception:
        running_cnt, exited_cnt, exited_details = 0, 0, []

    # Storage
    try:
        df_out = subprocess.check_output(["df", "-h", "-l"], text=True).splitlines()
        disk_lines = [l for l in df_out if "/dev/mmcblk0p2" in l or "/dev/sda" in l]
        disk_str = "\n".join(disk_lines)
    except Exception:
        disk_str = "N/A"

    # SMART health
    try:
        smart_out = subprocess.check_output(
            ["/usr/sbin/smartctl", "-d", "sat", "-H", "/dev/sda"], text=True
        ).strip()
        smart_status = "PASSED (Sehat)" if "PASSED" in smart_out else "PERLU DICEK"
    except Exception:
        smart_status = "N/A"

    # Journal usage
    try:
        j_usage = subprocess.check_output(["journalctl", "--disk-usage"], text=True).strip()
    except Exception:
        j_usage = "N/A"

    stats_summary = f"""Data Kondisi Server Saat Ini:
- Host: bay (Debian Linux x86_64, AMD E2-9000, RAM {total_ram})
- Uptime: {uptime_res}
- Suhu CPU: {temp_c:.1f}°C
- RAM Fisik: {used_ram}/{total_ram} (Tersedia: {avail_ram}, Swap: {swap_info})
- Docker: {running_cnt} kontainer Up, {exited_cnt} Exited
- Storage Partisi:
{disk_str}
- Systemd Journal Log: {j_usage}"""

    prompt = (
        "Kamu adalah Senior System Administrator. Buat 'AI Homelab Weekly Digest & Analisis Tren' "
        "berdasarkan data status server di atas. Format pesan Telegram yang rapi (maksimal 20 baris), ramah, "
        "gunakan emoji dan bullet points. "
        "Sorot secara tajam: 1) Analisis kapasitas penyimpanan disk, "
        "2) Analisis efisiensi memori & performa CPU, "
        "3) Rekomendasi aksi preventif mingguan."
        f"\n\n{stats_summary}"
    )

    try:
        reply = run_agy(prompt, False)
        return reply
    except Exception as e:
        return f"⚠️ Gagal membuat AI digest: {e}\n\n" + build_weekly_report()

async def check_and_notify_boot(bot_instance: Bot, chat_id: int):
    """Mengecek apakah sistem fisik baru saja menyala (pasca mati listrik atau reboot)."""
    boot_file = BOOT_FILE
    current_btime = None
    try:
        with open("/proc/stat", "r") as f:
            for line in f:
                if line.startswith("btime"):
                    current_btime = int(line.split()[1])
                    break
    except Exception:
        return

    if not current_btime:
        return

    last_btime = None
    if os.path.exists(boot_file):
        try:
            with open(boot_file, "r") as f:
                last_btime = int(f.read().strip())
        except Exception:
            pass

    # Perbarui rekam jejak btime
    try:
        with open(boot_file, "w") as f:
            f.write(str(current_btime))
    except Exception:
        pass

    # Jika boot time berbeda dari file rekam jejak -> Terjadi reboot fisik/listrik mati!
    if last_btime is not None and last_btime != current_btime:
        boot_dt = datetime.fromtimestamp(current_btime, tz=WIB_TZ).strftime("%d %B %Y, %H:%M:%S WIB")
        temp_c = get_cpu_temp()

        try:
            uptime_str = subprocess.check_output(["uptime", "-p"], text=True).strip().replace("up ", "")
        except Exception:
            uptime_str = "Baru saja"

        disk_status = "✅ Terpasang (/dev/sda2)" if os.path.exists("/dev/sda2") else "❌ Tidak terdeteksi"

        try:
            if shutil.which("docker"):
                dk_count = subprocess.check_output(["docker", "ps", "-q"], text=True).strip().splitlines()
                dk_info = f"{len([x for x in dk_count if x])} kontainer aktif"
            else:
                dk_info = "Docker tidak terpasang"
        except Exception:
            dk_info = "Docker belum aktif"

        try:
            ip_out = subprocess.check_output(["ip", "-4", "-br", "addr", "show", "scope", "global"], text=True)
            lan_match = [l.split()[2].split("/")[0] for l in ip_out.splitlines() if l.strip()]
            lan_str = lan_match[0] if lan_match else "192.168.100.145"
        except Exception:
            lan_str = "192.168.100.145"

        try:
            ts_ip = subprocess.check_output(["tailscale", "ip", "-4"], text=True).strip()
        except Exception:
            ts_ip = "Non-aktif"

        msg = (
            "⚡ *[SERVER TELAH MENYALA KEMBALI]*\n"
            "_(Terdeteksi pasca reboot / listrik hidup kembali)_\n\n"
            f"🕒 *Waktu Boot:* _{boot_dt}_\n"
            f"⏱️ *Uptime:* `{uptime_str}`\n"
            f"🌡️ *Suhu CPU:* `{temp_c:.1f}°C`\n\n"
            "🔌 *Status Storage:*\n"
            f"• Disk Root: {disk_status}\n\n"
            f"🐳 *Docker:* {dk_info}\n"
            f"🌐 *Jaringan:* LAN `{lan_str}` | Tailscale `{ts_ip}`\n\n"
            "🚀 _Seluruh layanan esensial server telah aktif dan siap digunakan!_"
        )
        try:
            await bot_instance.send_message(chat_id=chat_id, text=msg, parse_mode="Markdown")
        except Exception as e:
            print("Gagal mengirim notifikasi boot:", e)

async def briefing_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    msg = build_morning_briefing(CURRENT_MODEL)
    try:
        await update.message.reply_text(msg, parse_mode="Markdown")
    except Exception:
        await update.message.reply_text(msg)

async def weekly_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    msg = await update.message.reply_text("⏳ Sedang menyusun AI Homelab Weekly Digest...")
    reply = await asyncio.to_thread(generate_ai_weekly_digest)
    try:
        await msg.edit_text(reply, parse_mode="Markdown")
    except Exception:
        await msg.edit_text(reply)

async def morning_briefing_job(context: ContextTypes.DEFAULT_TYPE):
    msg = build_morning_briefing(CURRENT_MODEL)
    await context.bot.send_message(
        chat_id=ALLOWED_USER_ID,
        text=msg,
        parse_mode="Markdown"
    )

async def weekly_report_job(context: ContextTypes.DEFAULT_TYPE):
    reply = await asyncio.to_thread(generate_ai_weekly_digest)
    try:
        await context.bot.send_message(
            chat_id=ALLOWED_USER_ID,
            text=reply,
            parse_mode="Markdown"
        )
    except Exception:
        await context.bot.send_message(
            chat_id=ALLOWED_USER_ID,
            text=reply
        )

async def watchdog_job(context: ContextTypes.DEFAULT_TYPE):
    alerts = await asyncio.to_thread(run_watchdog_checks)
    if not alerts:
        ALERT_COOLDOWNS.clear()
        return

    now = time.time()
    to_send = []
    for key, text in alerts:
        last_sent = ALERT_COOLDOWNS.get(key, 0)
        if now - last_sent > ALERT_COOLDOWN_SECONDS:
            to_send.append(text)
            ALERT_COOLDOWNS[key] = now

    if to_send:
        alert_body = "\n\n".join(to_send)
        msg = f"🚨 *[PERINGATAN WATCHDOG KRITIS SERVER]*\n\n{alert_body}"
        await context.bot.send_message(
            chat_id=ALLOWED_USER_ID,
            text=msg,
            parse_mode="Markdown"
        )

async def incident_monitor_job(context: ContextTypes.DEFAULT_TYPE):
    """Mengecek anomali kernel (I/O hang, USB reset, OOM killer, dll) setiap 60 detik."""
    try:
        reports = await asyncio.to_thread(incident_monitor.scan_and_generate_reports, run_agy)
        for report in reports:
            try:
                await context.bot.send_message(
                    chat_id=ALLOWED_USER_ID,
                    text=report,
                    parse_mode="Markdown"
                )
            except Exception:
                await context.bot.send_message(
                    chat_id=ALLOWED_USER_ID,
                    text=report
                )
    except Exception as e:
        print("[incident_monitor_job] Error:", e)

async def incidents_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    msg = await update.message.reply_text("⏳ Sedang memeriksa riwayat insiden kernel...")
    reply = await asyncio.to_thread(incident_monitor.get_recent_incident_summary, 24)
    try:
        await msg.edit_text(reply, parse_mode="Markdown")
    except Exception:
        await msg.edit_text(reply)

async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        await update.message.reply_text(f"Akses ditolak. ID Anda: {update.effective_user.id}")
        return
    await update.message.reply_text(
        "✅ *Bot Multi-Agen & Homelab Server Aktif!*\n\n"
        "📐 *Agen Konsultan & Arsitek (Standalone / On-Demand):*\n"
        "• Chat langsung atau gunakan `/plan <ide>` untuk konsultasi teknis & pembuatan *Implementation Plan* bersama **HABIBIE** tanpa membangunkan tim 4 agen (hemat 1.5 GB RAM).\n\n"
        "🚀 *Perintah Eksekusi Tim 4 Agen:*\n"
        "• `/task <instruksi>` - Kirim tugas proyek baru ke orkestrasi 4 agen (agy)\n"
        "• `/task9 <instruksi>` - Opsi Darurat: AI Agent mandiri via 9Router (hemat kuota agy)\n"
        "• `/kanban` - Cek papan progres tugas agen secara real-time\n"
        "• `/agents` - Cek status kesehatan tim agen AI & resource\n\n"
        "📊 *Monitoring & Utilitas Server:*\n"
        "• `/plan <ide>` - Rancang Implementation Plan teknis bersama HABIBIE\n"
        "• `/briefing` - Ringkasan status server harian (Morning Briefing)\n"
        "• `/limit` - Cek sisa limit token & kuota AI\n"
        "• `/audit` - Cek usage CPU, RAM, Suhu, Disk & Service mendalam\n"
        "• `/incidents` - Cek riwayat insiden I/O, reset USB, atau freeze sistem (24 jam)\n"
        "• `/skills` - Lihat keahlian & skills AI terpasang\n"
        "• `/weekly` - AI Homelab Weekly Digest & Analisis Tren\n"
        "• `/model` - Ganti pilihan model AI\n"
        "• `/reset` - Mulai percakapan baru dengan HABIBIE",
        parse_mode="Markdown"
    )

async def plan_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Menyusun Implementation Plan arsitektur teknis bersama HABIBIE."""
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    raw_args = list(context.args) if context.args else []
    if not raw_args:
        await update.message.reply_text(
            "📐 *[HABIBIE - CHIEF ARCHITECT & PLANNER]*\n\n"
            "Format:\n"
            "`/plan <deskripsi ide atau kebutuhan fitur>`\n\n"
            "Contoh:\n"
            "• `/plan buatkan endpoint dan modal filter portofolio di infobay`\n"
            "• `/plan implementasikan notifikasi email saat disk > 90%`\n"
            "• `/plan arsitektur sistem antrean background jobs`\n\n"
            "HABIBIE akan menyusun *Implementation Plan* teknis yang memetakan tugas untuk JOKOWI (backend), PRABOWO (frontend), dan GIBRAN (QA).",
            parse_mode="Markdown"
        )
        return

    ide = " ".join(raw_args).strip()
    msg = await update.message.reply_text("📐 [HABIBIE] Sedang merancang Implementation Plan arsitektur teknis...")

    plan_prompt = (
        f"Sebagai HABIBIE (Chief Architect & Strategic Planner), buatkan 'Implementation Plan' "
        f"teknis yang presisi, efisien, dan anti-overengineering untuk kebutuhan berikut:\n\n"
        f"'{ide}'\n\n"
        f"Struktur rencana wajib mencakup:\n"
        f"1. 🎯 *Tujuan & Scope Fitur*\n"
        f"2. 🗄️ *Tugas Backend (JOKOWI)*: Model, DB Migration, Routes API & Logika\n"
        f"3. 🎨 *Tugas Frontend (PRABOWO)*: Komponen UI, State & Responsivitas\n"
        f"4. 🛡️ *Checklist QA & Verifikasi (GIBRAN)*: Test cases, edge cases & kriteria lulus\n"
        f"5. 🚀 *Langkah Orkestrasi (LUHUT)*: Urutan eksekusi, build & deployment\n\n"
        f"Format dengan markdown yang rapi, ringkas, dan mudah dibaca di Telegram."
    )

    current_engine = get_current_engine()
    if current_engine == "agy":
        reply = await asyncio.to_thread(run_agy, plan_prompt, False)
    else:
        reply = await asyncio.to_thread(call_9router, plan_prompt)
        if reply.startswith("⚠️"):
            reply = await asyncio.to_thread(run_agy, plan_prompt, False)

    # Simpan plan ke file lokal data/plans/ agar bisa dibaca di BayOffice
    saved_info = ""
    if plans_manager:
        try:
            p_title = ide[:50]
            m_title = re.search(r"^#\s+(?:Implementation Plan:\s*)?(.+)$", reply, re.MULTILINE | re.IGNORECASE)
            if m_title:
                p_title = m_title.group(1).strip()
            
            proj = "infobay" if "infobay" in ide.lower() else "bayoffice"
            saved = plans_manager.save_plan(
                title=p_title,
                content=reply,
                project=proj,
                author="HABIBIE",
                status="Draft",
                engine=current_engine,
                model=CURRENT_MODEL if current_engine == "agy" else None
            )
            saved_id = saved.get("id")
            saved_info = f"\n\n📄 *Dokumen Rencana:* `{saved_id}` (Tersimpan di `data/plans/` & siap dibaca di BayOffice)"
        except Exception as e:
            print(f"⚠️ Gagal menyimpan plan ke data/plans: {e}")

    reply_footer = (
        f"{saved_info}\n\n"
        f"💡 *Siap dieksekusi?* Kirim tugas ke tim agen dengan:\n"
        f"`/task <proyek> {ide[:60]}`"
    )
    full_reply = f"📐 *[IMPLEMENTATION PLAN - HABIBIE]*\n\n{reply}{reply_footer}"

    try:
        await msg.edit_text(full_reply, parse_mode="Markdown")
    except Exception:
        await msg.edit_text(full_reply)

async def manual_audit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    msg = await update.message.reply_text("🔍 Sedang mengaudit sistem server bay...")
    prompt = (
        "Periksa kondisi server sekarang: jalankan uptime, free -h, df -h /, "
        "cek suhu hardware (hwmon /sys/class/hwmon/hwmon*/temp*_input atau thermal_zone), "
        "5 proses pemakai RAM terbesar, dan systemctl --failed. Buat ringkasan rapi."
    )
    reply = await asyncio.to_thread(run_agy, prompt, False)
    await msg.edit_text(f"📊 *Hasil Audit Sistem*\n\n{reply}")

async def reset_session(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global ROUTER9_CHAT_HISTORY
    if update.effective_user.id != ALLOWED_USER_ID:
        return
    ROUTER9_CHAT_HISTORY.clear()
    reply = await asyncio.to_thread(run_agy, "Mulai sesi baru dan sapa saya singkat.", False)
    await update.message.reply_text(f"🔄 Sesi percakapan direset (agy & 9Router).\n\n{reply}")

async def handle_chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    # Deteksi cepat jika user bertanya tentang limit/token/kuota tanpa garis miring (slash)
    text_clean = update.message.text.strip().lower()
    if text_clean in [
        "cek limit", "limit", "sisa limit", "limit token", "sisa token",
        "cek kuota", "kuota", "kuota token", "sisa kuota", "cek limit token",
        "cek sisa token", "cek sisa limit"
    ]:
        msg = await update.message.reply_text("⏳ Sedang memeriksa sisa limit token & kuota AI...")
        reply = await asyncio.to_thread(check_token_limit)
        try:
            await msg.edit_text(reply, parse_mode="Markdown")
        except Exception:
            await msg.edit_text(reply)
        return

    # Deteksi cepat jika user bertanya tentang freeze/insiden
    if text_clean in [
        "cek freeze", "freeze", "cek insiden", "insiden", "riwayat insiden",
        "ada freeze", "kenapa freeze", "cek hang", "hang"
    ]:
        msg = await update.message.reply_text("⏳ Sedang memeriksa riwayat insiden kernel...")
        reply = await asyncio.to_thread(incident_monitor.get_recent_incident_summary, 24)
        try:
            await msg.edit_text(reply, parse_mode="Markdown")
        except Exception:
            await msg.edit_text(reply)
        return

    # Deteksi apakah pesan butuh tindakan operasional server langsung
    ops_keywords = [
        "cek ram", "cek disk", "cek cpu", "cek suhu", "cek docker", "restart",
        "systemctl", "reboot", "journalctl", "kill", "status server", "periksa server",
        "bersihkan cache", "backup database", "git status", "git pull", "kanban",
        "luhut", "jokowi", "prabowo", "gibran", "jalankan", "eksekusi", "audit", "top ram"
    ]
    is_ops_action = any(k in text_clean for k in ops_keywords)

    current_engine = get_current_engine()

    # Jika mode interaktif "Selalu Tanya" dan bukan aksi operasional server
    if current_engine == "ask" and not is_ops_action:
        cleanup_pending_queries()
        q_id = str(int(time.time() * 1000))[-8:]
        PENDING_CHAT_QUERIES[q_id] = {"prompt": update.message.text, "time": time.time()}

        preview = update.message.text[:80] + ("..." if len(update.message.text) > 80 else "")
        keyboard = [
            [
                InlineKeyboardButton("⚡ 9Router (Cepat/Hemat)", callback_data=f"ask_engine:9router:{q_id}"),
                InlineKeyboardButton("🧠 AGY (Server/Deep)", callback_data=f"ask_engine:agy:{q_id}")
            ]
        ]
        await update.message.reply_text(
            f"💬 *Pertanyaan:*\n_{preview}_\n\nPilih otak AI untuk menjawab:",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )
        return

    if is_ops_action or current_engine == "agy":
        msg = await update.message.reply_text("📐 [HABIBIE / AGY] Sedang memeriksa sistem server...")
        reply = await asyncio.to_thread(run_agy, update.message.text, True)
        # Jika agy mengalami kendala kuota atau limit, tawarkan atau fallback ke Emergency Agent
        if any(err_word in reply.lower() for err_word in ["quota", "rate limit", "exceeded", "429"]):
            try:
                await msg.edit_text(
                    f"{reply}\n\n⚠️ *Kuota agy limit! Mencoba dialihkan ke 9Router Emergency Agent...*",
                    parse_mode="Markdown"
                )
            except Exception:
                await msg.edit_text(f"{reply}\n\n⚠️ Kuota agy limit! Mencoba dialihkan ke 9Router Emergency Agent...")
            reply_emg = await asyncio.to_thread(
                emergency_agent.run_emergency_agent,
                task_instruction=update.message.text,
                target_dir=str(WORKSPACE_DIR),
                project_id="server"
            )
            try:
                await msg.edit_text(reply_emg, parse_mode="Markdown")
            except Exception:
                await msg.edit_text(reply_emg)
            return

        cleanup_pending_queries()
        q_id = str(int(time.time() * 1000))[-8:]
        PENDING_CHAT_QUERIES[q_id] = {"prompt": update.message.text, "time": time.time()}
        keyboard = [[InlineKeyboardButton("⚡ Coba Tanya via 9Router", callback_data=f"reask:9router:{q_id}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        try:
            await msg.edit_text(reply, reply_markup=reply_markup, parse_mode="Markdown")
        except Exception:
            await msg.edit_text(reply, reply_markup=reply_markup)
    else:
        # Default: 9Router (cepat & hemat kuota)
        msg = await update.message.reply_text("📐 [HABIBIE] Mengetik...")
        reply = await asyncio.to_thread(call_9router, update.message.text)
        # Jika 9Router gagal (misal koneksi jaringan putus), fallback ke agy
        if reply.startswith("⚠️"):
            reply = await asyncio.to_thread(run_agy, update.message.text, True)

        cleanup_pending_queries()
        q_id = str(int(time.time() * 1000))[-8:]
        PENDING_CHAT_QUERIES[q_id] = {"prompt": update.message.text, "time": time.time()}
        keyboard = [[InlineKeyboardButton("🧠 Coba Tanya via AGY", callback_data=f"reask:agy:{q_id}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        try:
            await msg.edit_text(reply, reply_markup=reply_markup, parse_mode="Markdown")
        except Exception:
            await msg.edit_text(reply, reply_markup=reply_markup)

async def scheduled_audit(context: ContextTypes.DEFAULT_TYPE):
    prompt = (
        "Lakukan audit berkala: cek load average, penggunaan RAM (free -h), sisa disk (df -h /), "
        "suhu CPU (sensor hwmon /sys/class/hwmon/hwmon*/temp*_input atau thermal_zone), dan service yang gagal. "
        "Ringkas maksimal 8 baris dan beri peringatan jika ada yang di atas 85%."
    )
    reply = await asyncio.to_thread(run_agy, prompt, False)
    await context.bot.send_message(
        chat_id=ALLOWED_USER_ID,
        text=f"⏰ *[Laporan Audit Otomatis]*\n\n{reply}"
    )

def get_kanban_summary(show_all: bool = False) -> str:
    if not os.path.exists(KANBAN_FILE):
        return "⚠️ File `kanban.json` tidak ditemukan di direktori kerja."

    try:
        data = read_json_safe(KANBAN_FILE, default={}) or {}
    except Exception as e:
        return f"⚠️ Gagal membaca `kanban.json`: {e}"

    tasks = data.get("tasks", [])
    if not tasks:
        return (
            "📋 *PAPAN KANBAN PROYEK*\n\n"
            "_(Belum ada tugas di kanban)_\n\n"
            "💡 *Tip:* Gunakan perintah `/task <deskripsi proyek>` untuk mulai memberikan tugas ke tim agen."
        )

    categories = {
        "To-Do": [],
        "In-Progress": [],
        "QA-Review": [],
        "Done": [],
        "Lainnya": []
    }

    for t in tasks:
        if isinstance(t, str):
            title = t
            status_raw = "To-Do"
            assignee = ""
        elif isinstance(t, dict):
            title = t.get("title") or t.get("task") or t.get("name") or t.get("description") or "Tugas tanpa judul"
            status_raw = str(t.get("status", "To-Do")).strip()
            assignee = t.get("assignee") or t.get("target") or t.get("role") or t.get("agent") or ""
        else:
            continue

        assignee_str = f" `[{assignee.upper()}]` " if assignee else " "
        status_norm = status_raw.lower()

        if any(k in status_norm for k in ["to-do", "todo", "backlog", "antrean"]):
            categories["To-Do"].append(f"•{assignee_str}{title}")
        elif any(k in status_norm for k in ["in-progress", "in progress", "progress", "doing", "kerja"]):
            categories["In-Progress"].append(f"•{assignee_str}{title}")
        elif any(k in status_norm for k in ["qa", "review", "audit", "testing"]):
            categories["QA-Review"].append(f"•{assignee_str}{title}")
        elif any(k in status_norm for k in ["done", "selesai", "complete", "lulus"]):
            categories["Done"].append(f"•{assignee_str}{title}")
        else:
            categories["Lainnya"].append(f"•{assignee_str}{title} _({status_raw})_")

    lines = ["📋 *PAPAN KANBAN PROYEK*\n"]

    lines.append("🟡 *In-Progress:*")
    if categories["In-Progress"]:
        lines.extend(categories["In-Progress"])
    else:
        lines.append("• _(Kosong)_")
    lines.append("")

    lines.append("🔍 *QA-Review:*")
    if categories["QA-Review"]:
        lines.extend(categories["QA-Review"])
    else:
        lines.append("• _(Kosong)_")
    lines.append("")

    lines.append("⏳ *To-Do:*")
    if categories["To-Do"]:
        lines.extend(categories["To-Do"])
    else:
        lines.append("• _(Kosong)_")
    lines.append("")

    lines.append("✅ *Done:*")
    if categories["Done"]:
        if not show_all and len(categories["Done"]) > 8:
            lines.extend(categories["Done"][-8:])
            hidden_count = len(categories["Done"]) - 8
            lines.append(f"• _... dan {hidden_count} tugas selesai lainnya (ketik `/kanban all` untuk lihat semua)_")
        else:
            lines.extend(categories["Done"])
    else:
        lines.append("• _(Kosong)_")

    if categories["Lainnya"]:
        lines.append("\n📁 *Lainnya:*")
        lines.extend(categories["Lainnya"])

    total = len(tasks)
    c_done = len(categories["Done"])
    c_qa = len(categories["QA-Review"])
    c_prog = len(categories["In-Progress"])
    c_todo = len(categories["To-Do"])

    lines.append(f"\n📊 *Total Tugas:* {total} (✅ {c_done} | 🔍 {c_qa} | 🟡 {c_prog} | ⏳ {c_todo})")
    return "\n".join(lines)

# ==========================================================
# ORCHESTRATOR LIFECYCLE (AUTO-SLEEP & AUTO-WAKEUP)
# ==========================================================
SPRINT_DONE_START_TIME = None
SPRINT_SLEEP_COOLDOWN_SECONDS = 180  # 3 menit jeda aman setelah sprint 100% Done
LAST_ACTIVE_TASK_TIME = 0

async def orchestrator_sleep_job(context: ContextTypes.DEFAULT_TYPE):
    global SPRINT_DONE_START_TIME, LAST_ACTIVE_TASK_TIME

    # 1. Cek apakah sesi tmux agy_agents sedang aktif
    res = subprocess.run(["tmux", "has-session", "-t", "agy_agents"], capture_output=True)
    if res.returncode != 0:
        SPRINT_DONE_START_TIME = None
        return

    # Jangan tidurkan jika baru saja ada perintah /task dalam 5 menit terakhir
    if time.time() - LAST_ACTIVE_TASK_TIME < 300:
        return

    # 2. Cek status tugas di kanban.json
    if not os.path.exists(KANBAN_FILE):
        return

    try:
        data = read_json_safe(KANBAN_FILE, default={}) or {}
    except Exception:
        return

    tasks = data.get("tasks", [])
    if not tasks:
        return

    # Cek apakah seluruh tugas berstatus selesai (Done / Selesai / Passed)
    all_done = True
    for t in tasks:
        if isinstance(t, dict):
            status = str(t.get("status", "")).strip().lower()
            if not any(k in status for k in ["done", "selesai", "passed", "complete"]):
                all_done = False
                break
        else:
            all_done = False
            break

    if not all_done:
        SPRINT_DONE_START_TIME = None
        return

    # Jika seluruh tugas 100% selesai:
    now = time.time()
    if SPRINT_DONE_START_TIME is None:
        SPRINT_DONE_START_TIME = now
        return

    # Jika sudah melewati batas cooldown 3 menit
    if now - SPRINT_DONE_START_TIME >= SPRINT_SLEEP_COOLDOWN_SECONDS:
        SPRINT_DONE_START_TIME = None

        # Matikan proses dev jika masih ada yang tersisa
        subprocess.run(["pkill", "-f", "npm exec vite"], capture_output=True)
        subprocess.run(["pkill", "-f", "vite --host"], capture_output=True)

        # Matikan sesi tmux agy_agents
        subprocess.run(["tmux", "kill-session", "-t", "agy_agents"], capture_output=True)

        msg = (
            "💤 *[ORCHESTRATOR AUTO-SLEEP]*\n\n"
            "✅ *Status:* Seluruh tugas di `kanban.json` telah 100% *Done*.\n"
            "⚡ *Tindakan:* Sesi 4 agen (`agy_agents`) dinonaktifkan sementara untuk membebaskan **~1.5 GB RAM**.\n\n"
            "🌐 *Web Infobay:* Tetap aktif 24/7 di port 80 & 9000 (disajikan mandiri via Nginx & systemd backend).\n"
            "💡 Kirim perintah `/task <instruksi>` kapan saja untuk membangunkan kembali tim agen!"
        )
        try:
            await context.bot.send_message(chat_id=ALLOWED_USER_ID, text=msg, parse_mode="Markdown")
        except Exception:
            await context.bot.send_message(chat_id=ALLOWED_USER_ID, text=msg)

async def task_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global LAST_ACTIVE_TASK_TIME, SPRINT_DONE_START_TIME
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    LAST_ACTIVE_TASK_TIME = time.time()
    SPRINT_DONE_START_TIME = None

    raw_args = list(context.args) if context.args else []
    if not raw_args:
        await update.message.reply_text(
            "⚠️ *Harap sertakan deskripsi tugas!*\n\n"
            "Format:\n"
            "`/task [nama_proyek] <instruksi tugas>`\n\n"
            "Contoh:\n"
            "• `/task bayoffice buatkan fitur export kanban`\n"
            "• `/task infobay ubah warna tombol hire me`\n"
            "• `/task buatkan endpoint backend CRUD produk` (otomatis deteksi)",
            parse_mode="Markdown"
        )
        return

    # 1. Deteksi Target Proyek (Eksplisit atau Otomatis)
    known_projects = ["infobay", "bayoffice"]
    try:
        if os.path.exists(PROJECTS_FILE):
            p_reg = read_json_safe(PROJECTS_FILE, default={}) or {}
            known_projects = list(p_reg.get("projects", {}).keys())
    except Exception:
        pass

    first_arg = raw_args[0].lower().strip()
    if first_arg in known_projects:
        project_id = first_arg
        instruction = " ".join(raw_args[1:]).strip()
    else:
        # Cek apakah ada kata kunci nama proyek di teks
        instruction = " ".join(raw_args).strip()
        instr_low = instruction.lower()
        if "bayoffice" in instr_low or "canvas" in instr_low or "8888" in instr_low or "virtual office" in instr_low:
            project_id = "bayoffice"
        elif "infobay" in instr_low or "portofolio" in instr_low or "porto" in instr_low or "9000" in instr_low:
            project_id = "infobay"
        else:
            project_id = "infobay"  # default fallback

    if not instruction:
        await update.message.reply_text(
            f"⚠️ Harap sertakan instruksi untuk proyek `{project_id}`!\nContoh: `/task {project_id} <instruksi>`",
            parse_mode="Markdown"
        )
        return

    # 2. Klasifikasi Cerdas & Tentukan Target Direktori Berdasarkan Proyek
    instr_lower = instruction.lower()
    fe_keywords = ["frontend", "ui", "tampilan", "footer", "header", "navbar", "css", "button", "tombol", "halaman", "porto", "komponen", "vite", "react", "styling", "warna", "fab", "canvas"]
    be_keywords = ["backend", "api", "database", "migrasi", "seeder", "laravel", "controller", "tabel", "model", "sanctum", "endpoint", "query", "postgresql", "pgsql", "fastapi"]

    is_fe = any(k in instr_lower for k in fe_keywords)
    is_be = any(k in instr_lower for k in be_keywords)

    project_root = str(WORKSPACE_DIR / project_id)

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

    task_id = "TASK-01"
    try:
        if os.path.exists(KANBAN_FILE):
            k_data = read_json_safe(KANBAN_FILE, default={"tasks": []}) or {"tasks": []}

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

            now_iso = datetime.now().astimezone().isoformat()
            new_task_entry = {
                "id": task_id,
                "project": project_id,
                "assignee": target_agent,
                "title": (instruction[:80] + "...") if len(instruction) > 80 else instruction,
                "skills_required": skills,
                "description": instruction,
                "status": "To-Do",
                "target_dir": target_dir,
                "engine": "agy",
                "model": CURRENT_MODEL,
                "created_at": now_iso,
                "notes": f"Tugas baru via Telegram /task [Proyek: {project_id} | {category}]. Target pelaksana: {target_agent}."
            }
            k_data.setdefault("tasks", []).append(new_task_entry)
            write_json_safe(KANBAN_FILE, k_data)
    except Exception as e:
        print(f"Error logging to kanban: {e}")

    # 3. Pastikan sesi tmux berjalan (Auto-Wakeup dengan Direct Task Injection)
    res = subprocess.run(["tmux", "has-session", "-t", TMUX_SESSION_NAME], capture_output=True)
    if res.returncode != 0:
        task_summary = f"{task_id} [Proyek: {project_id}] ({category}): {instruction}"
        env = os.environ.copy()
        env["AGY_MODEL"] = CURRENT_MODEL
        subprocess.run([START_AGENTS_SCRIPT, "daemon", task_summary], capture_output=True, env=env)
    else:
        try:
            if target_agent == "PRABOWO":
                delegation_hint = f"Tugas Frontend: Segera bangunkan PRABOWO ({TMUX_SESSION_NAME}:0.3) di {target_dir}"
            elif target_agent == "JOKOWI":
                delegation_hint = f"Tugas Backend: Segera bangunkan JOKOWI ({TMUX_SESSION_NAME}:0.2) di {target_dir}"
            else:
                delegation_hint = f"Dekomposisi tugas pada proyek {project_id} ke PRABOWO atau JOKOWI"

            model_note = f" (Model AGY: {CURRENT_MODEL})"
            prompt_to_luhut = (
                f"Tugas baru [Proyek: {project_id}{model_note}]: '{instruction}'. Telah dicatat di kanban.json sebagai {task_id} ({category}) di {target_dir}. "
                f"ATURAN FAST-TRACK: {delegation_hint} via tmux send-keys, laporkan ke Telegram via python3 {BOT_SCRIPT} '[LUHUT]: ...', "
                f"lalu MASUK STANDBY PASIF. DILARANG audit kode atau loop checking!"
            )
            subprocess.run(
                ["tmux", "send-keys", "-t", f"{TMUX_SESSION_NAME}:0.0", prompt_to_luhut, "Enter"],
                check=True
            )
        except Exception as e:
            await update.message.reply_text(f"⚠️ Gagal mengirim ke tmux LUHUT: {e}")
            return

    # Notifikasi konfirmasi (aman dari error Markdown entity)
    preview = (instruction[:300] + "...") if len(instruction) > 300 else instruction
    reply = (
        "🚀 *[TUGAS DITERUSKAN KE TIM AGENT]*\n\n"
        f"📋 *ID Tugas:* `{task_id}` ({category})\n"
        f"📁 *Proyek:* `{project_id}`\n"
        f"👤 *Target Pelaksana:* `{target_agent}`\n"
        f"🧠 *Engine & Model:* `AGY` (`{CURRENT_MODEL}`)\n"
        f"📂 *Direktori:* `{target_dir}`\n"
        f"📝 *Instruksi:* \"{preview}\"\n\n"
        "⚡ *Universal Multi-Project:* LUHUT langsung mendelegasikan ke pelaksana di direktori proyek terkait.\n"
        "💡 Pantau perkembangan dengan perintah `/kanban`!"
    )
    try:
        await update.message.reply_text(reply, parse_mode="Markdown")
    except Exception:
        await update.message.reply_text(reply)

async def task9_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Menjalankan tugas tim 4 agen (LUHUT, JOKOWI, PRABOWO, GIBRAN) via 9Router Engine (gemini-free-smart)."""
    global LAST_ACTIVE_TASK_TIME, SPRINT_DONE_START_TIME
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    LAST_ACTIVE_TASK_TIME = time.time()
    SPRINT_DONE_START_TIME = None

    raw_args = list(context.args) if context.args else []
    if not raw_args:
        await update.message.reply_text(
            "🚀 *[VIRTUAL SQUAD 4 AGEN - 9ROUTER ENGINE]*\n\n"
            "Mode ini menggerakkan tim 4 agen (**LUHUT, JOKOWI, PRABOWO, GIBRAN**) menggunakan mesin 9Router (`gemini-free-smart`) di server 146 tanpa memakan kuota Antigravity (`agy`).\n\n"
            "Format:\n"
            "`/task9 [nama_proyek] <instruksi tugas>`\n\n"
            "Contoh:\n"
            "• `/task9 periksa status service postgresql dan disk`\n"
            "• `/task9 infobay rapikan tampilan navbar frontend`\n"
            "• `/task9 bayoffice buatkan endpoint API backend baru`",
            parse_mode="Markdown"
        )
        return

    # 1. Deteksi Target Proyek
    known_projects = ["infobay", "bayoffice"]
    try:
        if os.path.exists(PROJECTS_FILE):
            p_reg = read_json_safe(PROJECTS_FILE, default={}) or {}
            known_projects = list(p_reg.get("projects", {}).keys())
    except Exception:
        pass

    first_arg = raw_args[0].lower().strip()
    if first_arg in known_projects:
        project_id = first_arg
        instruction = " ".join(raw_args[1:]).strip()
    else:
        instruction = " ".join(raw_args).strip()
        instr_low = instruction.lower()
        if "bayoffice" in instr_low:
            project_id = "bayoffice"
        elif "infobay" in instr_low:
            project_id = "infobay"
        else:
            project_id = "server"

    preview = (instruction[:250] + "...") if len(instruction) > 250 else instruction
    status_msg = await update.message.reply_text(
        f"🚀 *[VIRTUAL SQUAD 9ROUTER DIAKTIFKAN]*\n\n"
        f"📁 *Proyek:* `{project_id}`\n"
        f"📝 *Instruksi:* \"{preview}\"\n"
        f"⚡ *Engine:* `9Router (gemini-free-smart)`\n\n"
        f"👔 *LUHUT* sedang menganalisis & mendelegasikan tugas...",
        parse_mode="Markdown"
    )

    last_update_time = [time.time()]
    loop = asyncio.get_running_loop()

    def on_progress(step_info: str):
        now = time.time()
        if now - last_update_time[0] >= 1.2:
            last_update_time[0] = now
            asyncio.run_coroutine_threadsafe(
                status_msg.edit_text(
                    f"🚀 *[VIRTUAL SQUAD 9ROUTER BERJALAN]*\n"
                    f"📁 *Proyek:* `{project_id}`\n\n"
                    f"{step_info}",
                    parse_mode="Markdown"
                ),
                loop
            )

    report = await asyncio.to_thread(
        emergency_agent.run_virtual_squad_9router,
        task_instruction=instruction,
        project_id=project_id,
        progress_callback=on_progress
    )

    try:
        await status_msg.edit_text(report, parse_mode="Markdown")
    except Exception:
        await status_msg.edit_text(report)

async def kanban_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    show_all = False
    if context.args and context.args[0].lower() in ["all", "full", "semua"]:
        show_all = True

    summary = await asyncio.to_thread(get_kanban_summary, show_all)

    if len(summary) <= 4000:
        try:
            await update.message.reply_text(summary, parse_mode="Markdown")
        except Exception:
            await update.message.reply_text(summary)
    else:
        # Split menjadi beberapa pesan jika melebihi batas 4096 karakter Telegram
        chunks = []
        current = []
        curr_len = 0
        for line in summary.split("\n"):
            if curr_len + len(line) + 1 > 3800:
                chunks.append("\n".join(current))
                current = [line]
                curr_len = len(line)
            else:
                current.append(line)
                curr_len += len(line) + 1
        if current:
            chunks.append("\n".join(current))

        for chunk in chunks:
            try:
                await update.message.reply_text(chunk, parse_mode="Markdown")
            except Exception:
                await update.message.reply_text(chunk)

async def agents_status_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ALLOWED_USER_ID:
        return

    res = subprocess.run(["tmux", "has-session", "-t", "agy_agents"], capture_output=True)
    tmux_active = (res.returncode == 0)

    svc_res = subprocess.run(["systemctl", "is-active", "agy-agents.service"], capture_output=True, text=True)
    svc_status = svc_res.stdout.strip()

    try:
        free_out = subprocess.check_output(["free", "-h"], text=True)
        mem_avail = [line.split()[6] for line in free_out.splitlines() if "Mem:" in line][0]
    except Exception:
        mem_avail = "N/A"

    try:
        load_avg = os.getloadavg()
        load_str = f"{load_avg[0]:.2f}, {load_avg[1]:.2f}, {load_avg[2]:.2f}"
    except Exception:
        load_str = "N/A"

    status_icon = "🟢 Aktif" if tmux_active else "💤 Hibernasi (Auto-Sleep / Hemat RAM)"

    reply = (
        f"🤖 *STATUS TIM AGEN AI HOMELAB*\n\n"
        f"• Sesi Tmux: `{status_icon}` (`agy_agents`)\n"
        f"• Service Systemd: `{svc_status}` (`agy-agents.service`)\n"
        f"• RAM Tersedia: `{mem_avail}` | Load CPU: `{load_str}`\n\n"
        f"👥 *Daftar Agen:*\n"
        f"1. `LUHUT`   : Lead Orchestrator & Universal DevOps (Pane 0)\n"
        f"2. `GIBRAN`  : Universal QA & Security Auditor (Pane 1)\n"
        f"3. `JOKOWI`  : Polyglot Backend Engineer (Pane 2)\n"
        f"4. `PRABOWO` : Polyglot Frontend Engineer (Pane 3)\n"
        f"5. `HABIBIE` : Chief Architect, Strategic Planner & Homelab Advisor (Standalone / On-Demand)\n\n"
        f"💡 Rancang fitur: `/plan <ide>`\n"
        f"🚀 Beri tugas baru: `/task <deskripsi>`\n"
        f"📊 Cek Kanban: `/kanban`"
    )
    await update.message.reply_text(reply, parse_mode="Markdown")

async def post_init(application: Application):
    commands = [
        BotCommand("start", "Memulai bot dan melihat informasi"),
        BotCommand("plan", "Rancang Implementation Plan teknis bersama HABIBIE"),
        BotCommand("engine", "Pilih otak chat default: 9Router / AGY / Selalu Tanya"),
        BotCommand("agy", "Tanya langsung ke otak AGY Antigravity"),
        BotCommand("9", "Tanya langsung ke otak 9Router"),
        BotCommand("task", "Kirim proyek/tugas baru ke tim orkestrasi 4 agen (agy)"),
        BotCommand("task9", "Opsi Darurat: AI Agent mandiri via 9Router"),
        BotCommand("kanban", "Lihat papan progres kanban agen secara real-time"),
        BotCommand("agents", "Cek status kesehatan dan tim agen AI"),
        BotCommand("briefing", "Ringkasan status server harian (Morning Briefing)"),
        BotCommand("incidents", "Cek riwayat insiden I/O, reset USB, atau freeze (24 jam)"),
        BotCommand("limit", "Cek sisa limit token & kuota AI"),
        BotCommand("audit", "Menjalankan audit sistem server secara manual"),
        BotCommand("skills", "Lihat daftar skill AI yang terpasang"),
        BotCommand("weekly", "AI Homelab Weekly Digest & Analisis Tren"),
        BotCommand("model", "Mengubah model AI yang digunakan"),
        BotCommand("reset", "Memulai sesi percakapan baru"),
    ]
    await application.bot.set_my_commands(commands)

    # Inisialisasi cursor log kernel untuk incident monitor
    incident_monitor.init_cursor()

    # Cek apakah server baru saja menyala pasca reboot fisik / listrik mati
    await check_and_notify_boot(application.bot, ALLOWED_USER_ID)

def main():
    if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
        print("⚠️ [Telebot] TELEGRAM_BOT_TOKEN belum diatur di .env! Silakan isi token Telegram Anda.")
        print("ℹ️ Layanan telebot masuk mode standby menunggu konfigurasi token...")
        while True:
            time.sleep(60)

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler(["plan", "arsitek", "rancang"], plan_cmd))
    app.add_handler(CommandHandler(["engine", "mode"], engine_cmd))
    app.add_handler(CommandHandler(["agy", "antigravity"], direct_agy_cmd))
    app.add_handler(CommandHandler(["9", "r9", "router9"], direct_9router_cmd))
    app.add_handler(CommandHandler(["task", "project", "build"], task_cmd))
    app.add_handler(CommandHandler(["task9", "emergency", "agent9"], task9_cmd))
    app.add_handler(CommandHandler(["kanban", "progress", "board"], kanban_cmd))
    app.add_handler(CommandHandler(["agents", "team"], agents_status_cmd))
    app.add_handler(CommandHandler("briefing", briefing_cmd))
    app.add_handler(CommandHandler(["incidents", "freeze", "insiden"], incidents_cmd))
    app.add_handler(CommandHandler("weekly", weekly_cmd))
    app.add_handler(CommandHandler(["limit", "quota", "token", "usage"], limit_cmd))
    app.add_handler(CommandHandler("audit", manual_audit))
    app.add_handler(CommandHandler("skills", skills_cmd))
    app.add_handler(CommandHandler("reset", reset_session))
    app.add_handler(CommandHandler("model", set_model_cmd))
    app.add_handler(CallbackQueryHandler(callback_query_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_chat))

    # 1. Morning Briefing: Setiap hari pukul 07:00 WIB
    app.job_queue.run_daily(
        morning_briefing_job,
        time=dtime(hour=7, minute=0, tzinfo=WIB_TZ),
        days=(0, 1, 2, 3, 4, 5, 6),
        name="morning_briefing"
    )

    # 2. Watchdog Insiden Kernel & Freeze (Hybrid): Berjalan setiap 60 detik (1 menit)
    app.job_queue.run_repeating(
        incident_monitor_job,
        interval=60,
        first=15,
        name="incident_monitor"
    )

    # 3. Watchdog Kritis Statis: Berjalan setiap 10 menit (600s), mulai 45 detik setelah bot start
    # Hanya mengirim alert jika mendeteksi anomali (suhu >=75°C, RAM <120MB, disk kritis, USB putus, kontainer mati)
    app.job_queue.run_repeating(
        watchdog_job,
        interval=600,
        first=45,
        name="watchdog_monitor"
    )

    # 4. Laporan Perawatan Mingguan: Setiap hari Minggu pukul 20:00 WIB
    app.job_queue.run_daily(
        weekly_report_job,
        time=dtime(hour=20, minute=0, tzinfo=WIB_TZ),
        days=(6,),
        name="weekly_maintenance"
    )

    # 5. Orchestrator Lifecycle Watchdog (Auto-Sleep saat Sprint 100% Selesai): Setiap 60 detik
    app.job_queue.run_repeating(
        orchestrator_sleep_job,
        interval=60,
        first=30,
        name="orchestrator_lifecycle"
    )

    print("Bot Telegram Antigravity berjalan... Tekan Ctrl+C untuk berhenti.")
    app.run_polling()

async def send_cli_message(message: str):
    if not BOT_TOKEN or "YOUR_TELEGRAM_BOT_TOKEN" in BOT_TOKEN:
        print(f"📢 [Local Notification (Telegram Token Not Configured)]: {message}")
        return

    bot = Bot(token=BOT_TOKEN)
    try:
        await bot.send_message(chat_id=ALLOWED_USER_ID, text=message, parse_mode="Markdown")
    except Exception:
        await bot.send_message(chat_id=ALLOWED_USER_ID, text=message)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        cli_text = sys.argv[1] if len(sys.argv) == 2 else " ".join(sys.argv[1:])
        asyncio.run(send_cli_message(cli_text))
    else:
        main()
