import json
import os

from models import SessionLocal, FoodKeeperCategory, FoodKeeperProduct


FOODKEEPER_PATH = os.path.join(os.path.dirname(__file__), "foodkeeper.json")


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

        category_map = {}
        for sheet in data["sheets"]:
            if sheet["name"] == "Category":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    cat_id = obj.get("ID") or obj.get("Category_ID")
                    cat_name = obj.get("Category_Name")
                    if cat_id is not None and cat_name:
                        category_map[int(cat_id)] = cat_name

        ext_cat_to_db_map = {}
        for cid, cname in category_map.items():
            cat = FoodKeeperCategory(external_id=cid, category_name=cname)
            db.add(cat)
            db.flush()
            ext_cat_to_db_map[cid] = cat.id

        count = 0
        for sheet in data["sheets"]:
            if sheet["name"] == "Product":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    prod_id = obj.get("ID")
                    if prod_id is None:
                        continue

                    cat_ext_id = int(obj.get("Category_ID")) if obj.get("Category_ID") is not None else None

                    product = FoodKeeperProduct(
                        external_id=int(prod_id),
                        category_id=ext_cat_to_db_map.get(cat_ext_id) if cat_ext_id is not None else None,
                        name=str(obj.get("Name", "")),
                        fridge_days_min=_parse_int(obj.get("DOP_Refrigerate_Min")),
                        fridge_days_max=_parse_int(obj.get("DOP_Refrigerate_Max")),
                        freezer_days_min=_parse_int(obj.get("DOP_Freeze_Min")),
                        freezer_days_max=_parse_int(obj.get("DOP_Freeze_Max")),
                        pantry_days_min=_parse_int(obj.get("Pantry_Min")),
                        pantry_days_max=_parse_int(obj.get("Pantry_Max")),
                    )
                    db.add(product)
                    count += 1

        db.commit()
        print(f"[seed] Seeded {count} FoodKeeper products and {len(category_map)} categories")

    except Exception as e:
        db.rollback()
        print(f"[seed] Error seeding FoodKeeper data: {e}")
        raise
    finally:
        db.close()


def _parse_int(val):
    if val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


if __name__ == "__main__":
    seed_foodkeeper()
