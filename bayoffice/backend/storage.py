"""
BayAgents - Atomic Storage Engine
Menyediakan operasi I/O file JSON yang aman, konkurensi terkontrol,
serta tahan terhadap interupsi proses (Atomic Write via POSIX rename & file locking).
"""

import os
import json
import fcntl
import time
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Optional, Dict, Union


_DEFAULT_SENTINEL = object()


def atomic_read_json(file_path: Union[str, Path], default: Any = _DEFAULT_SENTINEL) -> Any:
    """
    Membaca file JSON secara aman dengan shared lock (fcntl.LOCK_SH).
    Mengembalikan `default` jika file tidak ditemukan atau terjadi kesalahan parsing.
    """
    path = Path(file_path)

    try:
        with open(path, "r", encoding="utf-8") as f:
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                data = json.load(f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            return data
    except (FileNotFoundError, OSError):
        return default if default is not _DEFAULT_SENTINEL else {}
    except Exception:
        # Fallback jika file sedang dalam transisi atau corrupt
        return default if default is not _DEFAULT_SENTINEL else {}


def atomic_write_json(file_path: Union[str, Path], data: Any, indent: int = 2) -> bool:
    """
    Menulis file JSON secara atomik:
    1. Tulis data ke file temporer unik per proses & thread di direktori yang sama (.tmp.<pid>.<tid>.<time>).
    2. Kunci eksklusif (fcntl.LOCK_EX).
    3. Flush dan fsync ke disk hardware.
    4. Ganti file target secara atomik menggunakan os.replace().
    """
    path = Path(file_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = path.with_name(f"{path.name}.tmp.{os.getpid()}.{threading.get_ident()}.{time.time_ns()}")

    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            json.dump(data, f, indent=indent, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)

        os.replace(temp_file, path)
        return True
    except Exception as e:
        if temp_file.exists():
            try:
                temp_file.unlink()
            except Exception:
                pass
        raise e


@contextmanager
def locked_json_transaction(file_path: Union[str, Path], default: Any = _DEFAULT_SENTINEL):
    """
    Konteks manajer transaksi read-modify-write (RMW) terisolasi.
    Menggunakan file kunci (.lock) dengan eksklusif lock (fcntl.LOCK_EX)
    untuk mencegah race condition saat mutasi data simultan antar-proses atau thread.
    """
    path = Path(file_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = path.with_suffix(f"{path.suffix}.lock")

    with open(lock_file, "a+", encoding="utf-8") as lf:
        fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
        try:
            data = atomic_read_json(path, default=default)
            yield data
            atomic_write_json(path, data)
        finally:
            try:
                fcntl.flock(lf.fileno(), fcntl.LOCK_UN)
            except Exception:
                pass

