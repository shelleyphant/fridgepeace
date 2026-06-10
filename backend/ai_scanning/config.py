from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    gemini_mock_mode: bool = os.getenv("GEMINI_MOCK_MODE", "true").lower() == "true"
    foodkeeper_json_path: str = os.getenv(
        "FOODKEEPER_JSON_PATH",
        "../client/source/food-data/foodkeeper.json",
    )
    max_upload_bytes: int = 5 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
