from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DEFAULT_FOODKEEPER_PATH = Path(__file__).resolve().parents[2] / "client" / "source" / "food-data" / "foodkeeper.json"


class Settings:
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    gemini_mock_mode: bool = os.getenv("GEMINI_MOCK_MODE", "true").lower() == "true"
    foodkeeper_json_path: str | None = os.getenv("FOODKEEPER_JSON_PATH") or (
        str(DEFAULT_FOODKEEPER_PATH) if DEFAULT_FOODKEEPER_PATH.exists() else None
    )
    max_upload_bytes: int = 5 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
