# FridgePeace API Documentation

## Project Structure

```
backend/
├── .venv/                          # Python virtual environment
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI entry point, router registration
│   ├── database.py                 # SQLAlchemy engine & session config
│   ├── models/                     # ORM models (7 tables)
│   │   ├── __init__.py
│   │   ├── household.py            # Household table
│   │   ├── household_member.py     # HouseholdMember table
│   │   ├── packaged_food.py        # PackagedFood table
│   │   ├── unpackaged_food.py      # UnpackagedFood table
│   │   ├── food_inventory.py       # FoodInventory table (core)
│   │   ├── food_event.py           # FoodEvent table (logs)
│   │   └── food_ownership.py       # FoodOwnership table (M:N)
│   ├── schemas/                    # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── household.py
│   │   ├── household_member.py
│   │   ├── packaged_food.py
│   │   ├── unpackaged_food.py
│   │   ├── food_inventory.py
│   │   ├── food_event.py
│   │   └── food_ownership.py
│   └── routers/                    # API route handlers
│       ├── __init__.py
│       ├── household.py
│       ├── household_member.py
│       ├── packaged_food.py
│       ├── unpackaged_food.py
│       ├── food_inventory.py
│       ├── food_event.py
│       └── food_ownership.py
├── migrations/                     # Alembic database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 3fa39f46d607_initial_database_schema.py
├── alembic.ini
├── fridgepeace.db                  # SQLite database file
├── test_api.py                     # Comprehensive test script (33 tests)
├── requirements.txt
└── API_DOCUMENTATION.md            # This file
```

---

## Database Schema (7 Tables)

### 1. household
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique household ID |
| name | VARCHAR(255) | Household name |

### 2. household_member
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique member ID |
| household_id | INT (FK → household) | Associated household |
| display_name | VARCHAR(255) | Member display name |

### 3. packaged_food
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique food ID |
| barcode | VARCHAR(255) (Unique) | Product barcode |
| name | VARCHAR(255) | Product name |
| brand | VARCHAR(255) | Brand name |
| image_url | VARCHAR(2048) | Image URL |
| category | VARCHAR(255) | Category (snacks, drinks, etc.) |
| nutrition | TEXT | Nutritional info |

### 4. unpackaged_food
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique food ID |
| foodkeeper_id | VARCHAR(255) | Internal food database ID |
| category | VARCHAR(255) | Category (vegetables, meat, etc.) |
| name | VARCHAR(255) | Food name |
| fridge_days_min | INT | Min fridge days |
| fridge_days_max | INT | Max fridge days |
| freezer_days_min | INT | Min freezer days |
| freezer_days_max | INT | Max freezer days |
| pantry_days_min | INT | Min pantry days |
| pantry_days_max | INT | Max pantry days |

### 5. food_inventory (Core Table)
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique inventory ID |
| household_id | INT (FK → household) | Household owner |
| added_by_member_id | INT (FK → household_member) | Who added it |
| packaged_food_id | INT (FK → packaged_food, NULL) | If packaged |
| unpackaged_food_id | INT (FK → unpackaged_food, NULL) | If unpackaged |
| storage_location | VARCHAR(255) | fridge / freezer / pantry |
| quantity | DECIMAL(10,2) | Amount |
| unit | VARCHAR(50) | kg, L, pcs, etc. |
| expiry_date | DATE | Expiration date |
| date_added | DATETIME | Created timestamp |
| date_updated | DATETIME | Updated timestamp |

> **CHECK constraint**: exactly one of `packaged_food_id` or `unpackaged_food_id` must be set.

### 6. food_event
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique event ID |
| inventory_item_id | INT (FK → food_inventory) | Related item |
| member_id | INT (FK → household_member) | Who triggered it |
| event_type | VARCHAR(50) | added / consumed / expired / moved |
| date_occurred | DATETIME | When it happened |

### 7. food_ownership (M:N Relationship)
| Column | Type | Description |
|--------|------|-------------|
| inventory_item_id | INT (FK → food_inventory) | Inventory item |
| member_id | INT (FK → household_member) | Owner member |
| tagged_at | DATETIME | When assigned |

> **Composite Primary Key**: (inventory_item_id, member_id)

---

## API Endpoints

### Health Check
```
GET /health
```
Response: `{"status": "ok", "message": "FridgePeace API is running"}`

---

### Households

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/households/` | List all households |
| GET | `/households/{id}` | Get household by ID |
| POST | `/households/` | Create household |
| PUT | `/households/{id}` | Update household |
| DELETE | `/households/{id}` | Delete household (cascade) |

**POST / PUT body:**
```json
{ "name": "Happy Family" }
```

---

### Household Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/household-members/` | List all members |
| GET | `/household-members/{id}` | Get member by ID |
| POST | `/household-members/` | Create member |
| PUT | `/household-members/{id}` | Update member |
| DELETE | `/household-members/{id}` | Delete member |

**POST / PUT body:**
```json
{ "household_id": 1, "display_name": "Alice" }
```

---

### Packaged Foods

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/packaged-foods/` | List all packaged foods |
| GET | `/packaged-foods/{id}` | Get by ID |
| POST | `/packaged-foods/` | Create (barcode must be unique) |
| PUT | `/packaged-foods/{id}` | Update |
| DELETE | `/packaged-foods/{id}` | Delete |

**POST / PUT body:**
```json
{
  "barcode": "123456789",
  "name": "Coca Cola",
  "brand": "Coca-Cola",
  "image_url": null,
  "category": "Drinks",
  "nutrition": "Sugar: 10g"
}
```

---

### Unpackaged Foods

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/unpackaged-foods/` | List all unpackaged foods |
| GET | `/unpackaged-foods/{id}` | Get by ID |
| POST | `/unpackaged-foods/` | Create |
| PUT | `/unpackaged-foods/{id}` | Update |
| DELETE | `/unpackaged-foods/{id}` | Delete |

**POST / PUT body:**
```json
{
  "foodkeeper_id": "VEG001",
  "category": "Vegetables",
  "name": "Tomato",
  "fridge_days_min": 3,
  "fridge_days_max": 7,
  "freezer_days_min": 30,
  "freezer_days_max": 90,
  "pantry_days_min": 1,
  "pantry_days_max": 3
}
```

---

### Food Inventory (Core)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/food-inventory/` | List all inventory items |
| GET | `/food-inventory/{id}` | Get by ID |
| POST | `/food-inventory/` | Create item |
| PUT | `/food-inventory/{id}` | Update item |
| DELETE | `/food-inventory/{id}` | Delete item |

**POST / PUT body (packaged example):**
```json
{
  "household_id": 1,
  "added_by_member_id": 1,
  "packaged_food_id": 1,
  "unpackaged_food_id": null,
  "storage_location": "fridge",
  "quantity": "2.50",
  "unit": "L",
  "expiry_date": "2026-06-01"
}
```

**POST / PUT body (unpackaged example):**
```json
{
  "household_id": 1,
  "added_by_member_id": 2,
  "packaged_food_id": null,
  "unpackaged_food_id": 1,
  "storage_location": "pantry",
  "quantity": "1.00",
  "unit": "kg",
  "expiry_date": "2026-05-25"
}
```

> **Validation**: Exactly one of `packaged_food_id` or `unpackaged_food_id` must be provided.

---

### Food Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/food-events/` | List all events |
| GET | `/food-events/{id}` | Get by ID |
| GET | `/food-events/by-inventory/{inventory_id}` | List events for an item |
| POST | `/food-events/` | Create event |
| DELETE | `/food-events/{id}` | Delete event |

**POST body:**
```json
{
  "inventory_item_id": 1,
  "member_id": 1,
  "event_type": "added"
}
```

---

### Food Ownerships (M:N)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/food-ownerships/` | List all ownerships |
| GET | `/food-ownerships/by-inventory/{inventory_id}` | List by inventory item |
| GET | `/food-ownerships/by-member/{member_id}` | List by member |
| POST | `/food-ownerships/` | Create ownership |
| DELETE | `/food-ownerships/{inventory_id}/{member_id}` | Delete ownership |

**POST body:**
```json
{
  "inventory_item_id": 1,
  "member_id": 1
}
```

> **Duplicate prevention**: Creating an existing ownership pair returns 400.

---

## Business Rules

| Rule | Implementation |
|------|---------------|
| **Cascade delete household** | Deleting a household removes its members, inventory, events, and ownerships |
| **Member deletion restricted** | Cannot delete a member who has inventory items or events (RESTRICT) |
| **Packaged/Unpackaged exclusivity** | Each inventory item must be exactly one type (CHECK constraint) |
| **Unique barcode** | Packaged food barcodes must be unique |
| **Composite PK** | Food ownership uses (inventory_item_id, member_id) as composite key |
| **SET NULL on food deletion** | Deleting a food reference sets it to NULL in inventory |

---

## How to Run

### Start the server
```bash
cd backend
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### Run tests
```bash
cd backend
.venv\Scripts\python test_api.py
```

### Run migrations (if models change)
```bash
cd backend
.venv\Scripts\alembic revision --autogenerate -m "Description"
.venv\Scripts\alembic upgrade head
```

### Access Swagger UI
```
http://localhost:8000/docs
```

---

## Test Coverage (33 Tests)

| # | Test | What it verifies |
|---|------|------------------|
| 1 | `test_health` | Server is running |
| 2 | `test_create_household` | POST creates household |
| 3 | `test_list_households` | GET lists households |
| 4 | `test_get_household` | GET by ID |
| 5 | `test_update_household` | PUT updates name |
| 6 | `test_create_member` | POST creates members |
| 7 | `test_list_members` | GET lists members |
| 8 | `test_update_member` | PUT updates display name |
| 9 | `test_create_packaged_food` | POST creates packaged food |
| 10 | `test_create_duplicate_barcode` | Duplicate barcode returns 400 |
| 11 | `test_list_packaged_foods` | GET lists packaged foods |
| 12 | `test_create_unpackaged_food` | POST creates unpackaged food |
| 13 | `test_get_unpackaged_food` | GET by ID |
| 14 | `test_create_inventory_packaged` | POST packaged inventory item |
| 15 | `test_create_inventory_unpackaged` | POST unpackaged inventory item |
| 16-17 | `test_create_inventory_invalid` | Invalid items (both/neither) return 400 |
| 18 | `test_list_inventory` | GET lists inventory |
| 19 | `test_get_inventory` | GET by ID |
| 20 | `test_update_inventory` | PUT updates location & quantity |
| 21-22 | `test_create_event` | POST creates events (added, consumed) |
| 23 | `test_list_events` | GET lists events |
| 24 | `test_list_events_by_inventory` | Filter by inventory ID |
| 25-26 | `test_create_ownership` | POST creates ownerships |
| 27 | `test_create_duplicate_ownership` | Duplicate ownership returns 400 |
| 28-29 | `test_list_ownerships_by_*` | Filter by inventory/member |
| 30 | `test_delete_ownership` | DELETE ownership |
| 31 | `test_delete_event` | DELETE event |
| 32 | `test_delete_inventory` | DELETE inventory with cascade verification |
| 33 | `test_delete_household_cascade` | DELETE household verifies full cascade |
