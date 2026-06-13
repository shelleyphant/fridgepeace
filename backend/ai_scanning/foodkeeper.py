from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from .schemas import FoodKeeperMatch, StorageGuidance


@dataclass
class FoodKeeperRecord:
    id: int | None
    category_id: int | None
    category: str | None
    name: str
    subtitle: str | None
    keywords: str | None
    fields: dict


def _row_to_dict(row: list[dict]) -> dict:
    result = {}
    for cell in row:
        result.update(cell)
    return result


def _to_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _normalise(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def _tokens(text: str | None) -> set[str]:
    return {token for token in _normalise(text).split() if len(token) > 1}


def _is_fresh_produce(record: FoodKeeperRecord) -> bool:
    category = _normalise(record.category)
    return "produce" in category and (
        "fresh fruits" in category or "fresh vegetables" in category
    )


def _is_processed_or_beverage(record: FoodKeeperRecord) -> bool:
    category = _normalise(record.category)
    combined = " ".join(
        [
            category,
            _normalise(record.name),
            _normalise(record.subtitle),
            _normalise(record.keywords),
        ]
    )
    processed_terms = {
        "beverages",
        "juice",
        "drink",
        "commercially",
        "packaged",
        "concentrate",
        "shelf stable",
        "canned",
        "dried",
    }
    return any(term in combined for term in processed_terms)


@lru_cache(maxsize=4)
def load_foodkeeper_records(path: str) -> tuple[FoodKeeperRecord, ...]:
    payload = json.loads(Path(path).read_text())
    sheets = {sheet["name"]: sheet["data"] for sheet in payload["sheets"]}

    categories = {}
    for row in sheets.get("Category", []):
        data = _row_to_dict(row)
        category_id = _to_int(data.get("ID"))
        if category_id is not None:
            category = data.get("Category_Name")
            subcategory = data.get("Subcategory_Name")
            categories[category_id] = (
                f"{category} > {subcategory}" if category and subcategory else category
            )

    records = []
    for row in sheets.get("Product", []):
        data = _row_to_dict(row)
        name = data.get("Name")
        if not name:
            continue
        category_id = _to_int(data.get("Category_ID"))
        records.append(
            FoodKeeperRecord(
                id=_to_int(data.get("ID")),
                category_id=category_id,
                category=categories.get(category_id),
                name=str(name),
                subtitle=data.get("Name_subtitle"),
                keywords=data.get("Keywords"),
                fields=data,
            )
        )
    return tuple(records)


def search_foodkeeper(
    food_name: str,
    path: str,
    limit: int = 5,
    prefer_unpackaged_fresh: bool = False,
) -> list[FoodKeeperMatch]:
    query_tokens = _tokens(food_name)
    query_norm = _normalise(food_name)
    if not query_norm:
        return []

    scored = []
    for record in load_foodkeeper_records(path):
        name_norm = _normalise(record.name)
        subtitle_norm = _normalise(record.subtitle)
        keyword_norm = _normalise(record.keywords)
        combined = " ".join([name_norm, subtitle_norm, keyword_norm])
        record_tokens = _tokens(combined)

        score = 0.0
        if query_norm == name_norm:
            score += 1.0
        elif query_norm in name_norm:
            score += 0.85
        elif query_norm in combined:
            score += 0.65

        overlap = len(query_tokens & record_tokens)
        if query_tokens:
            score += 0.35 * (overlap / len(query_tokens))

        if prefer_unpackaged_fresh and score > 0:
            if _is_fresh_produce(record):
                score += 0.45
                if query_norm in subtitle_norm or query_norm in keyword_norm:
                    score += 0.35
            elif _is_processed_or_beverage(record):
                score -= 0.45

        if score > 0:
            scored.append((score, record))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        FoodKeeperMatch(
            id=record.id,
            name=record.name,
            category=record.category,
            subtitle=record.subtitle,
            keywords=record.keywords,
            score=round(score, 3),
        )
        for score, record in scored[:limit]
    ]


def _format_guidance(min_value, max_value, metric, tips=None) -> str | None:
    min_num = _to_int(min_value)
    max_num = _to_int(max_value)
    if min_num is None and max_num is None:
        return tips
    metric_text = str(metric or "days").lower()
    if min_num is not None and max_num is not None:
        guidance = f"{min_num} to {max_num} {metric_text}"
    elif min_num is not None:
        guidance = f"at least {min_num} {metric_text}"
    else:
        guidance = f"up to {max_num} {metric_text}"
    if tips:
        guidance = f"{guidance}. {tips}"
    return guidance


def get_storage_guidance(match: FoodKeeperMatch, path: str) -> StorageGuidance | None:
    records = load_foodkeeper_records(path)
    record = next((item for item in records if item.id == match.id), None)
    if not record:
        return None
    fields = record.fields
    guidance = StorageGuidance(
        pantry=_format_guidance(
            fields.get("DOP_Pantry_Min") or fields.get("Pantry_Min"),
            fields.get("DOP_Pantry_Max") or fields.get("Pantry_Max"),
            fields.get("DOP_Pantry_Metric") or fields.get("Pantry_Metric"),
            fields.get("DOP_Pantry_tips") or fields.get("Pantry_tips"),
        ),
        refrigerate=_format_guidance(
            fields.get("DOP_Refrigerate_Min") or fields.get("Refrigerate_Min"),
            fields.get("DOP_Refrigerate_Max") or fields.get("Refrigerate_Max"),
            fields.get("DOP_Refrigerate_Metric") or fields.get("Refrigerate_Metric"),
            fields.get("DOP_Refrigerate_tips") or fields.get("Refrigerate_tips"),
        ),
        freeze=_format_guidance(
            fields.get("DOP_Freeze_Min") or fields.get("Freeze_Min"),
            fields.get("DOP_Freeze_Max") or fields.get("Freeze_Max"),
            fields.get("DOP_Freeze_Metric") or fields.get("Freeze_Metric"),
            fields.get("DOP_Freeze_Tips") or fields.get("Freeze_Tips"),
        ),
    )
    if not any([guidance.pantry, guidance.refrigerate, guidance.freeze]):
        return None
    return guidance
