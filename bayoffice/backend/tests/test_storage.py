import os
import sys
import json
import tempfile
import unittest
import threading
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from storage import atomic_read_json, atomic_write_json, locked_json_transaction


class TestAtomicStorage(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()
        self.file_path = Path(self.test_dir.name) / "test_data.json"

    def tearDown(self):
        self.test_dir.cleanup()

    def test_read_non_existent_file(self):
        result = atomic_read_json(self.file_path, default={"tasks": []})
        self.assertEqual(result, {"tasks": []})

    def test_write_and_read_json(self):
        data = {
            "tasks": [
                {"id": "TASK-01", "title": "Test Task", "status": "To-Do"}
            ]
        }
        success = atomic_write_json(self.file_path, data)
        self.assertTrue(success)
        self.assertTrue(self.file_path.exists())

        loaded = atomic_read_json(self.file_path)
        self.assertEqual(loaded, data)

    def test_atomic_overwrite_preserves_valid_state(self):
        data_v1 = {"version": 1, "items": ["a", "b"]}
        atomic_write_json(self.file_path, data_v1)

        data_v2 = {"version": 2, "items": ["a", "b", "c"]}
        atomic_write_json(self.file_path, data_v2)

        loaded = atomic_read_json(self.file_path)
        self.assertEqual(loaded["version"], 2)
        self.assertEqual(len(loaded["items"]), 3)

    def test_concurrent_writes_and_reads(self):
        iterations = 20
        errors = []

        def writer(worker_id):
            try:
                for i in range(iterations):
                    data = {"worker": worker_id, "iteration": i, "data": list(range(50))}
                    atomic_write_json(self.file_path, data)
            except Exception as e:
                errors.append(e)

        def reader():
            try:
                for _ in range(iterations):
                    res = atomic_read_json(self.file_path, default=None)
                    if res is not None:
                        self.assertIn("worker", res)
                        self.assertIn("iteration", res)
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=writer, args=(1,)),
            threading.Thread(target=writer, args=(2,)),
            threading.Thread(target=reader),
            threading.Thread(target=reader)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent errors occurred: {errors}")

    def test_locked_json_transaction_prevents_lost_updates(self):
        """Menguji bahwa locked_json_transaction mencegah race condition / lost updates pada operasi simultan."""
        initial = {"counter": 0}
        atomic_write_json(self.file_path, initial)

        num_threads = 4
        increments_per_thread = 25
        errors = []

        def worker():
            try:
                for _ in range(increments_per_thread):
                    with locked_json_transaction(self.file_path, default={"counter": 0}) as data:
                        current = data.get("counter", 0)
                        data["counter"] = current + 1
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Errors occurred during transaction: {errors}")
        final_data = atomic_read_json(self.file_path)
        self.assertEqual(final_data.get("counter"), num_threads * increments_per_thread)


if __name__ == "__main__":
    unittest.main()
