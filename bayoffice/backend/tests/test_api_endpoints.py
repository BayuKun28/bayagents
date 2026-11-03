import unittest
import sys
import tempfile
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app
import scheduler
import service
from app import ScheduleCreateRequest, ScheduleUpdateRequest, ScheduleToggleRequest


class TestSchedulerAPIEndpoints(unittest.TestCase):
    """Pengujian Unit untuk Endpoint FastAPI Task Terjadwal."""

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_file.close()
        self.orig_path = scheduler.SCHEDULES_PATH
        scheduler.SCHEDULES_PATH = Path(self.temp_file.name)
        
        # Isolasi KANBAN_PATH agar test tidak mencemari data/kanban.json nyata
        self.orig_kanban_path = service.KANBAN_PATH
        self.temp_kanban = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_kanban.write(b'{"tasks": []}')
        self.temp_kanban.close()
        service.KANBAN_PATH = self.temp_kanban.name
        
        self.test_user = "admin_tester"

    def tearDown(self):
        scheduler.SCHEDULES_PATH = self.orig_path
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)
        service.KANBAN_PATH = self.orig_kanban_path
        if os.path.exists(self.temp_kanban.name):
            os.unlink(self.temp_kanban.name)

    async def _run_async(self, coro):
        return await coro

    def test_api_crud_flow(self):
        import asyncio

        async def run_flow():
            # 1. POST /api/schedules
            create_req = ScheduleCreateRequest(
                title="API Test Schedule",
                instruction="Jalankan audit keamanan rutin",
                project="bayoffice",
                category="ops",
                engine="agy",
                model="claude-sonnet-4-6",
                schedule_type="cron",
                cron_expression="0 4 * * *"
            )
            create_res = await app.api_create_schedule(create_req, user=self.test_user)
            self.assertTrue(create_res["success"])
            sched_id = create_res["schedule"]["id"]
            self.assertEqual(sched_id, "SCHED-01")
            self.assertEqual(create_res["schedule"].get("model"), "claude-sonnet-4-6")

            # 2. GET /api/schedules
            list_res = await app.api_get_schedules(user=self.test_user)
            self.assertTrue(list_res["success"])
            self.assertEqual(len(list_res["schedules"]), 1)
            self.assertEqual(list_res["summary"]["total"], 1)

            # 3. GET /api/schedules/{id}
            detail_res = await app.api_get_schedule_detail(sched_id, user=self.test_user)
            self.assertTrue(detail_res["success"])
            self.assertEqual(detail_res["schedule"]["title"], "API Test Schedule")
            self.assertEqual(detail_res["schedule"].get("model"), "claude-sonnet-4-6")

            # 4. PATCH /api/schedules/{id}
            update_req = ScheduleUpdateRequest(title="API Test Schedule Renamed", model="gemini-3.8-flash-high")
            patch_res = await app.api_update_schedule_patch(sched_id, update_req, user=self.test_user)
            self.assertTrue(patch_res["success"])
            self.assertEqual(patch_res["schedule"]["title"], "API Test Schedule Renamed")
            self.assertEqual(patch_res["schedule"].get("model"), "gemini-3.8-flash-high")

            # 5. POST /api/schedules/{id}/toggle
            toggle_req = ScheduleToggleRequest(enabled=False)
            tog_res = await app.api_toggle_schedule(sched_id, toggle_req, user=self.test_user)
            self.assertTrue(tog_res["success"])
            self.assertFalse(tog_res["schedule"]["enabled"])

            # 6. DELETE /api/schedules/{id}
            del_res = await app.api_delete_schedule(sched_id, user=self.test_user)
            self.assertTrue(del_res["success"])

            # 7. Check empty list
            list_after = await app.api_get_schedules(user=self.test_user)
            self.assertEqual(len(list_after["schedules"]), 0)

            # 8. GET /api/sync
            sync_res = await app.api_sync(user=self.test_user)
            self.assertTrue(sync_res["success"])
            self.assertIn("kanban", sync_res)
            self.assertIn("agents", sync_res)
            self.assertIn("system", sync_res)
            self.assertIn("schedules", sync_res)

        asyncio.run(run_flow())

    def test_plan_generate_dynamic_project_registration(self):
        import asyncio
        from unittest.mock import patch
        import service

        temp_proj_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        temp_proj_file.close()

        orig_proj_path = service.PROJECTS_PATH
        service.PROJECTS_PATH = Path(temp_proj_file.name)

        try:
            # Initialize empty projects registry
            from storage import atomic_write_json, atomic_read_json
            atomic_write_json(service.PROJECTS_PATH, {"projects": {"infobay": {"name": "Infobay"}}})

            # Mock AI generation so we don't call real external API in unit test
            with patch("plans_manager.generate_plan_ai") as mock_ai:
                mock_ai.return_value = {
                    "success": True,
                    "id": "PLAN-99",
                    "title": "New Custom Architecture",
                    "project": "custom-analytics-app",
                    "status": "Draft",
                    "file_path": "/tmp/dummy.md"
                }

                plan_req = app.PlanGenerateRequest(
                    idea="Build analytics streaming dashboard",
                    project="custom-analytics-app",
                    engine="9router"
                )

                async def run_plan():
                    return await app.api_generate_plan(plan_req, user=self.test_user)

                res = asyncio.run(run_plan())
                self.assertTrue(res["success"])
                self.assertEqual(res["project"], "custom-analytics-app")

                # Verify that 'custom-analytics-app' was registered in projects.json
                reg = atomic_read_json(service.PROJECTS_PATH)
                self.assertIn("custom-analytics-app", reg.get("projects", {}))
                self.assertEqual(reg["projects"]["custom-analytics-app"]["id"], "custom-analytics-app")
        finally:
            service.PROJECTS_PATH = orig_proj_path
            if os.path.exists(temp_proj_file.name):
                os.unlink(temp_proj_file.name)

    def test_agy_models_and_plan_model_selection(self):
        import asyncio
        from unittest.mock import patch

        async def run_test():
            # 1. GET /api/agy/models
            models_res = await app.api_get_agy_models(user=self.test_user)
            self.assertIn("models", models_res)
            self.assertTrue(len(models_res["models"]) >= 4)
            model_ids = [m["id"] for m in models_res["models"]]
            self.assertIn("gemini-3.8-flash-high", model_ids)
            self.assertIn("claude-sonnet-4-6", model_ids)

            # 2. POST /api/plans/generate with AGY engine and custom model
            with patch("plans_manager.generate_plan_ai") as mock_plan:
                mock_plan.return_value = {
                    "success": True,
                    "id": "PLAN-20261030-05",
                    "title": "Sonnet Architecture Blueprint",
                    "project": "bayoffice",
                    "engine": "agy",
                    "model": "claude-sonnet-4-6",
                    "status": "Draft"
                }

                plan_req = app.PlanGenerateRequest(
                    idea="Refactor authentication session storage",
                    project="bayoffice",
                    engine="agy",
                    model="claude-sonnet-4-6"
                )

                res = await app.api_generate_plan(plan_req, user=self.test_user)
                self.assertTrue(res["success"])
                mock_plan.assert_called_once_with(
                    idea="Refactor authentication session storage",
                    project="bayoffice",
                    engine="agy",
                    model="claude-sonnet-4-6"
                )

            # 3. POST /api/plans/generate with background=True
            with patch("plans_manager.start_background_plan_generation") as mock_bg:
                mock_bg.return_value = {
                    "success": True,
                    "status": "drafting",
                    "message": "HABIBIE sedang merancang Implementation Plan di latar belakang...",
                    "project": "bayoffice",
                    "idea": "Async Test"
                }
                async_req = app.PlanGenerateRequest(
                    idea="Async Test",
                    project="bayoffice",
                    engine="agy",
                    background=True
                )
                bg_res = await app.api_generate_plan(async_req, user=self.test_user)
                self.assertTrue(bg_res["success"])
                self.assertEqual(bg_res["status"], "drafting")

            # 4. GET /api/plans/status & POST /api/plans/clear-status
            status_res = await app.api_get_plan_status(user=self.test_user)
            self.assertIn("status", status_res)
            clear_res = await app.api_clear_plan_status(user=self.test_user)
            self.assertTrue(clear_res["success"])

        asyncio.run(run_test())

    def test_login_rate_limiting_and_auth(self):
        import asyncio
        from unittest.mock import MagicMock
        from fastapi import Response

        async def run_auth_test():
            # Mock request with client ip
            mock_req = MagicMock()
            mock_req.client.host = "192.168.100.99"
            mock_req.headers = {"x-forwarded-proto": "https"}
            mock_resp = Response()

            # 1. Login dengan password salah 5 kali
            bad_creds = app.LoginRequest(username="bay", password="wrong_password_test")
            for _ in range(5):
                res = await app.api_login(bad_creds, request=mock_req, response=mock_resp)
                self.assertEqual(res.status_code, 401)

            # 2. Percobaan ke-6 harus kena rate limit 429
            rate_limit_res = await app.api_login(bad_creds, request=mock_req, response=mock_resp)
            self.assertEqual(rate_limit_res.status_code, 429)

            # 3. IP lain tidak terpengaruh
            other_req = MagicMock()
            other_req.client.host = "192.168.100.88"
            other_req.headers = {"x-forwarded-proto": "https"}
            other_res = await app.api_login(bad_creds, request=other_req, response=mock_resp)
            self.assertEqual(other_res.status_code, 401)

            # 4. Login sukses dengan password benar
            good_creds = app.LoginRequest(username=app.ADMIN_USERNAME, password=app.ADMIN_PASSWORD)
            success_res = await app.api_login(good_creds, request=other_req, response=mock_resp)
            self.assertTrue(success_res.get("success"))

        asyncio.run(run_auth_test())

    def test_general_schedule_and_habibie_standalone_dispatch(self):
        import asyncio
        from unittest.mock import patch

        async def run_sched_test():
            # 1. Test Schedule Creation with project='none' and category='reminder'
            create_req = ScheduleCreateRequest(
                title="Reminder Cuaca Harian",
                instruction="Cek cuaca Karanganyar dan kabari Telegram",
                project="none",
                category="reminder",
                engine="agy",
                model="gemini-3.8-flash-high",
                schedule_type="cron",
                cron_expression="0 7 * * *"
            )
            create_res = await app.api_create_schedule(create_req, user=self.test_user)
            self.assertTrue(create_res["success"])
            self.assertEqual(create_res["schedule"]["project"], "none")
            self.assertEqual(create_res["schedule"]["category"], "reminder")

            # 2. Test Dispatch Task routing to HABIBIE Standalone (Reminder)
            with patch("subprocess.Popen") as mock_popen, patch("threading.Thread") as mock_thread:
                task_res = service.dispatch_task_from_web(
                    instruction="cek cuaca karanganyar hari ini dan kirim ke telegram",
                    category_hint="reminder",
                    project_hint="none",
                    engine="agy",
                    model="gemini-3.8-flash-high"
                )
                self.assertTrue(task_res["success"])
                self.assertIn("HABIBIE", task_res["target_agent"])
                self.assertEqual(task_res["category"], "Reminder")
                self.assertEqual(task_res["project"], "general")
                self.assertTrue(task_res["task_id"].startswith("TASK-REM-"))

                # 3. Test Dispatch Task routing to HABIBIE Standalone (Universal / General)
                task_gen_res = service.dispatch_task_from_web(
                    instruction="cek suhu cpu dan load server sekarang",
                    category_hint="general",
                    project_hint="none",
                    engine="agy"
                )
                self.assertTrue(task_gen_res["success"])
                self.assertIn("HABIBIE", task_gen_res["target_agent"])
                self.assertEqual(task_gen_res["category"], "Universal")
                self.assertEqual(task_gen_res["project"], "general")
                self.assertTrue(task_gen_res["task_id"].startswith("TASK-GEN-"))

        asyncio.run(run_sched_test())

    def test_agent_states_and_location_schema(self):
        """Memverifikasi schema location dan bubble text kontekstual pada 5 agen."""
        from unittest.mock import patch
        with patch("service.get_system_metrics") as mock_metrics:
            mock_metrics.return_value = {"tmux_active": True, "load_avg": [0.1, 0.1, 0.1]}
            agents = service.get_agents_status()
            
            self.assertEqual(len(agents), 5)
            for name in ["LUHUT", "HABIBIE", "JOKOWI", "PRABOWO", "GIBRAN"]:
                self.assertIn(name, agents)
                ag = agents[name]
                self.assertIn("location", ag)
                self.assertIn("room_id", ag["location"])
                self.assertIn("sub_area", ag["location"])
                self.assertIn("slot_id", ag["location"])
                self.assertIn("is_seated", ag["location"])
                self.assertIn("slot_id", ag)
                self.assertIn("bubble_text", ag)
                self.assertIn("desk", ag)

            # Verifikasi penghapusan bubble kantin hardcode pada workstation
            self.assertIn("Backend Bay siap", agents["JOKOWI"]["bubble_text"])
            self.assertEqual(agents["JOKOWI"]["location"]["room_id"], "engineering_bay")
            self.assertIn("QA Terminal siap", agents["GIBRAN"]["bubble_text"])
            self.assertEqual(agents["GIBRAN"]["location"]["room_id"], "engineering_bay")
            self.assertIn("Executive Suite", agents["LUHUT"]["bubble_text"])
            self.assertEqual(agents["LUHUT"]["location"]["room_id"], "executive_suite")

            # Verifikasi dynamic resolver saat break & transit
            loc_break, bubble_break = service.resolve_agent_bubble_and_location("JOKOWI", "break")
            self.assertIn(loc_break["room_id"], ["cafeteria", "game_room"])
            self.assertTrue(
                "kopi" in bubble_break or "biliar" in bubble_break,
                f"Bubble break '{bubble_break}' harus relevan dengan destinasi santai"
            )

            loc_transit, bubble_transit = service.resolve_agent_bubble_and_location("JOKOWI", "walking_to_break")
            self.assertEqual(loc_transit["room_id"], "hallway")
            self.assertFalse(loc_transit["is_seated"])
            self.assertIn("Menuju Kantin", bubble_transit)

            loc_return, bubble_return = service.resolve_agent_bubble_and_location("JOKOWI", "walking_to_desk")
            self.assertEqual(loc_return["room_id"], "hallway")
            self.assertIn("Kembali ke meja", bubble_return)

    def test_api_v1_agents_endpoint(self):
        """Memverifikasi endpoint /api/v1/agents dan /api/agents mengembalikan data agen tersinkron."""
        import asyncio
        async def run_test():
            res = await app.api_get_agents(user=self.test_user)
            self.assertIn("JOKOWI", res)
            self.assertIn("location", res["JOKOWI"])
            self.assertIn("slot_id", res["JOKOWI"]["location"])
            self.assertEqual(res["JOKOWI"]["location"]["slot_id"], 2)
            self.assertIn("bubble_text", res["JOKOWI"])
            self.assertIn("PRABOWO", res)
            self.assertEqual(res["PRABOWO"]["location"]["slot_id"], 3)
            self.assertIn("GIBRAN", res)
            self.assertEqual(res["GIBRAN"]["location"]["slot_id"], 4)
            self.assertIn("LUHUT", res)
            self.assertEqual(res["LUHUT"]["location"]["slot_id"], 1)
            self.assertIn("HABIBIE", res)
            self.assertEqual(res["HABIBIE"]["location"]["slot_id"], 5)
        asyncio.run(run_test())

    def test_dynamic_avatar_slots_and_anti_collision(self):
        """Memverifikasi PLAN-20261101-05: Alokasi slot_id diskrit dan sub_area tidur terdistribusi tanpa tumpang tindih."""
        from unittest.mock import patch
        with patch("service.get_system_metrics") as mock_metrics:
            # Kondisi tmux mati (mode hemat daya / sleeping untuk 4 tmux agents, standalone untuk HABIBIE)
            mock_metrics.return_value = {"tmux_active": False, "load_avg": [0.05, 0.05, 0.05]}
            agents = service.get_agents_status()

            # Pastikan slot_id dan sub_area unik antar seluruh agen
            slots = [ag["location"]["slot_id"] for ag in agents.values()]
            sub_areas = [ag["location"]["sub_area"] for ag in agents.values()]

            self.assertEqual(len(set(slots)), 5, "Setiap agen wajib memiliki slot_id unik (1-5)")
            self.assertEqual(len(set(sub_areas)), 5, "Setiap agen wajib memiliki sub_area terdistribusi (zero clipping)")

            # Verifikasi pemetaan 4 agen tmux saat sleeping sesuai PLAN-20261101-05
            self.assertEqual(agents["LUHUT"]["location"]["slot_id"], 1)
            self.assertEqual(agents["LUHUT"]["location"]["sub_area"], "lounge_sofa_west")
            self.assertIn("Sofa Barat", agents["LUHUT"]["bubble_text"])

            self.assertEqual(agents["JOKOWI"]["location"]["slot_id"], 2)
            self.assertEqual(agents["JOKOWI"]["location"]["sub_area"], "lounge_sofa_east")
            self.assertIn("Sofa Timur", agents["JOKOWI"]["bubble_text"])

            self.assertEqual(agents["PRABOWO"]["location"]["slot_id"], 3)
            self.assertEqual(agents["PRABOWO"]["location"]["sub_area"], "beanbag_orange")
            self.assertIn("Beanbag Oranye", agents["PRABOWO"]["bubble_text"])

            self.assertEqual(agents["GIBRAN"]["location"]["slot_id"], 4)
            self.assertEqual(agents["GIBRAN"]["location"]["sub_area"], "beanbag_teal")
            self.assertIn("Beanbag Toska", agents["GIBRAN"]["bubble_text"])

            # Verifikasi HABIBIE standalone & resolver sleeping di studio_recliner
            self.assertEqual(agents["HABIBIE"]["location"]["slot_id"], 5)
            self.assertEqual(agents["HABIBIE"]["location"]["room_id"], "architect_studio")

            loc_h, bubble_h = service.resolve_agent_bubble_and_location("HABIBIE", "sleeping")
            self.assertEqual(loc_h["slot_id"], 5)
            self.assertEqual(loc_h["sub_area"], "studio_recliner")
            self.assertEqual(loc_h["room_id"], "architect_studio")
            self.assertIn("Studio Recliner", bubble_h)

    def test_habibie_drafting_sync_and_hibernation_roam_targets(self):
        """Memverifikasi PLAN-20261102-01 (TASK-FS-06): Sinkronisasi drafting 3D HABIBIE & target peregangan hibernasi."""
        from unittest.mock import patch
        import plans_manager

        # 1. Verifikasi konfigurasi hibernation_roam_targets pada ke-5 agen
        for name in ["LUHUT", "HABIBIE", "JOKOWI", "PRABOWO", "GIBRAN"]:
            cfg = service.AGENT_CONFIGS[name]
            self.assertIn("hibernation_roam_targets", cfg)
            targets = cfg["hibernation_roam_targets"]
            self.assertGreaterEqual(len(targets), 2, f"{name} minimal memiliki 2 target peregangan hibernasi")
            for t in targets:
                self.assertIn("room_id", t)
                self.assertIn("sub_area", t)
                self.assertIn("bubble", t)
                self.assertIn(t["room_id"], ["cafeteria", "game_room", "architect_studio"])

        # 2. Verifikasi state resolver saat hibernasi roaming
        loc_roam, bubble_roam = service.resolve_agent_bubble_and_location("HABIBIE", "hibernation_roam")
        self.assertIn(loc_roam["room_id"], ["cafeteria", "game_room", "architect_studio"])
        self.assertFalse(loc_roam["is_seated"])
        self.assertTrue(len(bubble_roam) > 0)

        # 3. Verifikasi HABIBIE drafting sync saat ada background job generating
        mock_job = {
            "is_generating": True,
            "status": "generating",
            "idea": "Optimasi Query Cache Redis",
            "project": "infobay",
            "started_at": "2026-11-02T09:00:00"
        }
        with patch("plans_manager.get_plan_generation_status", return_value=mock_job), \
             patch("service.get_system_metrics", return_value={"tmux_active": False, "load_avg": [0.1, 0.1, 0.1]}):
            agents = service.get_agents_status()
            habibie = agents["HABIBIE"]

            # HABIBIE harus dipaksa berstatus 'working' di architect_studio.drafting_desk
            self.assertEqual(habibie["state"], "working")
            self.assertEqual(habibie["location"]["room_id"], "architect_studio")
            self.assertEqual(habibie["location"]["sub_area"], "drafting_desk")
            self.assertTrue(habibie["location"]["is_seated"])
            self.assertIn("Merancang blueprint", habibie["bubble_text"])
            self.assertIn("Optimasi Query Cache Redis", habibie["bubble_text"])
            self.assertIsNotNone(habibie["current_task"])
            self.assertEqual(habibie["current_task"]["id"], "DRAFTING-PLAN")

            # Verifikasi agen lain tetap sleeping saat tmux mati dan memiliki payload hibernation roam
            self.assertEqual(agents["LUHUT"]["state"], "sleeping")
            self.assertIn("hibernation_roam_targets", agents["LUHUT"])
            self.assertIn("current_hibernation_target", agents["LUHUT"])
            self.assertIn("hibernation_roam_targets", agents["JOKOWI"])
            self.assertIn("current_hibernation_target", agents["JOKOWI"])

    def test_plan_revision_endpoint_and_sequential_estafet_dispatch(self):
        """Memverifikasi fitur interaktif revisi draft plan Habibie dan pipa estafet sekuensial (BE -> FE)."""
        import plans_manager
        import asyncio
        from unittest.mock import patch

        # 1. Verifikasi parse_plan_components
        sample_plan_md = (
            "# Implementation Plan: Sistem Notifikasi Realtime\n\n"
            "## 1. 🎯 Tujuan & Scope Fitur\nProblem & solusi notifikasi.\n\n"
            "## 2. 🗄️ Tugas Backend (JOKOWI)\n- Migrasi tabel notifications\n- API endpoint POST /api/v1/notify\n\n"
            "## 3. 🎨 Tugas Frontend (PRABOWO)\n- Komponen NotificationBell.jsx\n- Toast notification popups\n\n"
            "## 4. 🛡️ Checklist QA & Verifikasi (GIBRAN)\n- PHPUnit passing dan test build\n"
        )
        parsed = plans_manager.parse_plan_components(sample_plan_md)
        self.assertTrue(parsed["is_fullstack"])
        self.assertTrue(parsed["has_be"])
        self.assertTrue(parsed["has_fe"])
        self.assertIn("Migrasi tabel notifications", parsed["be_section"])
        self.assertIn("NotificationBell.jsx", parsed["fe_section"])

        # 2. Verifikasi API Endpoint POST /api/plans/{plan_id}/revise
        with patch("plans_manager.revise_plan_ai") as mock_revise:
            mock_revise.return_value = {
                "success": True,
                "id": "PLAN-20261103-01",
                "title": "Sistem Notifikasi Realtime (Revised)",
                "status": "Draft",
                "content": sample_plan_md
            }
            revise_req = app.PlanReviseRequest(
                feedback="Tolong gunakan SQLite memory untuk pengujian dan tambahkan icon lonceng Neubrutalism",
                engine="agy",
                model="gemini-3.8-flash-high"
            )
            res = asyncio.run(app.api_revise_plan("PLAN-20261103-01", revise_req, user=self.test_user))
            self.assertTrue(res["success"])
            self.assertEqual(res["id"], "PLAN-20261103-01")
            mock_revise.assert_called_once_with(
                plan_id="PLAN-20261103-01",
                feedback="Tolong gunakan SQLite memory untuk pengujian dan tambahkan icon lonceng Neubrutalism",
                engine="agy",
                model="gemini-3.8-flash-high"
            )

        # 3. Verifikasi Pipa Estafet Sekuensial di dispatch_plan_to_kanban
        mock_plan_data = {
            "id": "PLAN-TEST-SEQ",
            "title": "Fitur Otomatisasi Estafet",
            "filename": "PLAN-TEST-SEQ.md",
            "project": "infobay",
            "content": sample_plan_md,
            "engine": "agy",
            "model": "gemini-3.8-flash-high"
        }
        with patch("plans_manager.get_plan", return_value=mock_plan_data), \
             patch("plans_manager.save_plan") as mock_save, \
             patch("subprocess.run") as mock_subproc, \
             patch("subprocess.Popen") as mock_popen:

            # Mock tmux has-session returncode 0
            mock_subproc.return_value.returncode = 0

            dispatch_res = service.dispatch_plan_to_kanban("PLAN-TEST-SEQ")
            self.assertTrue(dispatch_res["success"])
            self.assertTrue(dispatch_res.get("is_sequential", False))
            self.assertEqual(len(dispatch_res["tasks"]), 2)
            be_task_id, fe_task_id = dispatch_res["tasks"]
            self.assertTrue(be_task_id.startswith("TASK-BE-"))
            self.assertTrue(fe_task_id.startswith("TASK-FE-"))

            # Verifikasi task tersimpan di kanban dengan relasi depends_on dan next_task
            k_tasks = service.get_kanban_data().get("tasks", [])
            be_task = next((t for t in k_tasks if t.get("id") == be_task_id), None)
            fe_task = next((t for t in k_tasks if t.get("id") == fe_task_id), None)

            self.assertIsNotNone(be_task)
            self.assertEqual(be_task["assignee"], "JOKOWI")
            self.assertEqual(be_task["status"], "In-Progress")
            self.assertEqual(be_task["next_task"], fe_task_id)

            self.assertIsNotNone(fe_task)
            self.assertEqual(fe_task["assignee"], "PRABOWO")
            self.assertEqual(fe_task["status"], "To-Do")
            self.assertEqual(fe_task["depends_on"], be_task_id)


if __name__ == "__main__":
    unittest.main()
