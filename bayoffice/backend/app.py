import os
import json
import time
import asyncio
import secrets
import threading
from typing import Optional, Dict, List
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Muat environment dari root bayagents/.env atau fallback ke bayoffice/.env
CURRENT_DIR = os.path.dirname(__file__)
ROOT_ENV_PATH = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", ".env"))
if os.path.exists(ROOT_ENV_PATH):
    load_dotenv(ROOT_ENV_PATH)
elif os.path.exists(os.path.join(CURRENT_DIR, "..", ".env")):
    load_dotenv(os.path.join(CURRENT_DIR, "..", ".env"))

from fastapi import FastAPI, Request, Response, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

import service
import scheduler

SECRET_KEY = os.getenv("BAYOFFICE_SECRET_KEY", os.getenv("SECRET_KEY", ""))
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "bay")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
COOKIE_NAME = "bayoffice_session"
SESSION_MAX_AGE = 86400 * 7  # 7 hari

if not SECRET_KEY:
    SECRET_KEY = "bayoffice_fallback_ephemeral_key_" + os.urandom(8).hex()

if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD wajib didefinisikan dalam file .env!")

serializer = URLSafeTimedSerializer(SECRET_KEY)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Siklus hidup aplikasi: Memulai dan menghentikan worker scheduler."""
    await scheduler.start_scheduler_loop()
    yield
    await scheduler.stop_scheduler_loop()

app = FastAPI(title="BayOffice API", version="1.0.0", lifespan=lifespan)

# No-Cache Middleware agar browser dan Cloudflare tidak menahan file JS/CSS lama
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/static") or path in ["/", "/login"]:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Mount folder static frontend
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.api_route("/favicon.ico", methods=["GET", "HEAD"], include_in_schema=False)
async def get_favicon():
    fav_path = os.path.join(FRONTEND_DIR, "favicon.ico")
    if os.path.exists(fav_path) and os.path.getsize(fav_path) > 0:
        return FileResponse(fav_path)
    svg_icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFDE59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>'
    return Response(content=svg_icon, media_type="image/svg+xml")

# ==========================================================
# AUTHENTICATION HELPERS & MIDDLEWARE
# ==========================================================
def get_authenticated_user(request: Request) -> Optional[str]:
    """Memverifikasi cookie session."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        data = serializer.loads(token, max_age=SESSION_MAX_AGE)
        return data.get("user")
    except (BadSignature, SignatureExpired):
        return None

def require_auth(request: Request) -> str:
    """Dependency untuk memproteksi endpoint API."""
    user = get_authenticated_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentikasi diperlukan. Silakan login terlebih dahulu."
        )
    return user

class LoginRequest(BaseModel):
    username: str
    password: str

class TaskCreateRequest(BaseModel):
    instruction: str
    category: Optional[str] = "auto"
    project: Optional[str] = "auto"
    engine: Optional[str] = "agy"
    model: Optional[str] = None

class TaskStatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class ScheduleCreateRequest(BaseModel):
    title: str
    instruction: str
    project: Optional[str] = "bayoffice"
    category: Optional[str] = "auto"
    engine: Optional[str] = "agy"
    model: Optional[str] = None
    schedule_type: str = "cron"  # "cron", "interval", "once"
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    run_at: Optional[str] = None
    enabled: Optional[bool] = True

class ScheduleUpdateRequest(BaseModel):
    title: Optional[str] = None
    instruction: Optional[str] = None
    project: Optional[str] = None
    category: Optional[str] = None
    engine: Optional[str] = None
    model: Optional[str] = None
    schedule_type: Optional[str] = None
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    run_at: Optional[str] = None
    enabled: Optional[bool] = None

class ScheduleToggleRequest(BaseModel):
    enabled: Optional[bool] = None

class PlanGenerateRequest(BaseModel):
    idea: str
    project: Optional[str] = "bayoffice"
    engine: Optional[str] = "agy"
    model: Optional[str] = None

# ==========================================================
# PAGE ROUTES
# ==========================================================
@app.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    """Halaman Dashboard Utama (Terproteksi Login)."""
    user = get_authenticated_user(request)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>BayOffice Frontend Not Found</h1>", status_code=404)

@app.get("/login", response_class=HTMLResponse)
async def serve_login(request: Request):
    """Halaman Login."""
    user = get_authenticated_user(request)
    if user:
        return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
        
    login_path = os.path.join(FRONTEND_DIR, "login.html")
    if os.path.exists(login_path):
        with open(login_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Login Page Not Found</h1>", status_code=404)

# ==========================================================
# AUTH API ENDPOINTS & RATE LIMITING
# ==========================================================
_failed_login_attempts: Dict[str, List[float]] = {}
_login_lock = threading.Lock()
LOGIN_MAX_FAILED_ATTEMPTS = 5
LOGIN_COOLDOWN_WINDOW = 60  # detik

@app.post("/api/auth/login")
async def api_login(data: LoginRequest, request: Request, response: Response):
    """Memproses kredensial login dengan proteksi rate limit brute force dan timing attack."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    with _login_lock:
        attempts = [t for t in _failed_login_attempts.get(client_ip, []) if now - t < LOGIN_COOLDOWN_WINDOW]
        _failed_login_attempts[client_ip] = attempts
        if len(attempts) >= LOGIN_MAX_FAILED_ATTEMPTS:
            remaining = int(LOGIN_COOLDOWN_WINDOW - (now - attempts[0]))
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "message": f"Terlalu banyak percobaan gagal. Silakan coba lagi dalam {remaining} detik."
                }
            )

    valid_user = secrets.compare_digest(data.username, ADMIN_USERNAME)
    valid_pass = secrets.compare_digest(data.password, ADMIN_PASSWORD)

    if valid_user and valid_pass:
        with _login_lock:
            _failed_login_attempts.pop(client_ip, None)
        token = serializer.dumps({"user": data.username})
        is_secure = (
            request.headers.get("x-forwarded-proto") == "https" or
            request.url.scheme == "https"
        )
        response.set_cookie(
            key=COOKIE_NAME,
            value=token,
            max_age=SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=is_secure
        )
        return {"success": True, "message": "Login berhasil"}

    with _login_lock:
        _failed_login_attempts.setdefault(client_ip, []).append(now)

    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"success": False, "message": "Username atau password salah"}
    )

@app.post("/api/auth/logout")
async def api_logout(response: Response):
    """Menghapus session cookie."""
    response.delete_cookie(key=COOKIE_NAME)
    return {"success": True, "message": "Logout berhasil"}

@app.get("/api/auth/me")
async def api_me(request: Request):
    """Mengecek status autentikasi saat ini."""
    user = get_authenticated_user(request)
    if user:
        return {"authenticated": True, "user": user}
    return {"authenticated": False, "user": None}

# ==========================================================
# PROTECTED DATA API ENDPOINTS
# ==========================================================
@app.get("/api/kanban")
async def api_get_kanban(user: str = Depends(require_auth)):
    """Mengambil seluruh data kanban."""
    return service.get_kanban_data()

@app.get("/api/agents")
async def api_get_agents(user: str = Depends(require_auth)):
    """Mengambil status 4 agen AI."""
    return service.get_agents_status()

@app.get("/api/system")
async def api_get_system(user: str = Depends(require_auth)):
    """Mengambil metrik server (RAM, CPU, Tmux)."""
    return service.get_system_metrics()

@app.get("/api/projects")
async def api_get_projects(user: str = Depends(require_auth)):
    """Mengambil daftar proyek terdaftar."""
    return service.get_projects_registry()

@app.get("/api/sync")
async def api_sync(user: str = Depends(require_auth)):
    """Mengambil snapshot penuh (kanban, agents, system, schedules) untuk sinkronisasi manual."""
    return {
        "success": True,
        "kanban": service.get_kanban_data(),
        "agents": service.get_agents_status(),
        "system": service.get_expanded_system_metrics(),
        "schedules": service.get_schedules_summary()
    }

@app.get("/api/agy/models")
async def api_get_agy_models(user: str = Depends(require_auth)):
    """Mengambil daftar model yang didukung Antigravity CLI."""
    return {"models": service.get_agy_models()}

@app.post("/api/tasks")
async def api_create_task(data: TaskCreateRequest, user: str = Depends(require_auth)):
    """Menerbitkan tugas baru ke kanban & tmux atau 9Router."""
    result = service.dispatch_task_from_web(
        instruction=data.instruction,
        category_hint=data.category,
        project_hint=data.project,
        engine=data.engine or "agy",
        model=data.model
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal mengirim tugas"))
    return result

@app.get("/api/system/health")
async def api_get_system_health(user: str = Depends(require_auth)):
    """Mengambil metrik komprehensif (RAM, CPU, Suhu, Swap, Disk, Services)."""
    return service.get_expanded_system_metrics()

@app.get("/api/agents/{agent_name}/logs")
async def api_get_agent_logs(agent_name: str, lines: int = 120, user: str = Depends(require_auth)):
    """Mengambil log riwayat terminal tmux agen."""
    result = service.get_agent_logs(agent_name, lines=lines)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal mengambil log"))
    return result

@app.delete("/api/tasks/{task_id}")
async def api_delete_task(task_id: str, user: str = Depends(require_auth)):
    """Menghapus tugas dari kanban."""
    result = service.delete_task(task_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Gagal menghapus tugas"))
    return result

@app.post("/api/tasks/{task_id}/retry")
async def api_retry_task(task_id: str, user: str = Depends(require_auth)):
    """Menjalankan ulang tugas yang ada ke agen terkait."""
    result = service.retry_task(task_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal me-retry tugas"))
    return result

@app.patch("/api/tasks/{task_id}/status")
async def api_update_task_status(task_id: str, data: TaskStatusUpdateRequest, user: str = Depends(require_auth)):
    """Memperbarui status tugas secara manual."""
    result = service.update_task_status(task_id, data.status, data.notes)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal update status"))
    return result

@app.get("/api/kanban/export")
async def api_export_kanban(format: str = "json", user: str = Depends(require_auth)):
    """Mengunduh data kanban dalam format JSON atau CSV."""
    if format.lower() == "csv":
        csv_data = service.export_kanban_csv()
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="kanban_tasks.csv"'}
        )
    else:
        k_data = service.get_kanban_data()
        return Response(
            content=json.dumps(k_data, indent=2, ensure_ascii=False),
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="kanban_tasks.json"'}
        )

# ==========================================================
# SCHEDULED TASKS (SCHEDULER / CRON) API ENDPOINTS
# ==========================================================
@app.get("/api/schedules")
async def api_get_schedules(project: Optional[str] = None, enabled: Optional[bool] = None, user: str = Depends(require_auth)):
    """Mengambil daftar seluruh task terjadwal beserta ringkasan status."""
    items = service.get_schedules(project=project, enabled=enabled)
    summary = service.get_schedules_summary()
    return {
        "success": True,
        "schedules": items,
        "summary": summary
    }

@app.get("/api/schedules/summary")
async def api_get_schedules_summary(user: str = Depends(require_auth)):
    """Mengambil ringkasan status scheduler dan task terjadwal berikutnya."""
    return {
        "success": True,
        "summary": service.get_schedules_summary()
    }

@app.post("/api/schedules")
async def api_create_schedule(data: ScheduleCreateRequest, user: str = Depends(require_auth)):
    """Mendaftarkan task terjadwal baru."""
    result = service.create_schedule(data.model_dump())
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal membuat task terjadwal"))
    return result

@app.get("/api/schedules/{schedule_id}")
async def api_get_schedule_detail(schedule_id: str, user: str = Depends(require_auth)):
    """Mengambil detail satu task terjadwal."""
    item = service.get_schedule(schedule_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Task terjadwal {schedule_id} tidak ditemukan")
    return {"success": True, "schedule": item}

@app.put("/api/schedules/{schedule_id}")
async def api_update_schedule_put(schedule_id: str, data: ScheduleUpdateRequest, user: str = Depends(require_auth)):
    """Memperbarui task terjadwal."""
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = service.update_schedule(schedule_id, payload)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal memperbarui task terjadwal"))
    return result

@app.patch("/api/schedules/{schedule_id}")
async def api_update_schedule_patch(schedule_id: str, data: ScheduleUpdateRequest, user: str = Depends(require_auth)):
    """Memperbarui sebagian atribut task terjadwal."""
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = service.update_schedule(schedule_id, payload)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal memperbarui task terjadwal"))
    return result

@app.delete("/api/schedules/{schedule_id}")
async def api_delete_schedule(schedule_id: str, user: str = Depends(require_auth)):
    """Menghapus task terjadwal."""
    result = service.delete_schedule(schedule_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Gagal menghapus task terjadwal"))
    return result

@app.post("/api/schedules/{schedule_id}/toggle")
async def api_toggle_schedule(schedule_id: str, data: Optional[ScheduleToggleRequest] = None, user: str = Depends(require_auth)):
    """Mengaktifkan atau menjeda task terjadwal."""
    enabled_val = data.enabled if data else None
    result = service.toggle_schedule(schedule_id, enabled=enabled_val)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal mengubah status aktif task terjadwal"))
    return result

@app.post("/api/schedules/{schedule_id}/run")
async def api_run_schedule_now(schedule_id: str, user: str = Depends(require_auth)):
    """Menjalankan task terjadwal secara manual saat ini juga."""
    result = service.execute_schedule_now(schedule_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal mengeksekusi task terjadwal"))
    return result

# ==========================================================
# IMPLEMENTATION PLANS API (HABIBIE)
# ==========================================================
@app.get("/api/plans")
async def api_get_plans(user: str = Depends(require_auth)):
    """Mengambil daftar seluruh implementation plan."""
    return {"plans": service.get_plans_list()}

@app.get("/api/plans/{plan_id}")
async def api_get_plan_detail(plan_id: str, user: str = Depends(require_auth)):
    """Mengambil satu dokumen implementation plan."""
    item = service.get_plan_detail(plan_id)
    if not item:
        raise HTTPException(status_code=404, detail="Plan tidak ditemukan")
    return item

@app.post("/api/plans/generate")
async def api_generate_plan(data: PlanGenerateRequest, user: str = Depends(require_auth)):
    """Meminta HABIBIE merancang implementation plan baru."""
    result = service.generate_plan_ai(
        idea=data.idea,
        project=data.project or "bayoffice",
        engine=data.engine or "agy",
        model=data.model
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal merancang plan"))
    return result

@app.post("/api/plans/{plan_id}/dispatch")
async def api_dispatch_plan(plan_id: str, user: str = Depends(require_auth)):
    """Mendelegasikan implementation plan ke tim agen di Kanban."""
    result = service.dispatch_plan_to_kanban(plan_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal meneruskan plan ke Kanban"))
    return result

@app.delete("/api/plans/{plan_id}")
async def api_delete_plan(plan_id: str, user: str = Depends(require_auth)):
    """Menghapus dokumen implementation plan."""
    result = service.delete_plan_by_id(plan_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Gagal menghapus plan"))
    return result

# ==========================================================
# SERVER-SENT EVENTS (SSE) STREAM
# ==========================================================
@app.get("/api/stream")
async def api_stream(request: Request):
    """Stream event Server-Sent Events untuk update real-time."""
    user = get_authenticated_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    async def event_generator():
        last_mtime = 0
        last_sched_mtime = 0
        last_tmux_state = None
        ping_counter = 0

        while True:
            if await request.is_disconnected():
                break

            current_k = service.get_kanban_data()
            current_mtime = current_k.get("mtime", 0)
            sys_metrics = service.get_expanded_system_metrics()
            current_tmux = sys_metrics["tmux_active"]

            sched_summary = service.get_schedules_summary()
            current_sched_mtime = sched_summary.get("updated_at", "")

            if current_mtime != last_mtime or current_tmux != last_tmux_state or current_sched_mtime != last_sched_mtime or ping_counter >= 10:
                last_mtime = current_mtime
                last_tmux_state = current_tmux
                last_sched_mtime = current_sched_mtime
                ping_counter = 0

                payload = {
                    "type": "sync",
                    "kanban": current_k,
                    "agents": service.get_agents_status(),
                    "system": sys_metrics,
                    "schedules": sched_summary
                }
                yield f"data: {json.dumps(payload)}\n\n"
            else:
                yield f": heartbeat\n\n"

            ping_counter += 1
            await asyncio.sleep(1.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8888))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app:app", host=host, port=port, reload=False)
