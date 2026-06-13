from __future__ import annotations

import os
import sqlite3
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DEFAULT_FOODKEEPER_PATH = Path(__file__).resolve().parents[2] / "client" / "source" / "food-data" / "foodkeeper.json"

API_KEY_DB_PATH = Path(__file__).resolve().parent.parent / "API_KEY.db"


def _get_gemini_api_key() -> str | None:
    try:
        conn = sqlite3.connect(str(API_KEY_DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT api_key FROM api_keys WHERE service = ?", ("gemini",))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


class Settings:
    gemini_api_key: str | None = _get_gemini_api_key()
    gemini_model: str = "gemini-2.5-flash"
    gemini_mock_mode: bool = False
    foodkeeper_json_path: str | None = os.getenv("FOODKEEPER_JSON_PATH") or (
        str(DEFAULT_FOODKEEPER_PATH) if DEFAULT_FOODKEEPER_PATH.exists() else None
    )
    max_upload_bytes: int = 5 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
