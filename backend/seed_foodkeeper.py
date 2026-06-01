import json
import os

from models import (
    SessionLocal,
    FoodKeeperCategory,
    FoodKeeperProduct,
    FoodKeeperCookingTip,
    FoodKeeperCookingMethod,
)


FOODKEEPER_PATH = os.path.join(os.path.dirname(__file__), "foodkeeper.json")


def _parse_int(val):
    if val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _parse_float(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _clean_str(val):
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() == "none":
        return None
    return s


def _convert_metric(value, metric):
    """Convert Weeks/Months to days. Returns raw value if metric is Days or None."""
    if value is None or metric is None:
        return value
    m = str(metric).strip().lower()
    if m in ("days", "day"):
        return int(value)
    elif m in ("weeks", "week"):
        return int(value) * 7
    elif m in ("months", "month"):
        return int(value) * 30
    elif m in ("years", "year"):
        return int(value) * 365
    return int(value)


def seed_foodkeeper():
    if not os.path.exists(FOODKEEPER_PATH):
        print("[seed] foodkeeper.json not found, skipping seed")
        return

    db = SessionLocal()
    try:
        existing = db.query(FoodKeeperProduct).first()
        if existing is not None:
            print("[seed] FoodKeeper data already seeded, skipping")
            return

        with open(FOODKEEPER_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        # --- Parse Category sheet ---
        category_map = {}
        for sheet in data["sheets"]:
            if sheet["name"] == "Category":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    cat_id = _parse_int(obj.get("ID") or obj.get("Category_ID"))
                    cat_name = _clean_str(obj.get("Category_Name"))
                    subcat_name = _clean_str(obj.get("Subcategory_Name"))
                    if cat_id is not None and cat_name:
                        category_map[cat_id] = (cat_name, subcat_name)

        ext_cat_to_db_map = {}
        for cid, (cname, subname) in category_map.items():
            cat = FoodKeeperCategory(
                external_id=cid,
                category_name=cname,
                subcategory_name=subname,
            )
            db.add(cat)
            db.flush()
            ext_cat_to_db_map[cid] = cat.id

        print(f"[seed] Imported {len(category_map)} categories")

        # --- Parse Product sheet ---
        product_count = 0
        ext_id_to_db_id = {}
        for sheet in data["sheets"]:
            if sheet["name"] == "Product":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    prod_id = _parse_int(obj.get("ID"))
                    if prod_id is None:
                        continue

                    cat_ext_id = _parse_int(obj.get("Category_ID"))
                    db_cat_id = ext_cat_to_db_map.get(cat_ext_id) if cat_ext_id is not None else None

                    product = FoodKeeperProduct(
                        external_id=prod_id,
                        category_id=db_cat_id,
                        name=str(obj.get("Name", "")),
                        name_subtitle=_clean_str(obj.get("Name_subtitle")),
                        keywords=_clean_str(obj.get("Keywords")),
                        # DOP fields (already used)
                        fridge_days_min=_convert_metric(
                            _parse_int(obj.get("DOP_Refrigerate_Min")),
                            _clean_str(obj.get("DOP_Refrigerate_Metric")),
                        ),
                        fridge_days_max=_convert_metric(
                            _parse_int(obj.get("DOP_Refrigerate_Max")),
                            _clean_str(obj.get("DOP_Refrigerate_Metric")),
                        ),
                        freezer_days_min=_convert_metric(
                            _parse_int(obj.get("DOP_Freeze_Min")),
                            _clean_str(obj.get("DOP_Freeze_Metric")),
                        ),
                        freezer_days_max=_convert_metric(
                            _parse_int(obj.get("DOP_Freeze_Max")),
                            _clean_str(obj.get("DOP_Freeze_Metric")),
                        ),
                        pantry_days_min=_convert_metric(
                            _parse_int(obj.get("Pantry_Min")),
                            _clean_str(obj.get("Pantry_Metric")),
                        ),
                        pantry_days_max=_convert_metric(
                            _parse_int(obj.get("Pantry_Max")),
                            _clean_str(obj.get("Pantry_Metric")),
                        ),
                        # Basic fridge
                        fridge_min=_convert_metric(
                            _parse_int(obj.get("Refrigerate_Min")),
                            _clean_str(obj.get("Refrigerate_Metric")),
                        ),
                        fridge_max=_convert_metric(
                            _parse_int(obj.get("Refrigerate_Max")),
                            _clean_str(obj.get("Refrigerate_Metric")),
                        ),
                        fridge_metric=_clean_str(obj.get("Refrigerate_Metric")),
                        fridge_tips=_clean_str(obj.get("Refrigerate_tips")),
                        # Basic freeze
                        freeze_min=_convert_metric(
                            _parse_int(obj.get("Freeze_Min")),
                            _clean_str(obj.get("Freeze_Metric")),
                        ),
                        freeze_max=_convert_metric(
                            _parse_int(obj.get("Freeze_Max")),
                            _clean_str(obj.get("Freeze_Metric")),
                        ),
                        freeze_metric=_clean_str(obj.get("Freeze_Metric")),
                        freeze_tips=_clean_str(obj.get("Freeze_Tips")),
                        # After opening - fridge
                        fridge_after_open_min=_convert_metric(
                            _parse_int(obj.get("Refrigerate_After_Opening_Min")),
                            _clean_str(obj.get("Refrigerate_After_Opening_Metric")),
                        ),
                        fridge_after_open_max=_convert_metric(
                            _parse_int(obj.get("Refrigerate_After_Opening_Max")),
                            _clean_str(obj.get("Refrigerate_After_Opening_Metric")),
                        ),
                        fridge_after_open_metric=_clean_str(obj.get("Refrigerate_After_Opening_Metric")),
                        # After opening - pantry
                        pantry_after_open_min=_convert_metric(
                            _parse_int(obj.get("Pantry_After_Opening_Min")),
                            _clean_str(obj.get("Pantry_After_Opening_Metric")),
                        ),
                        pantry_after_open_max=_convert_metric(
                            _parse_int(obj.get("Pantry_After_Opening_Max")),
                            _clean_str(obj.get("Pantry_After_Opening_Metric")),
                        ),
                        pantry_after_open_metric=_clean_str(obj.get("Pantry_After_Opening_Metric")),
                        # After thawing
                        fridge_after_thaw_min=_convert_metric(
                            _parse_int(obj.get("Refrigerate_After_Thawing_Min")),
                            _clean_str(obj.get("Refrigerate_After_Thawing_Metric")),
                        ),
                        fridge_after_thaw_max=_convert_metric(
                            _parse_int(obj.get("Refrigerate_After_Thawing_Max")),
                            _clean_str(obj.get("Refrigerate_After_Thawing_Metric")),
                        ),
                        fridge_after_thaw_metric=_clean_str(obj.get("Refrigerate_After_Thawing_Metric")),
                        # DOP supplementary
                        dop_fridge_metric=_clean_str(obj.get("DOP_Refrigerate_Metric")),
                        dop_fridge_tips=_clean_str(obj.get("DOP_Refrigerate_tips")),
                        dop_pantry_min=_convert_metric(
                            _parse_int(obj.get("DOP_Pantry_Min")),
                            _clean_str(obj.get("DOP_Pantry_Metric")),
                        ),
                        dop_pantry_max=_convert_metric(
                            _parse_int(obj.get("DOP_Pantry_Max")),
                            _clean_str(obj.get("DOP_Pantry_Metric")),
                        ),
                        dop_pantry_metric=_clean_str(obj.get("DOP_Pantry_Metric")),
                        dop_pantry_tips=_clean_str(obj.get("DOP_Pantry_tips")),
                        dop_freeze_metric=_clean_str(obj.get("DOP_Freeze_Metric")),
                        dop_freeze_tips=_clean_str(obj.get("DOP_Freeze_Tips")),
                    )
                    db.add(product)
                    db.flush()
                    ext_id_to_db_id[prod_id] = product.id
                    product_count += 1

        print(f"[seed] Imported {product_count} products")

        # --- Parse CookingTips sheet ---
        tip_count = 0
        for sheet in data["sheets"]:
            if sheet["name"] == "CookingTips":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    prod_ext_id = _parse_int(obj.get("Product_ID"))
                    if prod_ext_id is None:
                        continue
                    db_prod_id = ext_id_to_db_id.get(prod_ext_id)
                    if db_prod_id is None:
                        continue
                    tip = FoodKeeperCookingTip(
                        product_id=db_prod_id,
                        tips=_clean_str(obj.get("Tips")),
                        safe_min_temp=_clean_str(obj.get("Safe_Minimum_Temperature")),
                        rest_time=_parse_int(obj.get("Rest_Time")),
                        rest_time_metric=_clean_str(obj.get("Rest_Time_metric")),
                    )
                    db.add(tip)
                    tip_count += 1

        print(f"[seed] Imported {tip_count} cooking tips")

        # --- Parse CookingMethods sheet ---
        method_count = 0
        for sheet in data["sheets"]:
            if sheet["name"] == "CookingMethods":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    prod_ext_id = _parse_int(obj.get("Product_ID"))
                    if prod_ext_id is None:
                        continue
                    db_prod_id = ext_id_to_db_id.get(prod_ext_id)
                    if db_prod_id is None:
                        continue
                    method = FoodKeeperCookingMethod(
                        product_id=db_prod_id,
                        method=_clean_str(obj.get("Cooking_Method")),
                        temperature=_clean_str(obj.get("Cooking_Temperature")),
                        timing_from=_parse_int(obj.get("Timing_from")),
                        timing_to=_parse_int(obj.get("Timing_to")),
                        timing_metric=_clean_str(obj.get("Timing_metric")),
                    )
                    db.add(method)
                    method_count += 1

        print(f"[seed] Imported {method_count} cooking methods")

        db.commit()
        print(f"[seed] Seeded {product_count} products, {tip_count} cooking tips, "
              f"{method_count} cooking methods, {len(category_map)} categories")

    except Exception as e:
        db.rollback()
        print(f"[seed] Error seeding FoodKeeper data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_foodkeeper()
