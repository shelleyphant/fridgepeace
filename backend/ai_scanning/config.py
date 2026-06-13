from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]

# Load the backend-local env file explicitly so Gemini settings still apply when
# the app is started from the repo root instead of the backend directory.
for env_path in (BACKEND_DIR / ".env", REPO_ROOT / ".env"):
    if env_path.exists():
        load_dotenv(env_path, override=False)

DEFAULT_FOODKEEPER_PATH = REPO_ROOT / "client" / "source" / "food-data" / "foodkeeper.json"
DEFAULT_GEMINI_API_KEY = "AIzaSyBQGAOHyHF6aaGUpwS36-Z0WZVUQ3idXkw"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_GEMINI_MOCK_MODE = False


def _resolve_foodkeeper_path(raw_path: str | None) -> str | None:
    if not raw_path:
        return str(DEFAULT_FOODKEEPER_PATH) if DEFAULT_FOODKEEPER_PATH.exists() else None

    candidate = Path(raw_path)
    if candidate.is_absolute():
        return str(candidate)

    backend_relative = (BACKEND_DIR / candidate).resolve()
    if backend_relative.exists():
        return str(backend_relative)

    repo_relative = (REPO_ROOT / candidate).resolve()
    if repo_relative.exists():
        return str(repo_relative)

    return str(backend_relative)


class Settings:
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or DEFAULT_GEMINI_API_KEY
    gemini_model: str = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    gemini_mock_mode: bool = os.getenv(
        "GEMINI_MOCK_MODE", str(DEFAULT_GEMINI_MOCK_MODE).lower()
    ).lower() == "true"
    foodkeeper_json_path: str | None = _resolve_foodkeeper_path(os.getenv("FOODKEEPER_JSON_PATH"))
    max_upload_bytes: int = 5 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
