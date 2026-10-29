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
from app import ScheduleCreateRequest, ScheduleUpdateRequest, ScheduleToggleRequest


class TestSchedulerAPIEndpoints(unittest.TestCase):
    """Pengujian Unit untuk Endpoint FastAPI Task Terjadwal."""

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_file.close()
        self.orig_path = scheduler.SCHEDULES_PATH
        scheduler.SCHEDULES_PATH = Path(self.temp_file.name)
        self.test_user = "admin_tester"

    def tearDown(self):
        scheduler.SCHEDULES_PATH = self.orig_path
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

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
                schedule_type="cron",
                cron_expression="0 4 * * *"
            )
            create_res = await app.api_create_schedule(create_req, user=self.test_user)
            self.assertTrue(create_res["success"])
            sched_id = create_res["schedule"]["id"]
            self.assertEqual(sched_id, "SCHED-01")

            # 2. GET /api/schedules
            list_res = await app.api_get_schedules(user=self.test_user)
            self.assertTrue(list_res["success"])
            self.assertEqual(len(list_res["schedules"]), 1)
            self.assertEqual(list_res["summary"]["total"], 1)

            # 3. GET /api/schedules/{id}
            detail_res = await app.api_get_schedule_detail(sched_id, user=self.test_user)
            self.assertTrue(detail_res["success"])
            self.assertEqual(detail_res["schedule"]["title"], "API Test Schedule")

            # 4. PATCH /api/schedules/{id}
            update_req = ScheduleUpdateRequest(title="API Test Schedule Renamed")
            patch_res = await app.api_update_schedule_patch(sched_id, update_req, user=self.test_user)
            self.assertTrue(patch_res["success"])
            self.assertEqual(patch_res["schedule"]["title"], "API Test Schedule Renamed")

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

        asyncio.run(run_flow())


if __name__ == "__main__":
    unittest.main()
