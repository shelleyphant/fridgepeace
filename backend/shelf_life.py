from datetime import date, timedelta
from typing import Optional

CATEGORY_SHELF_LIFE: dict[str, dict[str, Optional[tuple[int, int]]]] = {
    "dairy":            {"fridge": (5, 14),   "freezer": (30, 90),   "pantry": None},
    "eggs":             {"fridge": (14, 30),  "freezer": None,       "pantry": None},
    "meat":             {"fridge": (2, 5),    "freezer": (90, 365),  "pantry": None},
    "poultry":          {"fridge": (1, 3),    "freezer": (180, 365), "pantry": None},
    "fish":             {"fridge": (1, 2),    "freezer": (90, 180),  "pantry": None},
    "vegetables":       {"fridge": (3, 7),    "freezer": (180, 365), "pantry": (3, 7)},
    "fruits":           {"fridge": (5, 14),   "freezer": (180, 365), "pantry": (3, 7)},
    "beverages":        {"fridge": (30, 365), "freezer": None,       "pantry": (30, 365)},
    "snacks":           {"fridge": None,      "freezer": None,       "pantry": (60, 365)},
    "grains":           {"fridge": None,      "freezer": (365, 730), "pantry": (180, 365)},
    "canned":           {"fridge": None,      "freezer": None,       "pantry": (365, 730)},
    "sauces":           {"fridge": (30, 90),  "freezer": (90, 180),  "pantry": (180, 365)},
    "bakery":           {"fridge": (3, 7),    "freezer": (60, 90),   "pantry": (2, 5)},
    "frozen":           {"fridge": None,      "freezer": (30, 365),  "pantry": None},
    "herbs_spices":     {"fridge": None,      "freezer": None,       "pantry": (365, 730)},
    "default":          {"fridge": (5, 7),    "freezer": (90, 180),  "pantry": (30, 90)},
}


def _match_category(category: str | None) -> str:
    if not category:
        return "default"
    cat_lower = category.lower()
    for key in CATEGORY_SHELF_LIFE:
        if key == "default":
            continue
        if key in cat_lower or cat_lower in key:
            return key
    return "default"


def get_shelf_life_for_category(category: str | None, storage: str) -> tuple[int, int] | None:
    matched_key = _match_category(category)
    cat = CATEGORY_SHELF_LIFE.get(matched_key)
    if cat is None:
        return None
    return cat.get(storage)


def compute_recommended_expiry(storage_days_range: tuple[int, int] | None) -> str | None:
    if storage_days_range is None:
        return None
    _min_days, max_days = storage_days_range
    if max_days is None:
        return None
    recommended = date.today() + timedelta(days=max_days)
    return recommended.isoformat()


def get_storage_recommendations(
    foodkeeper_data: dict | None = None,
    packaged_category: str | None = None,
) -> dict[str, tuple[int, int] | None]:
    if foodkeeper_data:
        return {
            "fridge": (
                foodkeeper_data.get("fridge_days_min"),
                foodkeeper_data.get("fridge_days_max"),
            ),
            "freezer": (
                foodkeeper_data.get("freezer_days_min"),
                foodkeeper_data.get("freezer_days_max"),
            ),
            "pantry": (
                foodkeeper_data.get("pantry_days_min"),
                foodkeeper_data.get("pantry_days_max"),
            ),
        }
    return {
        "fridge": get_shelf_life_for_category(packaged_category, "fridge"),
        "freezer": get_shelf_life_for_category(packaged_category, "freezer"),
        "pantry": get_shelf_life_for_category(packaged_category, "pantry"),
    }
