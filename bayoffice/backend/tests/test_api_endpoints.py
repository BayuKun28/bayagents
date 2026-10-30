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


if __name__ == "__main__":
    unittest.main()
