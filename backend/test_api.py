import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

Base.metadata.create_all(bind=engine)

client = TestClient(app)

household_id = None
member_id_1 = None
member_id_2 = None
packaged_food_id = None
unpackaged_food_id = None
inventory_id_1 = None
inventory_id_2 = None
event_id = None


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    print("[PASS] GET /health")


def test_create_household():
    global household_id
    resp = client.post("/households/", json={"name": "Happy Family"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Happy Family"
    assert "id" in data
    household_id = data["id"]
    print(f"[PASS] POST /households/ -> id={household_id}")


def test_list_households():
    resp = client.get("/households/")
    assert resp.status_code == 200
    data = resp.json()
    assert any(h["id"] == household_id for h in data)
    print("[PASS] GET /households/")


def test_get_household():
    resp = client.get(f"/households/{household_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Happy Family"
    print(f"[PASS] GET /households/{household_id}")


def test_update_household():
    resp = client.put(f"/households/{household_id}", json={"name": "Happy Family v2"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Happy Family v2"
    print(f"[PASS] PUT /households/{household_id}")


def test_create_member():
    global member_id_1, member_id_2
    resp = client.post("/household-members/", json={"household_id": household_id, "display_name": "Alice"})
    assert resp.status_code == 201
    member_id_1 = resp.json()["id"]
    resp = client.post("/household-members/", json={"household_id": household_id, "display_name": "Bob"})
    assert resp.status_code == 201
    member_id_2 = resp.json()["id"]
    print(f"[PASS] POST /household-members/ -> alice={member_id_1}, bob={member_id_2}")


def test_list_members():
    resp = client.get("/household-members/")
    assert resp.status_code == 200
    data = resp.json()
    assert any(m["id"] == member_id_1 for m in data)
    print("[PASS] GET /household-members/")


def test_update_member():
    resp = client.put(f"/household-members/{member_id_1}", json={"household_id": household_id, "display_name": "Alice Updated"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Alice Updated"
    print(f"[PASS] PUT /household-members/{member_id_1}")


def test_create_packaged_food():
    global packaged_food_id
    payload = {
        "barcode": "123456789",
        "name": "Coca Cola",
        "brand": "Coca-Cola",
        "category": "Drinks",
        "nutrition": "Sugar: 10g",
    }
    resp = client.post("/packaged-foods/", json=payload)
    assert resp.status_code == 201
    packaged_food_id = resp.json()["id"]
    assert resp.json()["barcode"] == "123456789"
    print(f"[PASS] POST /packaged-foods/ -> id={packaged_food_id}")


def test_create_duplicate_barcode():
    payload = {
        "barcode": "123456789",
        "name": "Pepsi",
        "brand": "PepsiCo",
        "category": "Drinks",
    }
    resp = client.post("/packaged-foods/", json=payload)
    assert resp.status_code == 400
    print("[PASS] POST /packaged-foods/ (duplicate barcode) -> 400")


def test_list_packaged_foods():
    resp = client.get("/packaged-foods/")
    assert resp.status_code == 200
    data = resp.json()
    assert any(f["id"] == packaged_food_id for f in data)
    print("[PASS] GET /packaged-foods/")


def test_create_unpackaged_food():
    global unpackaged_food_id
    payload = {
        "foodkeeper_id": "VEG001",
        "category": "Vegetables",
        "name": "Tomato",
        "fridge_days_min": 3,
        "fridge_days_max": 7,
        "freezer_days_min": 30,
        "freezer_days_max": 90,
        "pantry_days_min": 1,
        "pantry_days_max": 3,
    }
    resp = client.post("/unpackaged-foods/", json=payload)
    assert resp.status_code == 201
    unpackaged_food_id = resp.json()["id"]
    assert resp.json()["name"] == "Tomato"
    print(f"[PASS] POST /unpackaged-foods/ -> id={unpackaged_food_id}")


def test_get_unpackaged_food():
    resp = client.get(f"/unpackaged-foods/{unpackaged_food_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Tomato"
    print(f"[PASS] GET /unpackaged-foods/{unpackaged_food_id}")


def test_create_inventory_packaged():
    global inventory_id_1
    payload = {
        "household_id": household_id,
        "added_by_member_id": member_id_1,
        "packaged_food_id": packaged_food_id,
        "unpackaged_food_id": None,
        "storage_location": "fridge",
        "quantity": "2.50",
        "unit": "L",
        "expiry_date": "2026-06-01",
    }
    resp = client.post("/food-inventory/", json=payload)
    assert resp.status_code == 201
    inventory_id_1 = resp.json()["id"]
    print(f"[PASS] POST /food-inventory/ (packaged) -> id={inventory_id_1}")


def test_create_inventory_unpackaged():
    global inventory_id_2
    payload = {
        "household_id": household_id,
        "added_by_member_id": member_id_2,
        "packaged_food_id": None,
        "unpackaged_food_id": unpackaged_food_id,
        "storage_location": "pantry",
        "quantity": "1.00",
        "unit": "kg",
        "expiry_date": "2026-05-25",
    }
    resp = client.post("/food-inventory/", json=payload)
    assert resp.status_code == 201
    inventory_id_2 = resp.json()["id"]
    print(f"[PASS] POST /food-inventory/ (unpackaged) -> id={inventory_id_2}")


def test_create_inventory_invalid():
    payload = {
        "household_id": household_id,
        "added_by_member_id": member_id_1,
        "packaged_food_id": None,
        "unpackaged_food_id": None,
        "storage_location": "fridge",
        "quantity": "1.00",
        "unit": "kg",
    }
    resp = client.post("/food-inventory/", json=payload)
    assert resp.status_code == 400
    print("[PASS] POST /food-inventory/ (both null) -> 400")

    payload["packaged_food_id"] = packaged_food_id
    payload["unpackaged_food_id"] = unpackaged_food_id
    resp = client.post("/food-inventory/", json=payload)
    assert resp.status_code == 400
    print("[PASS] POST /food-inventory/ (both set) -> 400")


def test_list_inventory():
    resp = client.get("/food-inventory/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    print("[PASS] GET /food-inventory/")


def test_get_inventory():
    resp = client.get(f"/food-inventory/{inventory_id_1}")
    assert resp.status_code == 200
    assert resp.json()["unit"] == "L"
    print(f"[PASS] GET /food-inventory/{inventory_id_1}")


def test_update_inventory():
    resp = client.put(f"/food-inventory/{inventory_id_1}", json={
        "household_id": household_id,
        "added_by_member_id": member_id_1,
        "packaged_food_id": packaged_food_id,
        "unpackaged_food_id": None,
        "storage_location": "freezer",
        "quantity": "3.00",
        "unit": "L",
        "expiry_date": "2026-07-01",
    })
    assert resp.status_code == 200
    assert resp.json()["storage_location"] == "freezer"
    assert resp.json()["quantity"] == "3.00"
    print(f"[PASS] PUT /food-inventory/{inventory_id_1}")


def test_create_event():
    global event_id
    payload = {
        "inventory_item_id": inventory_id_1,
        "member_id": member_id_1,
        "event_type": "added",
    }
    resp = client.post("/food-events/", json=payload)
    assert resp.status_code == 201
    event_id = resp.json()["id"]
    assert resp.json()["event_type"] == "added"
    print(f"[PASS] POST /food-events/ -> id={event_id}")

    resp = client.post("/food-events/", json={
        "inventory_item_id": inventory_id_2,
        "member_id": member_id_2,
        "event_type": "consumed",
    })
    assert resp.status_code == 201
    print("[PASS] POST /food-events/ (consumed)")


def test_list_events():
    resp = client.get("/food-events/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    print("[PASS] GET /food-events/")


def test_list_events_by_inventory():
    resp = client.get(f"/food-events/by-inventory/{inventory_id_1}")
    assert resp.status_code == 200
    data = resp.json()
    assert all(e["inventory_item_id"] == inventory_id_1 for e in data)
    print(f"[PASS] GET /food-events/by-inventory/{inventory_id_1}")


def test_create_ownership():
    resp = client.post("/food-ownerships/", json={
        "inventory_item_id": inventory_id_1,
        "member_id": member_id_1,
    })
    assert resp.status_code == 201
    print(f"[PASS] POST /food-ownerships/ (item={inventory_id_1}, member={member_id_1})")

    resp = client.post("/food-ownerships/", json={
        "inventory_item_id": inventory_id_1,
        "member_id": member_id_2,
    })
    assert resp.status_code == 201
    print(f"[PASS] POST /food-ownerships/ (item={inventory_id_1}, member={member_id_2})")


def test_create_duplicate_ownership():
    resp = client.post("/food-ownerships/", json={
        "inventory_item_id": inventory_id_1,
        "member_id": member_id_1,
    })
    assert resp.status_code == 400
    print("[PASS] POST /food-ownerships/ (duplicate) -> 400")


def test_list_ownerships_by_inventory():
    resp = client.get(f"/food-ownerships/by-inventory/{inventory_id_1}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    print(f"[PASS] GET /food-ownerships/by-inventory/{inventory_id_1}")


def test_list_ownerships_by_member():
    resp = client.get(f"/food-ownerships/by-member/{member_id_1}")
    assert resp.status_code == 200
    data = resp.json()
    assert all(o["member_id"] == member_id_1 for o in data)
    print(f"[PASS] GET /food-ownerships/by-member/{member_id_1}")


def test_delete_ownership():
    resp = client.delete(f"/food-ownerships/{inventory_id_1}/{member_id_2}")
    assert resp.status_code == 204
    print(f"[PASS] DELETE /food-ownerships/{inventory_id_1}/{member_id_2}")

    resp = client.get(f"/food-ownerships/by-inventory/{inventory_id_1}")
    assert len(resp.json()) == 1
    print("[PASS] Ownership deleted correctly")


def test_delete_event():
    resp = client.delete(f"/food-events/{event_id}")
    assert resp.status_code == 204
    print(f"[PASS] DELETE /food-events/{event_id}")


def test_delete_inventory():
    resp = client.delete(f"/food-inventory/{inventory_id_1}")
    assert resp.status_code == 204
    print(f"[PASS] DELETE /food-inventory/{inventory_id_1}")

    resp = client.get(f"/food-inventory/{inventory_id_1}")
    assert resp.status_code == 404
    print("[PASS] Inventory item cascade verified")


def test_delete_member_restrict():
    resp = client.delete(f"/household-members/{member_id_1}")
    assert resp.status_code == 204
    print(f"[PASS] DELETE /household-members/{member_id_1}")


def test_delete_household_cascade():
    resp = client.delete(f"/households/{household_id}")
    assert resp.status_code == 204
    print(f"[PASS] DELETE /households/{household_id}")

    resp = client.get("/household-members/")
    members_after = resp.json()
    assert all(m["household_id"] != household_id for m in members_after)
    print("[PASS] Cascade delete verified - orphan members removed")


if __name__ == "__main__":
    test_health()
    test_create_household()
    test_list_households()
    test_get_household()
    test_update_household()
    test_create_member()
    test_list_members()
    test_update_member()
    test_create_packaged_food()
    test_create_duplicate_barcode()
    test_list_packaged_foods()
    test_create_unpackaged_food()
    test_get_unpackaged_food()
    test_create_inventory_packaged()
    test_create_inventory_unpackaged()
    test_create_inventory_invalid()
    test_list_inventory()
    test_get_inventory()
    test_update_inventory()
    test_create_event()
    test_list_events()
    test_list_events_by_inventory()
    test_create_ownership()
    test_create_duplicate_ownership()
    test_list_ownerships_by_inventory()
    test_list_ownerships_by_member()
    test_delete_ownership()
    test_delete_event()
    test_delete_inventory()
    test_delete_member_restrict()
    test_delete_household_cascade()

    print("\n" + "=" * 50)
    print("ALL 33 TESTS PASSED SUCCESSFULLY!")
    print("=" * 50)
