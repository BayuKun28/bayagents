import unittest
import os
import sys
import tempfile
import json
from pathlib import Path
from datetime import datetime, timedelta

# Pastikan module backend dapat di-import
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import scheduler


class TestSchedulerCron(unittest.TestCase):
    """Pengujian Unit untuk Cron Engine dan Perhitungan Jadwal."""

    def test_cron_presets(self):
        now = datetime(2026, 10, 29, 14, 30, tzinfo=datetime.now().astimezone().tzinfo)
        # @hourly -> 0 * * * *
        next_hourly = scheduler.calculate_next_cron_run("@hourly", now)
        self.assertEqual(next_hourly.hour, 15)
        self.assertEqual(next_hourly.minute, 0)

        # @daily -> 0 0 * * *
        next_daily = scheduler.calculate_next_cron_run("@daily", now)
        self.assertEqual(next_daily.day, 30)
        self.assertEqual(next_daily.hour, 0)
        self.assertEqual(next_daily.minute, 0)

    def test_cron_step_matching(self):
        # */15 * * * * dari 14:10 -> harus 14:15
        now = datetime(2026, 10, 29, 14, 10, tzinfo=datetime.now().astimezone().tzinfo)
        next_step = scheduler.calculate_next_cron_run("*/15 * * * *", now)
        self.assertEqual(next_step.minute, 15)

        # */15 dari 14:15 -> harus 14:30
        next_step2 = scheduler.calculate_next_cron_run("*/15 * * * *", next_step)
        self.assertEqual(next_step2.minute, 30)

    def test_cron_weekday_matching(self):
        # 0 9 * * 1 (Setiap Senin 09:00)
        # 2026-10-29 adalah Kamis -> Senin berikutnya adalah 2026-11-02
        now = datetime(2026, 10, 29, 14, 0, tzinfo=datetime.now().astimezone().tzinfo)
        next_mon = scheduler.calculate_next_cron_run("0 9 * * 1", now)
        self.assertEqual(next_mon.year, 2026)
        self.assertEqual(next_mon.month, 11)
        self.assertEqual(next_mon.day, 2)
        self.assertEqual(next_mon.hour, 9)
        self.assertEqual(next_mon.minute, 0)

    def test_cron_validation(self):
        valid, _ = scheduler.validate_cron_expression("0 2 * * *")
        self.assertTrue(valid)

        invalid_len, err = scheduler.validate_cron_expression("0 2 * *")
        self.assertFalse(invalid_len)

        invalid_char, err = scheduler.validate_cron_expression("0 2 * * abc")
        self.assertFalse(invalid_char)

    def test_interval_and_once_calculation(self):
        now = datetime.now().astimezone()
        # Interval 30 menit
        next_int = scheduler.calculate_next_run("interval", interval_minutes=30, from_dt=now)
        self.assertIsNotNone(next_int)
        dt_int = datetime.fromisoformat(next_int)
        self.assertAlmostEqual((dt_int - now).total_seconds(), 1800, delta=2)

        # Once di masa depan
        future_iso = (now + timedelta(hours=2)).isoformat()
        next_once = scheduler.calculate_next_run("once", run_at=future_iso, from_dt=now)
        self.assertEqual(next_once, future_iso)

        # Once di masa lalu -> harus None
        past_iso = (now - timedelta(hours=2)).isoformat()
        next_past = scheduler.calculate_next_run("once", run_at=past_iso, from_dt=now)
        self.assertIsNone(next_past)


class TestSchedulerCRUD(unittest.TestCase):
    """Pengujian Unit untuk Operasi CRUD Data Task Terjadwal."""

    def setUp(self):
        # Gunakan file temporary untuk isolasi pengujian
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.temp_file.close()
        self.orig_path = scheduler.SCHEDULES_PATH
        scheduler.SCHEDULES_PATH = Path(self.temp_file.name)

    def tearDown(self):
        scheduler.SCHEDULES_PATH = self.orig_path
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_create_and_get_schedule(self):
        payload = {
            "title": "Daily Backup",
            "instruction": "Backup database infobay dan bayoffice",
            "project": "bayoffice",
            "category": "ops",
            "schedule_type": "cron",
            "cron_expression": "0 3 * * *"
        }
        res = scheduler.create_schedule(payload)
        self.assertTrue(res["success"])
        sched_id = res["schedule"]["id"]
        self.assertEqual(sched_id, "SCHED-01")
        self.assertEqual(res["schedule"]["title"], "Daily Backup")
        self.assertIsNotNone(res["schedule"]["next_run_at"])

        # Fetch detail
        fetched = scheduler.get_schedule(sched_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["id"], sched_id)

    def test_update_and_toggle_schedule(self):
        payload = {
            "title": "Healthcheck",
            "instruction": "Cek server status",
            "project": "infobay",
            "category": "backend",
            "schedule_type": "interval",
            "interval_minutes": 15
        }
        res = scheduler.create_schedule(payload)
        sched_id = res["schedule"]["id"]

        # Update title & interval
        up_res = scheduler.update_schedule(sched_id, {
            "title": "Healthcheck Updated",
            "interval_minutes": 30
        })
        self.assertTrue(up_res["success"])
        self.assertEqual(up_res["schedule"]["title"], "Healthcheck Updated")
        self.assertEqual(up_res["schedule"]["interval_minutes"], 30)

        # Toggle to paused
        tog_res = scheduler.toggle_schedule(sched_id)
        self.assertFalse(tog_res["schedule"]["enabled"])
        self.assertIsNone(tog_res["schedule"]["next_run_at"])

        # Toggle back to enabled
        tog_res2 = scheduler.toggle_schedule(sched_id)
        self.assertTrue(tog_res2["schedule"]["enabled"])
        self.assertIsNotNone(tog_res2["schedule"]["next_run_at"])

    def test_delete_schedule(self):
        payload = {
            "title": "Temp Task",
            "instruction": "Hapus setelah uji coba",
            "schedule_type": "cron",
            "cron_expression": "*/5 * * * *"
        }
        res = scheduler.create_schedule(payload)
        sched_id = res["schedule"]["id"]

        del_res = scheduler.delete_schedule(sched_id)
        self.assertTrue(del_res["success"])

        # Pastikan sudah tidak ada
        self.assertIsNone(scheduler.get_schedule(sched_id))

    def test_manual_execute_mock(self):
        payload = {
            "title": "Test Manual Run",
            "instruction": "Uji eksekusi langsung",
            "schedule_type": "interval",
            "interval_minutes": 60
        }
        res = scheduler.create_schedule(payload)
        sched_id = res["schedule"]["id"]

        # Mock dispatch function
        def mock_dispatch(instruction, category_hint, project_hint, engine):
            return {
                "success": True,
                "task_id": "TASK-OPS-99",
                "message": "Berhasil mengeksekusi mock"
            }

        exec_res = scheduler.execute_schedule_now(sched_id, dispatch_fn=mock_dispatch)
        self.assertTrue(exec_res["success"])
        self.assertEqual(exec_res["task_id"], "TASK-OPS-99")

        # Cek pembaruan metadata di storage
        sched = scheduler.get_schedule(sched_id)
        self.assertEqual(sched["run_count"], 1)
        self.assertEqual(sched["last_status"], "success")
        self.assertEqual(sched["last_task_id"], "TASK-OPS-99")
        self.assertIsNotNone(sched["last_run_at"])


if __name__ == "__main__":
    unittest.main()
