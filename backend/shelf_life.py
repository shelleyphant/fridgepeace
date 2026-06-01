from datetime import date, timedelta
from statistics import median
from typing import Optional

from sqlalchemy.orm import Session

from models import FoodKeeperProduct, FoodKeeperCategory

# ─── Context & Storage Location Mapping ────────────────────

CONTEXT_STORAGE_FIELD_MAP = {
    ("dop", "fridge"): ("fridge_days_min", "fridge_days_max",
                        "dop_fridge_metric", "dop_fridge_tips"),
    ("dop", "freezer"): ("freezer_days_min", "freezer_days_max",
                         "dop_freeze_metric", "dop_freeze_tips"),
    ("dop", "pantry"): ("pantry_days_min", "pantry_days_max",
                        None, None),
    ("after_open", "fridge"): ("fridge_after_open_min", "fridge_after_open_max",
                                "fridge_after_open_metric", None),
    ("after_open", "pantry"): ("pantry_after_open_min", "pantry_after_open_max",
                                "pantry_after_open_metric", None),
    ("after_open", "freezer"): (None, None, None, None),
    ("after_thaw", "fridge"): ("fridge_after_thaw_min", "fridge_after_thaw_max",
                                "fridge_after_thaw_metric", None),
    ("after_thaw", "freezer"): (None, None, None, None),
    ("after_thaw", "pantry"): (None, None, None, None),
}

STORAGE_LOCATIONS = ["fridge", "freezer", "pantry"]
CONTEXTS = ["dop", "after_open", "after_thaw"]

# ─── Final Fallback (only when DB has no data at all) ──────

FALLBACK_SHELF_LIFE: dict[str, tuple[int, int]] = {
    "fridge": (5, 7),
    "freezer": (90, 180),
    "pantry": (30, 90),
}

# ─── Data Classes ──────────────────────────────────────────

class ShelfLifeResult:
    def __init__(
        self,
        min_days: Optional[int] = None,
        max_days: Optional[int] = None,
        tips: Optional[str] = None,
        source: str = "fallback",
    ):
        self.min_days = min_days
        self.max_days = max_days
        self.tips = tips
        self.source = source

    def to_dict(self):
        return {
            "min_days": self.min_days,
            "max_days": self.max_days,
            "tips": self.tips,
            "source": self.source,
        }

    def is_valid(self) -> bool:
        return self.min_days is not None and self.max_days is not None


# ─── Core Engine ───────────────────────────────────────────

def _median_or_none(values: list) -> Optional[int]:
    if not values:
        return None
    try:
        return int(round(median(values)))
    except (ValueError, TypeError, IndexError):
        return None


def get_product_shelf_life(
    db: Session,
    product_id: int,
    context: str = "dop",
    storage: str = "fridge",
) -> ShelfLifeResult:
    """Level 1: Exact product match from FoodKeeperProduct."""
    field_min, field_max, _metric_field, tips_field = CONTEXT_STORAGE_FIELD_MAP.get(
        (context, storage), (None, None, None, None)
    )
    if field_min is None or field_max is None:
        return ShelfLifeResult(source="unsupported")

    product = db.query(FoodKeeperProduct).filter(
        FoodKeeperProduct.id == product_id
    ).first()

    if product is None:
        return ShelfLifeResult(source="no_product")

    min_val = getattr(product, field_min, None)
    max_val = getattr(product, field_max, None)
    tips_val = getattr(product, tips_field, None) if tips_field else None

    if min_val is not None or max_val is not None:
        return ShelfLifeResult(
            min_days=min_val,
            max_days=max_val or min_val,
            tips=tips_val,
            source="exact_product",
        )

    return ShelfLifeResult(source="no_data")


def get_category_shelf_life(
    db: Session,
    category_id: int,
    context: str = "dop",
    storage: str = "fridge",
) -> ShelfLifeResult:
    """Level 2: Category-level aggregation (median of all products in category)."""
    field_min, field_max, _metric_field, tips_field = CONTEXT_STORAGE_FIELD_MAP.get(
        (context, storage), (None, None, None, None)
    )
    if field_min is None or field_max is None:
        return ShelfLifeResult(source="unsupported")

    products = db.query(FoodKeeperProduct).filter(
        FoodKeeperProduct.category_id == category_id,
    ).all()

    if not products:
        return ShelfLifeResult(source="no_category_products")

    mins = []
    maxs = []
    for p in products:
        mn = getattr(p, field_min, None)
        mx = getattr(p, field_max, None)
        if mn is not None:
            mins.append(mn)
        if mx is not None:
            maxs.append(mx)

    if not mins and not maxs:
        return ShelfLifeResult(source="no_category_data")

    return ShelfLifeResult(
        min_days=_median_or_none(mins) if mins else None,
        max_days=_median_or_none(maxs) if maxs else None,
        source="category_avg",
    )


def get_subcategory_shelf_life(
    db: Session,
    subcategory_name: str,
    context: str = "dop",
    storage: str = "fridge",
) -> ShelfLifeResult:
    """Level 3: Subcategory-level aggregation."""
    cats = db.query(FoodKeeperCategory).filter(
        FoodKeeperCategory.subcategory_name == subcategory_name
    ).all()
    if not cats:
        return ShelfLifeResult(source="no_subcategory")

    cat_ids = [c.id for c in cats]
    field_min, field_max, _metric_field, tips_field = CONTEXT_STORAGE_FIELD_MAP.get(
        (context, storage), (None, None, None, None)
    )
    if field_min is None or field_max is None:
        return ShelfLifeResult(source="unsupported")

    products = db.query(FoodKeeperProduct).filter(
        FoodKeeperProduct.category_id.in_(cat_ids),
    ).all()

    if not products:
        return ShelfLifeResult(source="no_subcategory_products")

    mins = []
    maxs = []
    for p in products:
        mn = getattr(p, field_min, None)
        mx = getattr(p, field_max, None)
        if mn is not None:
            mins.append(mn)
        if mx is not None:
            maxs.append(mx)

    if not mins and not maxs:
        return ShelfLifeResult(source="no_subcategory_data")

    return ShelfLifeResult(
        min_days=_median_or_none(mins) if mins else None,
        max_days=_median_or_none(maxs) if maxs else None,
        source="subcategory_avg",
    )


def get_category_name_shelf_life(
    db: Session,
    category_name: str,
    context: str = "dop",
    storage: str = "fridge",
) -> ShelfLifeResult:
    """Level 4: Category name-level aggregation (e.g. 'Meat', 'Produce')."""
    cats = db.query(FoodKeeperCategory).filter(
        FoodKeeperCategory.category_name == category_name
    ).all()
    if not cats:
        return ShelfLifeResult(source="no_category_name")

    cat_ids = [c.id for c in cats]
    field_min, field_max, _metric_field, tips_field = CONTEXT_STORAGE_FIELD_MAP.get(
        (context, storage), (None, None, None, None)
    )
    if field_min is None or field_max is None:
        return ShelfLifeResult(source="unsupported")

    products = db.query(FoodKeeperProduct).filter(
        FoodKeeperProduct.category_id.in_(cat_ids),
    ).all()

    if not products:
        return ShelfLifeResult(source="no_category_name_products")

    mins = []
    maxs = []
    for p in products:
        mn = getattr(p, field_min, None)
        mx = getattr(p, field_max, None)
        if mn is not None:
            mins.append(mn)
        if mx is not None:
            maxs.append(mx)

    if not mins and not maxs:
        return ShelfLifeResult(source="no_category_name_data")

    return ShelfLifeResult(
        min_days=_median_or_none(mins) if mins else None,
        max_days=_median_or_none(maxs) if maxs else None,
        source="category_name_avg",
    )


# ─── Public API ────────────────────────────────────────────

def compute_shelf_life(
    db: Session,
    product_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory_name: Optional[str] = None,
    category_name: Optional[str] = None,
    context: str = "dop",
    storage: str = "fridge",
) -> ShelfLifeResult:
    """5-level fallback shelf life computation.

    Levels:
      1. Exact product match
      2. Category-level aggregation (by category_id)
      3. Subcategory-level aggregation
      4. Category name-level aggregation
      5. Hardcoded fallback
    """
    if product_id is not None:
        result = get_product_shelf_life(db, product_id, context, storage)
        if result.is_valid():
            return result
        if result.source == "unsupported":
            return result

    if category_id is not None:
        result = get_category_shelf_life(db, category_id, context, storage)
        if result.is_valid():
            return result

    if subcategory_name is not None:
        result = get_subcategory_shelf_life(db, subcategory_name, context, storage)
        if result.is_valid():
            return result

    if category_name is not None:
        result = get_category_name_shelf_life(db, category_name, context, storage)
        if result.is_valid():
            return result

    fb = FALLBACK_SHELF_LIFE.get(storage)
    if fb:
        return ShelfLifeResult(min_days=fb[0], max_days=fb[1], source="fallback")

    return ShelfLifeResult(source="no_fallback")


def compute_all_storage_recommendations(
    db: Session,
    product_id: Optional[int] = None,
    category_id: Optional[int] = None,
    subcategory_name: Optional[str] = None,
    category_name: Optional[str] = None,
    context: str = "dop",
) -> dict[str, Optional[ShelfLifeResult]]:
    """Compute shelf life for all 3 storage locations at once."""
    result = {}
    for storage in STORAGE_LOCATIONS:
        result[storage] = compute_shelf_life(
            db=db,
            product_id=product_id,
            category_id=category_id,
            subcategory_name=subcategory_name,
            category_name=category_name,
            context=context,
            storage=storage,
        )
    return result


def compute_recommended_expiry(storage_days_range: tuple[int, int] | None) -> str | None:
    """Backward-compatible function: compute expiry date from (min, max) range."""
    if storage_days_range is None:
        return None
    _min_days, max_days = storage_days_range
    if max_days is None:
        return None
    recommended = date.today() + timedelta(days=max_days)
    return recommended.isoformat()


def get_shelf_life_for_category(category: str | None, storage: str) -> tuple[int, int] | None:
    """Backward-compatible function for old hardcoded category lookup.
    Returns (min, max) tuple or None.
    """
    if not category:
        return None
    matched_key = _match_category(category)
    cat = CATEGORY_SHELF_LIFE.get(matched_key)
    if cat is None:
        return None
    return cat.get(storage)


def get_storage_recommendations(
    db: Optional[Session] = None,
    foodkeeper_data: dict | None = None,
    packaged_category: str | None = None,
    context: str = "dop",
) -> dict[str, Optional[dict]]:
    """New unified API that returns shelf life data for all storage locations.

    Returns dict like:
    {
        "fridge": {"min_days": 5, "max_days": 14, "tips": "...", "source": "exact_product"},
        "freezer": {...},
        "pantry": {...},
    }
    """
    result = {}

    if foodkeeper_data and db:
        # DB-backed lookup
        product_id = foodkeeper_data.get("product_id")
        category_id = foodkeeper_data.get("category_id")
        subcategory = foodkeeper_data.get("subcategory_name")
        cat_name = foodkeeper_data.get("category_name")

        for storage in STORAGE_LOCATIONS:
            sr = compute_shelf_life(
                db=db,
                product_id=product_id,
                category_id=category_id,
                subcategory_name=subcategory,
                category_name=cat_name,
                context=context,
                storage=storage,
            )
            result[storage] = sr.to_dict() if sr.is_valid() else None
    elif foodkeeper_data:
        # Legacy: use raw FoodKeeper data dict with dop_* fields
        result = {
            "fridge": {
                "min_days": foodkeeper_data.get("fridge_days_min"),
                "max_days": foodkeeper_data.get("fridge_days_max"),
                "tips": foodkeeper_data.get("dop_fridge_tips"),
                "source": "foodkeeper_data",
            },
            "freezer": {
                "min_days": foodkeeper_data.get("freezer_days_min"),
                "max_days": foodkeeper_data.get("freezer_days_max"),
                "tips": foodkeeper_data.get("dop_freeze_tips"),
                "source": "foodkeeper_data",
            },
            "pantry": {
                "min_days": foodkeeper_data.get("pantry_days_min"),
                "max_days": foodkeeper_data.get("pantry_days_max"),
                "tips": None,
                "source": "foodkeeper_data",
            },
        }
    elif packaged_category and db:
        # Look up packaged category in FoodKeeper
        cat_name = _map_packaged_category_to_foodkeeper(packaged_category)
        cat_record = None
        if cat_name:
            cat_record = db.query(FoodKeeperCategory).filter(
                FoodKeeperCategory.category_name == cat_name
            ).first()

        for storage in STORAGE_LOCATIONS:
            sr = compute_shelf_life(
                db=db,
                category_id=cat_record.id if cat_record else None,
                category_name=cat_name,
                context=context,
                storage=storage,
            )
            result[storage] = sr.to_dict() if sr.is_valid() else None
    else:
        # Pure legacy fallback via hardcoded categories
        for storage in STORAGE_LOCATIONS:
            range_val = get_shelf_life_for_category(packaged_category, storage)
            if range_val:
                result[storage] = {
                    "min_days": range_val[0],
                    "max_days": range_val[1],
                    "tips": None,
                    "source": "hardcoded",
                }
            else:
                result[storage] = None

    return result


# ─── Legacy Hardcoded Mapping (kept for backward compat) ───

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


def _map_packaged_category_to_foodkeeper(category: str) -> Optional[str]:
    """Map a packaged food category string to a FoodKeeper category name."""
    mapping = {
        "dairy": "Dairy Products & Eggs",
        "eggs": "Dairy Products & Eggs",
        "meat": "Meat",
        "poultry": "Poultry",
        "fish": "Seafood",
        "seafood": "Seafood",
        "vegetables": "Produce",
        "fruits": "Produce",
        "produce": "Produce",
        "grains": "Grains, Beans & Pasta",
        "pasta": "Grains, Beans & Pasta",
        "beans": "Grains, Beans & Pasta",
        "snacks": "Shelf Stable Foods",
        "beverages": "Beverages",
        "canned": "Condiments, Sauces & Canned Goods",
        "sauces": "Condiments, Sauces & Canned Goods",
        "condiments": "Condiments, Sauces & Canned Goods",
        "bakery": "Baked Goods",
        "bread": "Baked Goods",
        "frozen": "Food Purchased Frozen",
        "baby": "Baby Food",
        "herbs": "Produce",
        "spices": "Shelf Stable Foods",
        "deli": "Deli & Prepared Foods",
        "vegetarian": "Vegetarian Proteins",
        "tofu": "Vegetarian Proteins",
    }
    if not category:
        return None
    cat_lower = category.lower().strip()
    for key, fk_name in mapping.items():
        if key in cat_lower or cat_lower in key:
            return fk_name
    return None
