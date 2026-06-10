from __future__ import annotations

import asyncio
import base64
import json
from typing import Any

import httpx

from .config import Settings

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiError(RuntimeError):
    pass


def _json_from_text(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.replace("json\n", "", 1).replace("JSON\n", "", 1).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise GeminiError(f"Gemini did not return valid JSON: {exc}") from exc


async def _call_gemini(settings: Settings, image_bytes: bytes, mime_type: str, prompt: str) -> dict[str, Any]:
    if not settings.gemini_api_key:
        raise GeminiError("GEMINI_API_KEY is not configured")

    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    url = f"{GEMINI_BASE_URL}/{settings.gemini_model}:generateContent"
    params = {"key": settings.gemini_api_key}
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "response_mime_type": "application/json",
        },
    }

    last_error: str | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, params=params, json=body)
        except httpx.RequestError as exc:
            last_error = f"Gemini request failed: {exc}"
            if attempt < 2:
                await asyncio.sleep(1 + attempt)
                continue
            raise GeminiError(last_error) from exc

        if response.status_code == 503 and attempt < 2:
            last_error = f"Gemini API error 503: {response.text[:300]}"
            await asyncio.sleep(1 + attempt)
            continue

        if response.status_code >= 400:
            raise GeminiError(f"Gemini API error {response.status_code}: {response.text[:300]}")
        break
    else:
        raise GeminiError(last_error or "Gemini request failed")

    payload = response.json()
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise GeminiError("Gemini response did not include text content") from exc
    return _json_from_text(text)


async def identify_food(settings: Settings, image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    if settings.gemini_mock_mode:
        return {"food_name": "apple", "confidence": 0.82}

    prompt = """
You are helping a food waste app identify unpackaged food from a photo.
Return JSON only with this exact shape:
{
  "food_name": "short common food name suitable for FoodKeeper search",
  "confidence": 0.0
}

Rules:
- Use a simple common name such as "apple", "banana", "spinach", "cooked rice".
- Do not include brand names.
- Do not guess if the image is unclear. Use null and low confidence.
- Confidence must be between 0 and 1.
"""
    return await _call_gemini(settings, image_bytes, mime_type, prompt)


async def identify_packaged_food(settings: Settings, image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    if settings.gemini_mock_mode:
        return {
            "product_name": "milk",
            "brand": "demo dairy",
            "category": "dairy",
            "search_terms": ["milk", "demo dairy milk", "dairy milk"],
            "confidence": 0.82,
        }

    prompt = """
You are helping a food waste app identify a packaged grocery product from a photo.
Return JSON only with this exact shape:
{
  "product_name": "short product name visible on the package",
  "brand": "brand name if visible, otherwise null",
  "category": "simple grocery category if visible or obvious",
  "search_terms": ["short search terms suitable for Open Food Facts or product database lookup"],
  "confidence": 0.0
}

Rules:
- Use only what is visible or reasonably clear from the package.
- Keep product_name short, for example "milk", "Greek yoghurt", "instant noodles", "tuna can".
- Include brand only if visible.
- Do not return expiry dates here. Expiry dates are handled by the expiry-date endpoint.
- Do not guess if the package is unclear. Use null fields and low confidence.
- Confidence must be between 0 and 1.
"""
    return await _call_gemini(settings, image_bytes, mime_type, prompt)


async def extract_expiry_text(settings: Settings, image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    if settings.gemini_mock_mode:
        return {
            "raw_text": "BEST BEFORE 08 JUN 2026",
            "label_type": "best-before",
            "confidence": 0.9,
        }

    prompt = """
You are reading Australian food package date labels.
Return JSON only with this exact shape:
{
  "raw_text": "the visible date wording exactly as read",
  "label_type": "use-by | best-before | packed-on | baked-on | unknown",
  "confidence": 0.0
}

Important:
- Australian dates are day-first.
- Recognise labels such as Use By, Best Before, Baked On, Bkd On, Baked For, Bkd For, Packed On.
- Do not treat batch codes or manufacturer codes as dates.
- Do not invent missing text.
- Preserve the visible text exactly. If the package shows JUL, keep JUL. Do not rewrite month names as numbers.
- If a digit or month is unclear, return raw_text null and confidence below 0.5 instead of guessing.
- If the printed year is two digits, keep those exact two digits in raw_text. Do not infer a different year.
- If several dates or codes are visible, choose only the one clearly attached to Use By or Best Before wording.
- If unclear, return raw_text null, label_type "unknown", confidence below 0.5.
"""
    return await _call_gemini(settings, image_bytes, mime_type, prompt)
