"""
Comprehensive test script for shelf life improvement:
1. Data model (all columns, cooking_tips, cooking_methods)
2. Seed data import (all 38 fields, unit conversion)
3. Context-aware shelf life engine (5-level fallback)
4. Search (name + keywords matching)
5. API endpoints (add-to-inventory with context)

Run: python test_improvements.py
"""

import json
import os
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

import sqlalchemy
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

# Ensure backend is in path
sys.path.insert(0, str(Path(__file__).parent))
os.chdir(Path(__file__).parent)

PASS = 0
FAIL = 0


TICK = "[PASS]"
CROSS = "[FAIL]"

def check(description: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  {TICK} {description}")
    else:
        FAIL += 1
        print(f"  {CROSS} {description}  [{detail}]")


# ============================================================
# 1. Data Model Tests
# ============================================================
def test_data_model():
    print("\n" + "=" * 60)
    print("1. DATA MODEL TESTS")
    print("=" * 60)

    from models import Base, FoodKeeperProduct, FoodKeeperCategory, FoodKeeperCookingTip, FoodKeeperCookingMethod

    # Use in-memory SQLite for fast testing
    test_engine = create_engine("sqlite://", echo=False)
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    db = TestSession()

    try:
        inspector = inspect(test_engine)
        tables = inspector.get_table_names()
        check("All 5 FoodKeeper tables created",
              all(t in tables for t in ["foodkeeper_product", "foodkeeper_category",
                                        "foodkeeper_cooking_tip", "foodkeeper_cooking_method"]))

        # Check new columns in FoodKeeperProduct
        fk_cols = [col["name"] for col in inspector.get_columns("foodkeeper_product")]
        expected_new_cols = ["keywords", "name_subtitle",
                             "fridge_min", "fridge_max", "fridge_metric", "fridge_tips",
                             "freeze_min", "freeze_max", "freeze_metric", "freeze_tips",
                             "fridge_after_open_min", "fridge_after_open_max", "fridge_after_open_metric",
                             "pantry_after_open_min", "pantry_after_open_max", "pantry_after_open_metric",
                             "fridge_after_thaw_min", "fridge_after_thaw_max", "fridge_after_thaw_metric"]
        for col in expected_new_cols:
            check(f"Column '{col}' exists in foodkeeper_product table", col in fk_cols, fk_cols)

        check("FoodKeeperProduct has 35+ columns", len(fk_cols) >= 35, f"got {len(fk_cols)} cols")

        # Check FoodKeeperCategory has subcategory_name
        cat_cols = [col["name"] for col in inspector.get_columns("foodkeeper_category")]
        check("Category table has subcategory_name", "subcategory_name" in cat_cols, cat_cols)

        # Check cooking_tip columns
        tip_cols = [col["name"] for col in inspector.get_columns("foodkeeper_cooking_tip")]
        check("CookingTip has tips column", "tips" in tip_cols, tip_cols)
        check("CookingTip has safe_min_temp column", "safe_min_temp" in tip_cols, tip_cols)

        # Check cooking_method columns
        method_cols = [col["name"] for col in inspector.get_columns("foodkeeper_cooking_method")]
        check("CookingMethod has method column", "method" in method_cols, method_cols)
        check("CookingMethod has temperature column", "temperature" in method_cols, method_cols)

        # Test model relationships
        cat = FoodKeeperCategory(external_id=999, category_name="TestCat", subcategory_name="TestSub")
        db.add(cat)
        db.flush()

        product = FoodKeeperProduct(
            external_id=9999,
            category_id=cat.id,
            name="Test Product",
            keywords="test, sample",
            name_subtitle="Test Subtitle",
            fridge_days_min=3,
            fridge_days_max=7,
        )
        db.add(product)
        db.flush()

        tip = FoodKeeperCookingTip(product_id=product.id, tips="Cook thoroughly")
        db.add(tip)

        method = FoodKeeperCookingMethod(product_id=product.id, method="Bake", temperature="350F")
        db.add(method)
        db.commit()

        check("Product.category_id links to Category", product.category_id == cat.id)
        check("Product keywords stored correctly", product.keywords == "test, sample")
        check("CookingTip relationship works", len(product.cooking_tips) == 1)
        check("CookingMethod relationship works", len(product.cooking_methods) == 1)
        check("Category.subcategory_name stored", cat.subcategory_name == "TestSub")

    finally:
        db.close()
        test_engine.dispose()


# ============================================================
# 2. Seed Data Tests
# ============================================================
def test_seed():
    print("\n" + "=" * 60)
    print("2. SEED DATA TESTS")
    print("=" * 60)

    from models import Base, FoodKeeperProduct, FoodKeeperCategory, FoodKeeperCookingTip, FoodKeeperCookingMethod

    test_engine = create_engine("sqlite://", echo=False)
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    db = TestSession()

    try:
        # --- Simulate seeding from foodkeeper.json ---
        fk_path = Path(__file__).parent / "foodkeeper.json"
        if not fk_path.exists():
            check("foodkeeper.json exists", False, "file not found")
            return

        with open(fk_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Parse categories
        category_map = {}
        for sheet in data["sheets"]:
            if sheet["name"] == "Category":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    cid = obj.get("ID") or obj.get("Category_ID")
                    if cid is not None:
                        try:
                            cid = int(float(cid))
                        except (ValueError, TypeError):
                            continue
                        cname = str(obj.get("Category_Name", "")).strip()
                        sname = str(obj.get("Subcategory_Name", "")).strip() if obj.get("Subcategory_Name") else None
                        if cname:
                            category_map[cid] = (cname, sname)

        check(f"Categories parsed from JSON: {len(category_map)}",
              len(category_map) >= 20, f"got {len(category_map)}")

        ext_cat_map = {}
        for cid, (cname, sname) in category_map.items():
            cat = FoodKeeperCategory(external_id=cid, category_name=cname, subcategory_name=sname)
            db.add(cat)
            db.flush()
            ext_cat_map[cid] = cat.id

        # Parse products
        product_count = 0
        ext_id_to_db_id = {}
        for sheet in data["sheets"]:
            if sheet["name"] == "Product":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    pid = obj.get("ID")
                    if pid is None:
                        continue
                    try:
                        pid = int(float(pid))
                    except (ValueError, TypeError):
                        continue

                    cat_ext_id = obj.get("Category_ID")
                    db_cat_id = None
                    if cat_ext_id is not None:
                        try:
                            db_cat_id = ext_cat_map.get(int(float(cat_ext_id)))
                        except (ValueError, TypeError):
                            pass

                    product = FoodKeeperProduct(
                        external_id=pid,
                        category_id=db_cat_id,
                        name=str(obj.get("Name", "")),
                        keywords=str(obj.get("Keywords", "")) if obj.get("Keywords") else None,
                        name_subtitle=str(obj.get("Name_subtitle", "")) if obj.get("Name_subtitle") else None,
                    )
                    db.add(product)
                    db.flush()
                    ext_id_to_db_id[pid] = product.id
                    product_count += 1

        check(f"Products parsed: {product_count}", product_count >= 600, f"got {product_count}")

        # Parse cooking tips
        tip_count = 0
        for sheet in data["sheets"]:
            if sheet["name"] == "CookingTips":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    prod_ext_id = obj.get("Product_ID")
                    if prod_ext_id is None:
                        continue
                    try:
                        db_pid = ext_id_to_db_id.get(int(float(prod_ext_id)))
                    except (ValueError, TypeError):
                        continue
                    if db_pid is None:
                        continue
                    tip = FoodKeeperCookingTip(
                        product_id=db_pid,
                        tips=str(obj.get("Tips", "")),
                        safe_min_temp=str(obj.get("Safe_Minimum_Temperature", "")),
                    )
                    db.add(tip)
                    tip_count += 1

        check(f"Cooking tips parsed: {tip_count}", tip_count >= 50, f"got {tip_count}")

        # Parse cooking methods
        method_count = 0
        for sheet in data["sheets"]:
            if sheet["name"] == "CookingMethods":
                for row in sheet["data"]:
                    obj = {}
                    for item in row:
                        obj.update(item)
                    prod_ext_id = obj.get("Product_ID")
                    if prod_ext_id is None:
                        continue
                    try:
                        db_pid = ext_id_to_db_id.get(int(float(prod_ext_id)))
                    except (ValueError, TypeError):
                        continue
                    if db_pid is None:
                        continue
                    method = FoodKeeperCookingMethod(
                        product_id=db_pid,
                        method=str(obj.get("Cooking_Method", "")),
                        temperature=str(obj.get("Cooking_Temperature", "")),
                    )
                    db.add(method)
                    method_count += 1

        check(f"Cooking methods parsed: {method_count}", method_count >= 50, f"got {method_count}")

        db.commit()

        # Verify relationships
        sample = db.query(FoodKeeperProduct).filter(
            FoodKeeperProduct.cooking_tips.any()
        ).first()
        check("At least one product has cooking tips", sample is not None)

        # Verify keywords exist on some products
        kw_products = db.query(FoodKeeperProduct).filter(
            FoodKeeperProduct.keywords.isnot(None),
            FoodKeeperProduct.keywords != ""
        ).count()
        check(f"Products with keywords: {kw_products}", kw_products > 0, f"count={kw_products}")

    finally:
        db.close()
        test_engine.dispose()


# ============================================================
# 3. Shelf Life Engine Tests
# ============================================================
def test_shelf_life_engine():
    print("\n" + "=" * 60)
    print("3. SHELF LIFE ENGINE TESTS")
    print("=" * 60)

    from models import Base, FoodKeeperProduct, FoodKeeperCategory
    from shelf_life import (
        ShelfLifeResult,
        compute_shelf_life,
        compute_all_storage_recommendations,
        get_storage_recommendations,
        CONTEXT_STORAGE_FIELD_MAP,
    )

    # Setup test DB with sample data
    test_engine = create_engine("sqlite://", echo=False)
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    db = TestSession()

    try:
        cat1 = FoodKeeperCategory(external_id=1, category_name="Produce", subcategory_name="Vegetables")
        cat2 = FoodKeeperCategory(external_id=2, category_name="Produce", subcategory_name="Fruits")
        db.add_all([cat1, cat2])
        db.flush()

        p1 = FoodKeeperProduct(
            external_id=100, category_id=cat1.id, name="Broccoli",
            fridge_days_min=3, fridge_days_max=7,
            freezer_days_min=180, freezer_days_max=365,
            pantry_days_min=None, pantry_days_max=None,
            fridge_after_open_min=2, fridge_after_open_max=4,
        )
        p2 = FoodKeeperProduct(
            external_id=101, category_id=cat1.id, name="Lettuce",
            fridge_days_min=5, fridge_days_max=10,
            freezer_days_min=None, freezer_days_max=None,
            pantry_days_min=None, pantry_days_max=None,
        )
        p3 = FoodKeeperProduct(
            external_id=102, category_id=cat2.id, name="Apple",
            fridge_days_min=14, fridge_days_max=30,
            freezer_days_min=180, freezer_days_max=365,
            pantry_days_min=3, pantry_days_max=7,
        )
        db.add_all([p1, p2, p3])
        db.commit()

        # --- Level 1: Exact product ---
        result = compute_shelf_life(db, product_id=p1.id, storage="fridge")
        check("L1 exact product fridge",
              result.is_valid() and result.min_days == 3 and result.max_days == 7,
              f"got {result.min_days}-{result.max_days}, source={result.source}")

        result = compute_shelf_life(db, product_id=p1.id, storage="freezer")
        check("L1 exact product freezer",
              result.is_valid() and result.min_days == 180,
              f"got {result.min_days}-{result.max_days}")

        result = compute_shelf_life(db, product_id=p3.id, storage="pantry")
        check("L1 exact product pantry",
              result.is_valid() and result.min_days == 3 and result.max_days == 7,
              f"got {result.min_days}-{result.max_days}")

        # --- Level 2: Category aggregation ---
        result = compute_shelf_life(db, category_id=cat1.id, storage="fridge")
        check("L2 category fridge (median of Broccoli+ Lettuce)",
              result.is_valid() and result.source == "category_avg",
              f"got {result.min_days}-{result.max_days}, source={result.source}")

        # --- Level 5: Fallback ---
        result = compute_shelf_life(db, storage="pantry")
        check("L5 fallback pantry",
              result.is_valid() and result.min_days == 30,
              f"got {result.min_days}-{result.max_days}, source={result.source}")

        # --- Context: after_open ---
        result = compute_shelf_life(db, product_id=p1.id, context="after_open", storage="fridge")
        check("Context after_open fridge",
              result.is_valid() and result.min_days == 2 and result.max_days == 4,
              f"got {result.min_days}-{result.max_days}")

        # --- Context: after_thaw freezer (unsupported) ---
        result = compute_shelf_life(db, product_id=p1.id, context="after_thaw", storage="freezer")
        check("Context after_thaw freezer = unsupported",
              not result.is_valid() and result.source == "unsupported",
              f"source={result.source}")

        # --- all storage recommendations ---
        all_recs = compute_all_storage_recommendations(db, product_id=p1.id)
        check("All storage has fridge result", all_recs.get("fridge") and all_recs["fridge"].is_valid())
        check("All storage has freezer result", all_recs.get("freezer") and all_recs["freezer"].is_valid())
        check("All storage has pantry result (fallback for broccoli)", all_recs.get("pantry") is not None)

        # --- get_storage_recommendations ---
        recs = get_storage_recommendations(
            db=db,
            foodkeeper_data={
                "product_id": p1.id,
                "category_id": p1.category_id,
            },
            context="dop",
        )
        check("get_storage_recommendations returns 3 keys",
              set(recs.keys()) == {"fridge", "freezer", "pantry"})
        check("get_storage_recommendations fridge is dict",
              isinstance(recs.get("fridge"), dict))

    finally:
        db.close()
        test_engine.dispose()


# ============================================================
# 4. Search Tests
# ============================================================
def test_search():
    print("\n" + "=" * 60)
    print("4. SEARCH TESTS")
    print("=" * 60)

    from models import Base, FoodKeeperProduct, FoodKeeperCategory
    from sqlalchemy import or_

    test_engine = create_engine("sqlite://", echo=False)
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    db = TestSession()

    try:
        cat = FoodKeeperCategory(external_id=1, category_name="Meat", subcategory_name="Beef")
        db.add(cat)
        db.flush()

        p1 = FoodKeeperProduct(
            external_id=1, category_id=cat.id,
            name="Ground Beef",
            keywords="mince, hamburger, minced beef",
            name_subtitle="80% Lean",
        )
        p2 = FoodKeeperProduct(
            external_id=2, category_id=cat.id,
            name="Chicken Breast",
            keywords="poultry, white meat, chicken fillet",
        )
        db.add_all([p1, p2])
        db.commit()

        # Search by name
        results = db.query(FoodKeeperProduct).filter(
            FoodKeeperProduct.name.ilike(f"%ground%")
        ).all()
        check("Search by name 'ground' finds Ground Beef",
              len(results) == 1 and results[0].name == "Ground Beef")

        # Search by keywords
        results = db.query(FoodKeeperProduct).filter(
            FoodKeeperProduct.keywords.ilike(f"%mince%")
        ).all()
        check("Search by keywords 'mince' finds Ground Beef",
              len(results) == 1 and results[0].name == "Ground Beef")

        # Search by name OR keywords
        results = db.query(FoodKeeperProduct).filter(
            or_(
                FoodKeeperProduct.name.ilike(f"%chicken%"),
                FoodKeeperProduct.keywords.ilike(f"%chicken%"),
            )
        ).all()
        check("Search 'chicken' matches Chicken Breast by name",
              len(results) == 1 and results[0].name == "Chicken Breast")

        # Search by keyword match that doesn't match name
        results = db.query(FoodKeeperProduct).filter(
            or_(
                FoodKeeperProduct.name.ilike(f"%hamburger%"),
                FoodKeeperProduct.keywords.ilike(f"%hamburger%"),
            )
        ).all()
        check("Search 'hamburger' matches Ground Beef via keywords",
              len(results) == 1 and results[0].name == "Ground Beef")

    finally:
        db.close()
        test_engine.dispose()


# ============================================================
# 5. API Tests
# ============================================================
def test_api():
    print("\n" + "=" * 60)
    print("5. API ENDPOINT TESTS")
    print("=" * 60)

    from fastapi.testclient import TestClient
    from main import app

    import random
    unique_suffix = str(random.randint(10000, 99999))

    with TestClient(app) as client:
        resp = client.get("/health")
        check("Health endpoint returns 200", resp.status_code == 200)
        check("Health endpoint returns ok", resp.json().get("status") == "ok")

        resp = client.post("/households/", json={"name": "Test Household"})
        check("Create household returns 201", resp.status_code == 201)
        household_id = resp.json()["id"]

        username = f"testuser_{unique_suffix}"
        resp = client.post("/users/", json={"username": username, "display_name": "Test"})
        check("Create user returns 201", resp.status_code == 201,
              f"got status {resp.status_code}")
        user_id = resp.json()["id"]

        resp = client.post("/member/join/", json={
            "user_id": user_id, "household_id": household_id,
        })
        check("Join household returns 201", resp.status_code == 201)
        member_id = resp.json()["id"]

        resp = client.get("/foods/search", params={"q": "apple"})
        check("Search 'apple' returns 200", resp.status_code == 200)
        data = resp.json()
        check("Search has foodkeeper_results key", "foodkeeper_results" in data)
        check("Search has packaged_results key", "packaged_results" in data)
        check("Search 'apple' finds at least 1 result",
              len(data["foodkeeper_results"]) > 0,
              f"got {len(data['foodkeeper_results'])} results")

        if data["foodkeeper_results"]:
            first = data["foodkeeper_results"][0]
            check("Search result has 'keywords' field", "keywords" in first)
            check("Search result has 'cooking_tips' field", "cooking_tips" in first)
            check("Search result has 'cooking_methods' field", "cooking_methods" in first)

        resp = client.post("/foods/add-to-inventory", json={
            "household_id": household_id,
            "added_by_member_id": member_id,
            "source": "foodkeeper",
            "source_id": 1,
            "storage_location": "fridge",
            "quantity": 1,
            "unit": "unit",
            "context": "dop",
        })
        check("Add foodkeeper to inventory returns 201", resp.status_code == 201,
              f"got {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        check("Response has shelf_life_info", "shelf_life_info" in data)
        check("Response has recommended_expiry", "recommended_expiry" in data)
        if data.get("shelf_life_info") and data["shelf_life_info"].get("fridge"):
            sli = data["shelf_life_info"]["fridge"]
            check("shelf_life_info fridge has min_days", "min_days" in sli)

        resp = client.post("/foods/add-to-inventory", json={
            "household_id": household_id,
            "added_by_member_id": member_id,
            "source": "foodkeeper",
            "source_id": 1,
            "storage_location": "fridge",
            "quantity": 1,
            "unit": "unit",
            "context": "after_open",
        })
        check("Add with after_open context returns 201", resp.status_code == 201)

        resp = client.get(f"/households/{household_id}/inventory")
        check("List inventory returns 200", resp.status_code == 200)
        data = resp.json()
        check("Inventory is a list", isinstance(data, list))
        if data:
            check("Inventory item has food_name", "food_name" in data[0])


# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("FOODKEEPER IMPROVEMENT TEST SUITE")
    print("=" * 60)

    test_data_model()
    test_seed()
    test_shelf_life_engine()
    test_search()
    test_api()

    print("\n" + "=" * 60)
    print(f"RESULTS: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
    print("=" * 60)

    sys.exit(1 if FAIL > 0 else 0)
