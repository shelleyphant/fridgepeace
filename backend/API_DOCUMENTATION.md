# FridgePeace API Documentation

## Project Overview

FridgePeace is a refrigerator food management system API that supports household management, member management, food inventory tracking (packaged/unpackaged), FoodKeeper reference data search, event logging, and ownership assignment.

## Project Structure

```
backend/
├── main.py                   FastAPI entry point, router registration, health check, FoodKeeper auto-seed
├── models.py                 SQLAlchemy ORM models (10 tables)
├── schemas.py                Pydantic request/response models with validation
├── routers.py                All API endpoint routes
├── seed_foodkeeper.py        FoodKeeper JSON → SQLite import script
├── foodkeeper.json           USDA/FDA FoodKeeper reference data (661 products, 25 categories)
├── requirements.txt          Dependency list
└── API_DOCUMENTATION.md      This file
```

---

## How to Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`

The first startup will automatically seed the FoodKeeper reference data (661 products, 25 categories) from `foodkeeper.json` into the database.

---

## Database Schema (10 Tables)

### 1. household

| Column | Type | Description |
|--------|------|-------------|
| id | CHAR(4) (PK) | Unique household code (auto-generated) |
| name | VARCHAR(255) | Household name |

### 2. user

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique user ID |
| username | VARCHAR(255) (Unique) | Globally unique username |
| display_name | VARCHAR(255) | User display name |
| created_at | DATETIME | Account creation timestamp (auto) |

### 3. household_member

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique member ID |
| user_id | INT (FK → user) | Associated user account |
| household_id | CHAR(4) (FK → household) | Associated household |
| display_name | VARCHAR(255) | Display name within the household |
| joined_at | DATETIME | When the user joined the household (auto) |

### 4. packaged_food

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique food ID |
| barcode | VARCHAR(255) (Unique) | Product barcode |
| name | VARCHAR(255) | Product name |
| brand | VARCHAR(255) | Brand name |
| image_url | VARCHAR(2048) | Product image URL |
| category | VARCHAR(255) | Category (snacks, drinks, etc.) |
| nutrition | TEXT | Nutritional info |

### 5. unpackaged_food

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique food ID |
| foodkeeper_id | VARCHAR(255) | Internal food database ID |
| category | VARCHAR(255) | Category (vegetables, meat, etc.) |
| name | VARCHAR(255) | Food name |
| fridge_days_min | INT | Min fridge shelf days |
| fridge_days_max | INT | Max fridge shelf days |
| freezer_days_min | INT | Min freezer shelf days |
| freezer_days_max | INT | Max freezer shelf days |
| pantry_days_min | INT | Min pantry shelf days |
| pantry_days_max | INT | Max pantry shelf days |

### 6. food_inventory (Core Table)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique inventory ID |
| household_id | CHAR(4) (FK → household) | Owning household |
| added_by_member_id | INT (FK → household_member) | Who added it |
| packaged_food_id | INT (FK → packaged_food, nullable) | If packaged |
| unpackaged_food_id | INT (FK → unpackaged_food, nullable) | If unpackaged |
| storage_location | VARCHAR(255) | Storage location (fridge/freezer/pantry) |
| quantity | DECIMAL(10,2) | Amount |
| unit | VARCHAR(50) | Unit (kg, L, pcs, etc.) |
| expiry_date | DATE | Expiration date |
| date_added | DATETIME | Created timestamp (auto) |
| date_updated | DATETIME | Updated timestamp (auto) |

> **Constraint**: Exactly one of `packaged_food_id` or `unpackaged_food_id` must be set.

### 7. food_event

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique event ID |
| inventory_item_id | INT (FK → food_inventory) | Related inventory item |
| member_id | INT (FK → household_member) | Who triggered it |
| event_type | VARCHAR(50) | Event type (added/consumed/expired/moved) |
| date_occurred | DATETIME | When it happened (auto) |

### 8. food_ownership (M:N Relationship)

| Column | Type | Description |
|--------|------|-------------|
| inventory_item_id | INT (FK → food_inventory) | Inventory item |
| member_id | INT (FK → household_member) | Owner member |
| tagged_at | DATETIME | When assigned (auto) |

> **Composite Primary Key**: (inventory_item_id, member_id)

### 9. foodkeeper_category (Reference Data)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Category ID (from FoodKeeper) |
| category_name | VARCHAR(255) | Category display name |

661 products from the USDA/FDA FoodKeeper database are grouped into 25 categories such as "Dairy Products & Eggs", "Vegetables", "Fruits", etc.

### 10. foodkeeper_product (Reference Data)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Product ID (from FoodKeeper) |
| category_id | INT (FK → foodkeeper_category, nullable) | Category reference |
| name | VARCHAR(255) | Product name |
| fridge_days_min | INT | Min recommended fridge storage (days) |
| fridge_days_max | INT | Max recommended fridge storage (days) |
| freezer_days_min | INT | Min recommended freezer storage (days) |
| freezer_days_max | INT | Max recommended freezer storage (days) |
| pantry_days_min | INT | Min recommended pantry storage (days) |
| pantry_days_max | INT | Max recommended pantry storage (days) |

> These tables hold the USDA/FDA FoodKeeper reference dataset. They are searchable via `GET /foods/search` and auto-seeded on first startup.

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Unique username** | User usernames must be globally unique |
| **Household code** | Household IDs are auto-generated 4-character alphanumeric codes (A-Z, 0-9) with collision retry |
| **Cascade delete household** | Deleting a household cascades to its members, inventory, events, and ownerships |
| **Cascade delete user** | Deleting a user cascades to all their household memberships |
| **Member deletion restricted** | A member with related inventory or events cannot be deleted (RESTRICT) |
| **Packaged/Unpackaged exclusivity** | Each inventory item must be exactly one type |
| **Unique barcode** | Packaged food barcodes must be unique |
| **Composite PK** | Food ownership uses (inventory_item_id, member_id) as composite key |
| **SET NULL on food deletion** | Deleting a food reference sets it to NULL in inventory |
| **FoodKeeper auto-seed** | Reference data is imported on startup if the tables are empty |
| **Input validation** | String fields (`name`, `display_name`, `username`) are trimmed, must not be empty or whitespace-only, and must not exceed 255 characters. `quantity` must be greater than zero. `event_type` accepts only `added`, `consumed`, `expired`, or `moved`. All `Optional[int]` fields accept empty string `""` as input — it is automatically converted to `null` so frontend forms can send blank number inputs without triggering a 422 error |

---

## API Endpoints

### Health Check

```
GET /health
```

**Response 200:**
```json
{
  "status": "ok",
  "message": "FridgePeace API is running"
}
```

---

### 1. Households

#### 1.1 List All Households

```
GET /households/
```

**Response 200:**
```json
[
  {
    "id": "A1B2",
    "name": "Happy Family"
  }
]
```

---

#### 1.2 Get Single Household

```
GET /households/{household_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| household_id | string (4-char code) | Household code |

**Response 200:**
```json
{
  "id": "A1B2",
  "name": "Happy Family"
}
```

**Response 404:**
```json
{
  "detail": "Household not found"
}
```

---

#### 1.3 Create Household

```
POST /households/
```

**Request Body:**
```json
{
  "name": "Happy Family"
}
```

**Validation:**
- `name` is required, must not be empty or whitespace-only, and must not exceed 255 characters
- Leading/trailing whitespace is automatically trimmed
- `id` is auto-generated as a random 4-character alphanumeric code (letters A-Z + digits 0-9)

**Response 201:**
```json
{
  "id": "A1B2",
  "name": "Happy Family"
}
```

---

#### 1.4 Update Household

```
PUT /households/{household_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| household_id | string (4-char code) | Household code |

**Request Body:**
```json
{
  "name": "Happy Family v2"
}
```

**Validation:** Same as create — `name` must not be empty or whitespace-only, maximum 255 characters, and leading/trailing whitespace is trimmed.

**Response 200:**
```json
{
  "id": "A1B2",
  "name": "Happy Family v2"
}
```

---

#### 1.5 Delete Household

```
DELETE /households/{household_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| household_id | string (4-char code) | Household code |

**Response 204:** No content

> Cascade: All members, inventory items, events, and ownerships under this household will also be deleted.

---

### 2. Household Members

#### 2.1 List All Members

```
GET /household-members/
```

**Response 200:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "household_id": "A1B2",
    "display_name": "Alice",
    "joined_at": "2026-05-30T12:00:00"
  }
]
```

---

#### 2.2 Get Single Member

```
GET /household-members/{member_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| member_id | int | Member ID |

**Response 200:**
```json
{
  "id": 1,
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice",
  "joined_at": "2026-05-30T12:00:00"
}
```

---

#### 2.3 Create Member

```
POST /household-members/
```

**Request Body:**
```json
{
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice"
}
```

**Validation:**
- `user_id` must reference an existing user (returns 404 if not found)
- `household_id` must reference an existing household (returns 404 if not found)
- `display_name` is required, must not be empty or whitespace-only, and must not exceed 255 characters
- Leading/trailing whitespace in `display_name` is automatically trimmed

**Response 201:**
```json
{
  "id": 1,
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice",
  "joined_at": "2026-05-30T12:00:00"
}
```

---

#### 2.4 Update Member

```
PUT /household-members/{member_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| member_id | int | Member ID |

**Request Body:**
```json
{
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice Updated"
}
```

**Validation:** `user_id`, `member_id`, and `household_id` are all checked for existence. `display_name` validation is the same as create — must not be empty or whitespace-only, maximum 255 characters, and leading/trailing whitespace is trimmed.

**Response 200:**
```json
{
  "id": 1,
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice Updated",
  "joined_at": "2026-05-30T12:00:00"
}
```

---

#### 2.5 Delete Member

```
DELETE /household-members/{member_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| member_id | int | Member ID |

**Response 204:** No content

> If the member has related inventory records or events, deletion will fail (RESTRICT constraint).

---

#### 2.6 Join Household

```
POST /member/join/
```

**Request Body:**
```json
{
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice"
}
```

**Validation:**
- `user_id` must reference an existing user (returns 404 if not found)
- `household_id` must reference an existing household (returns 404 if not found)
- `display_name` is optional — if omitted, defaults to the user's `display_name`

**Response 201:**
```json
{
  "id": 1,
  "user_id": 1,
  "household_id": "A1B2",
  "display_name": "Alice",
  "joined_at": "2026-05-30T12:00:00"
}
```

---

#### 2.7 Leave Household

```
POST /member/leave/
```

**Request Body:**
```json
{
  "user_id": 1,
  "household_id": "A1B2"
}
```

**Validation:**
- The membership must exist (returns 404 "Membership not found" if the user is not a member of that household)
- If the member has related inventory records or events, leaving will fail (RESTRICT constraint)

**Response 204:** No content

---

#### 2.8 List User's Households

```
GET /member/{user_id}/households
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | int | User ID |

**Validation:** `user_id` must reference an existing user (returns 404 if not found)

**Response 200:**
```json
[
  {
    "id": "A1B2",
    "name": "Home"
  }
]
```

---

#### 2.9 List Household Members (with User Info)

```
GET /member/{household_id}/members
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| household_id | string (4-char code) | Household code |

**Validation:** `household_id` must reference an existing household (returns 404 if not found)

**Response 200:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "household_id": "A1B2",
    "display_name": "Alice",
    "joined_at": "2026-05-30T12:00:00",
    "user": {
      "id": 1,
      "username": "alice",
      "display_name": "Alice"
    }
  }
]
```

---

### 3. Users

Users are standalone entities not tied to a specific household. Each user has a globally unique username.

#### 3.1 List All Users

```
GET /users/
```

**Response 200:**
```json
[
  {
    "id": 1,
    "username": "alice",
    "display_name": "Alice",
    "created_at": "2026-05-30T12:00:00"
  }
]
```

---

#### 3.2 Get Single User

```
GET /users/{user_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | int | User ID |

**Response 200:**
```json
{
  "id": 1,
  "username": "alice",
  "display_name": "Alice",
  "created_at": "2026-05-30T12:00:00"
}
```

**Response 404:**
```json
{
  "detail": "User not found"
}
```

---

#### 3.3 Create User

```
POST /users/
```

**Request Body:**
```json
{
  "username": "alice",
  "display_name": "Alice"
}
```

**Validation:**
- `username` is required, must not be empty or whitespace-only, and must not exceed 255 characters
- `display_name` is required, must not be empty or whitespace-only, and must not exceed 255 characters
- `username` must be globally unique (duplicate returns 400 "Username already exists")
- Leading/trailing whitespace is automatically trimmed on both fields

**Response 201:**
```json
{
  "id": 1,
  "username": "alice",
  "display_name": "Alice",
  "created_at": "2026-05-30T12:00:00"
}
```

---

### 4. Packaged Foods

#### 4.1 List All Packaged Foods

```
GET /packaged-foods/
```

**Response 200:**
```json
[
  {
    "id": 1,
    "barcode": "123456789",
    "name": "Coca Cola",
    "brand": "Coca-Cola",
    "image_url": null,
    "category": "Drinks",
    "nutrition": "Sugar: 10g"
  }
]
```

---

#### 4.2 Get Single Packaged Food

```
GET /packaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 200:** Same as above

---

#### 4.3 Create Packaged Food

```
POST /packaged-foods/
```

**Request Body:**
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

**Validation:**
- `name` is required
- If `barcode` is provided, it must be unique (duplicate returns 400)

**Response 201:** Returns the complete food info

---

#### 4.4 Update Packaged Food

```
PUT /packaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Request Body:** Same as create

**Validation:** If `barcode` is changed, it is checked against existing records for conflicts.

**Response 200:** Returns the updated food info

---

#### 4.5 Delete Packaged Food

```
DELETE /packaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 204:** No content

> Inventory items referencing this food will have `packaged_food_id` set to NULL (SET NULL).

---

### 5. Unpackaged Foods

#### 5.1 List All Unpackaged Foods

```
GET /unpackaged-foods/
```

**Response 200:**
```json
[
  {
    "id": 1,
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
]
```

---

#### 5.2 Get Single Unpackaged Food

```
GET /unpackaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 200:** Same as above

---

#### 5.3 Create Unpackaged Food

```
POST /unpackaged-foods/
```

**Request Body:**
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

**Validation:**
- `name` is required
- All optional integer fields (`fridge_days_min`, `fridge_days_max`, `freezer_days_min`, `freezer_days_max`, `pantry_days_min`, `pantry_days_max`) accept both `null` and empty string `""` as valid input — either will result in the field being stored as `null`

**Response 201:** Returns the complete food info

---

#### 5.4 Update Unpackaged Food

```
PUT /unpackaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Request Body:** Same as create

**Response 200:** Returns the updated food info

---

#### 5.5 Delete Unpackaged Food

```
DELETE /unpackaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 204:** No content

---

### 6. Food Inventory

#### 6.1 List All Inventory Items

```
GET /food-inventory/
```

**Response 200:**
```json
[
  {
    "id": 1,
    "household_id": "A1B2",
    "added_by_member_id": 1,
    "packaged_food_id": 1,
    "unpackaged_food_id": null,
    "storage_location": "fridge",
    "quantity": "2.50",
    "unit": "L",
    "expiry_date": "2026-06-01",
    "date_added": "2026-05-23T12:00:00",
    "date_updated": "2026-05-23T12:00:00"
  }
]
```

---

#### 6.2 Get Single Inventory Item

```
GET /food-inventory/{item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| item_id | int | Inventory item ID |

**Response 200 (packaged example):**
```json
{
  "id": 1,
  "household_id": "A1B2",
  "added_by_member_id": 1,
  "packaged_food_id": 1,
  "unpackaged_food_id": null,
  "storage_location": "fridge",
  "quantity": "2.50",
  "unit": "L",
  "expiry_date": "2026-06-01",
  "date_added": "2026-05-23T12:00:00",
  "date_updated": "2026-05-23T12:00:00",
  "packaged_food": {
    "name": "Coca Cola",
    "brand": "Coca-Cola",
    "category": "Drinks"
  },
  "unpackaged_food": null
}
```

**Response 200 (unpackaged example):**
```json
{
  "id": 2,
  "household_id": "A1B2",
  "added_by_member_id": 2,
  "packaged_food_id": null,
  "unpackaged_food_id": 1,
  "storage_location": "pantry",
  "quantity": "1.00",
  "unit": "kg",
  "expiry_date": "2026-05-25",
  "date_added": "2026-05-23T12:00:00",
  "date_updated": "2026-05-23T12:00:00",
  "packaged_food": null,
  "unpackaged_food": {
    "name": "Tomato",
    "category": "Vegetables"
  }
}
```

---

#### 6.3 Create Inventory Item

```
POST /food-inventory/
```

**Request Body (packaged example):**
```json
{
  "household_id": "A1B2",
  "added_by_member_id": 1,
  "packaged_food_id": 1,
  "unpackaged_food_id": null,
  "storage_location": "fridge",
  "quantity": "2.50",
  "unit": "L",
  "expiry_date": "2026-06-01"
}
```

**Request Body (unpackaged example):**
```json
{
  "household_id": "A1B2",
  "added_by_member_id": 2,
  "packaged_food_id": null,
  "unpackaged_food_id": 1,
  "storage_location": "pantry",
  "quantity": "1.00",
  "unit": "kg",
  "expiry_date": "2026-05-25"
}
```

**Validation Rules:**
- `household_id` and `added_by_member_id` must exist (returns 404)
- Exactly one of `packaged_food_id` or `unpackaged_food_id` must be set (returns 400)
- `packaged_food_id` and `unpackaged_food_id` accept both `null` and empty string `""` as valid input — either will be treated as `null` when determining food type exclusivity
- `quantity` must be greater than zero and is required
- `unit` is required

**Error Codes:**
| Status | Description |
|:------:|-------------|
| 400 | Item must be either packaged or unpackaged (exactly one of packaged_food_id or unpackaged_food_id) |

**Response 201:** Returns the complete inventory info (with auto-generated `date_added` and `date_updated`)

---

#### 6.4 Update Inventory Item

```
PUT /food-inventory/{item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| item_id | int | Inventory item ID |

**Request Body:** Same as create

**Validation:** Same as create - exactly one food type must be specified

**Response 200:** Returns updated info (`date_updated` auto-updated)

---

#### 6.5 Delete Inventory Item

```
DELETE /food-inventory/{item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| item_id | int | Inventory item ID |

**Response 204:** No content

> Cascade: All events and ownerships associated with this inventory item will also be deleted.

---

### 7. Food Events

#### 7.1 List All Events

```
GET /food-events/
```

**Response 200:**
```json
[
  {
    "id": 1,
    "inventory_item_id": 1,
    "member_id": 1,
    "event_type": "added",
    "date_occurred": "2026-05-23T12:00:00"
  }
]
```

---

#### 7.2 Get Single Event

```
GET /food-events/{event_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| event_id | int | Event ID |

**Response 200:** Same as above

---

#### 7.3 List Events by Inventory Item

```
GET /food-events/by-inventory/{inventory_item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| inventory_item_id | int | Inventory item ID |

**Response 200:**
```json
[
  {
    "id": 1,
    "inventory_item_id": 1,
    "member_id": 1,
    "event_type": "added",
    "date_occurred": "2026-05-23T12:00:00"
  }
]
```

---

#### 7.4 Create Event

```
POST /food-events/
```

**Request Body:**
```json
{
  "inventory_item_id": 1,
  "member_id": 1,
  "event_type": "added"
}
```

**Common Event Types (enum):**
| Type | Description |
|------|-------------|
| `added` | Item added |
| `consumed` | Item consumed |
| `expired` | Item expired |
| `moved` | Item moved |

> Only the four event types listed above are accepted. Any other value will return a 422 validation error.

**Validation:** `inventory_item_id` and `member_id` must exist. `event_type` must be one of: `added`, `consumed`, `expired`, `moved`.

**Response 201:**
```json
{
  "id": 1,
  "inventory_item_id": 1,
  "member_id": 1,
  "event_type": "added",
  "date_occurred": "2026-05-23T12:00:00"
}
```

---

#### 7.5 Delete Event

```
DELETE /food-events/{event_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| event_id | int | Event ID |

**Response 204:** No content

---

#### 7.6 List Events by Inventory Item (with Member Names)

```
GET /food-events/by-inventory/{inventory_item_id}/with-members
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| inventory_item_id | int | Inventory item ID |

**Response 200:**
```json
[
  {
    "id": 1,
    "inventory_item_id": 1,
    "member_id": 1,
    "event_type": "added",
    "date_occurred": "2026-05-23T12:00:00",
    "member_display_name": "Alice"
  }
]
```

**Additional Fields (beyond standard `FoodEventResponse`):**
| Field | Type | Description |
|-------|------|-------------|
| member_display_name | string or null | Display name of the member who triggered the event |

> Events are sorted by `date_occurred` descending (newest first).

---

### 8. Food Ownerships

#### 8.1 List All Ownerships

```
GET /food-ownerships/
```

**Response 200:**
```json
[
  {
    "inventory_item_id": 1,
    "member_id": 1,
    "tagged_at": "2026-05-23T12:00:00"
  }
]
```

---

#### 8.2 List Ownerships by Inventory Item

```
GET /food-ownerships/by-inventory/{inventory_item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| inventory_item_id | int | Inventory item ID |

**Response 200:** Returns all ownership records for the specified inventory item

---

#### 8.3 List Ownerships by Member

```
GET /food-ownerships/by-member/{member_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| member_id | int | Member ID |

**Response 200:** Returns all ownership records for the specified member

---

#### 8.4 Create Ownership

```
POST /food-ownerships/
```

**Request Body:**
```json
{
  "inventory_item_id": 1,
  "member_id": 1
}
```

**Validation:**
- `inventory_item_id` and `member_id` must exist
- Duplicate pair (inventory_item_id, member_id) returns 400

**Response 201:**
```json
{
  "inventory_item_id": 1,
  "member_id": 1,
  "tagged_at": "2026-05-23T12:00:00"
}
```

---

#### 8.5 Delete Ownership

```
DELETE /food-ownerships/{inventory_item_id}/{member_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| inventory_item_id | int | Inventory item ID |
| member_id | int | Member ID |

**Response 204:** No content

---

### 9. Food Search (NEW)

Unified search across **FoodKeeper reference data** (661 fresh food products with shelf-life estimates) and **previously stored PackagedFood** records. Search is case-insensitive and matches against food names. Returns both result sets in a single response, each capped at 20 items.

#### 9.1 Search Foods

```
GET /foods/search?q={query}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 1 character, whitespace-only values return empty results) |

**Response 200:**
```json
{
  "foodkeeper_results": [
    {
      "id": 3,
      "category_id": 7,
      "name": "Cheese",
      "fridge_days_min": 6,
      "fridge_days_max": 6,
      "freezer_days_min": 6,
      "freezer_days_max": 6,
      "pantry_days_min": null,
      "pantry_days_max": null,
      "category_name": "Dairy Products & Eggs"
    }
  ],
  "packaged_results": [
    {
      "id": 5,
      "barcode": "123456789",
      "name": "Cheese Slices",
      "brand": "Kraft",
      "image_url": null,
      "category": "Dairy"
    }
  ]
}
```

**foodkeeper_results** — Products from the USDA/FDA FoodKeeper reference database. Each result includes:
| Field | Type | Description |
|-------|------|-------------|
| id | int | FoodKeeper product ID |
| category_id | int or null | Reference to category |
| name | string | Product name |
| fridge_days_min | int or null | Min fridge storage (days) |
| fridge_days_max | int or null | Max fridge storage (days) |
| freezer_days_min | int or null | Min freezer storage (days) |
| freezer_days_max | int or null | Max freezer storage (days) |
| pantry_days_min | int or null | Min pantry storage (days) |
| pantry_days_max | int or null | Max pantry storage (days) |
| category_name | string or null | Human-readable category name |

**packaged_results** — Previously stored PackagedFood records (barcoded items). Each result includes:
| Field | Type | Description |
|-------|------|-------------|
| id | int | PackagedFood ID |
| barcode | string or null | Product barcode |
| name | string | Product name |
| brand | string or null | Brand name |
| image_url | string or null | Product image URL |
| category | string or null | Product category |

> **Note**: This endpoint replaces the previous frontend-only approach of bundling the 617KB FoodKeeper JSON into the webpack build. The search now runs entirely server-side using SQL `ILIKE` pattern matching.

---

### 10. Unified Add to Inventory (NEW)

A single endpoint that creates a `food_inventory` record for either a **FoodKeeper** fresh food or a **PackagedFood** item in one API call. If the selected FoodKeeper product has never been added to this household before, it automatically creates the underlying `unpackaged_food` record.

#### 10.1 Add Food to Inventory

```
POST /foods/add-to-inventory
```

**Request Body:**
```json
{
  "household_id": "A1B2",
  "added_by_member_id": 1,
  "source": "foodkeeper",
  "source_id": 3,
  "storage_location": "fridge",
  "quantity": "1.00",
  "unit": "kg",
  "expiry_date": "2026-06-15"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| household_id | string | Yes | Target household code |
| added_by_member_id | int | Yes | Household member who is adding |
| source | enum | Yes | `"foodkeeper"` or `"packaged"` |
| source_id | int | Yes | ID from search results (FoodKeeper `id` or PackagedFood `id`) |
| storage_location | string or null | No | `"fridge"`, `"freezer"`, `"pantry"`, etc. |
| quantity | decimal | Yes | Amount (must be > 0) |
| unit | string | Yes | Unit of measurement (e.g. `"kg"`, `"L"`, `"pcs"`) |
| expiry_date | date or null | No | Expiration date (ISO 8601 format `YYYY-MM-DD`) |

**Behaviors by source type:**

| Source | Behavior |
|--------|----------|
| `foodkeeper` | Looks up `FoodKeeperProduct` by ID. If an `unpackaged_food` record with the same `foodkeeper_id` already exists, reuses it. Otherwise, creates a new `unpackaged_food` record with shelf-life estimates copied from the FoodKeeper data (the `is_new` flag will be `true`). |
| `packaged` | Looks up `PackagedFood` by ID. Uses the existing record directly. |

**Response 201:**
```json
{
  "inventory_item": {
    "id": 10,
    "household_id": "A1B2",
    "added_by_member_id": 1,
    "packaged_food_id": null,
    "unpackaged_food_id": 5,
    "storage_location": "fridge",
    "quantity": "1.00",
    "unit": "kg",
    "expiry_date": "2026-06-15",
    "date_added": "2026-06-01T10:00:00",
    "date_updated": "2026-06-01T10:00:00"
  },
  "food_item": {
    "id": 5,
    "foodkeeper_id": "3",
    "category": null,
    "name": "Cheese",
    "fridge_days_min": 6,
    "fridge_days_max": 6,
    "freezer_days_min": 6,
    "freezer_days_max": 6,
    "pantry_days_min": null,
    "pantry_days_max": null
  },
  "is_new": true
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| inventory_item | object | The created `food_inventory` record |
| food_item | object | The `unpackaged_food` or `packaged_food` record used/created |
| is_new | boolean | `true` only when a new `unpackaged_food` record was created (always `false` for packaged foods) |

**Error Codes:**
| Status | Description |
|:------:|-------------|
| 404 | Household, member, or source food not found |
| 400 | Invalid `source` value (must be `"foodkeeper"` or `"packaged"`) |

> **Note**: This endpoint replaces the previous frontend pattern of: 1) GET all foods → 2) POST create food → 3) POST create inventory. It reduces the add-to-fridge flow from up to 4 HTTP round-trips down to 1.

---

### 11. Household Inventory with Names (NEW)

Returns all inventory items for a specific household, with food name, brand, image URL, and category resolved server-side in a single query. Each item includes a `source_type` field indicating whether it is `"packaged"` or `"unpackaged"`.

#### 11.1 List Household Inventory

```
GET /households/{household_id}/inventory
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| household_id | string (4-char code) | Household code |

**Response 200:**
```json
[
  {
    "id": 1,
    "household_id": "A1B2",
    "added_by_member_id": 1,
    "packaged_food_id": 1,
    "unpackaged_food_id": null,
    "storage_location": "fridge",
    "quantity": "2.50",
    "unit": "L",
    "expiry_date": "2026-06-01",
    "date_added": "2026-05-23T12:00:00",
    "date_updated": "2026-05-23T12:00:00",
    "food_name": "Coca Cola",
    "food_image": null,
    "food_brand": "Coca-Cola",
    "food_category": "Drinks",
    "source_type": "packaged",
    "owner_id": 1,
    "owner_display_name": "Alice"
  },
  {
    "id": 2,
    "household_id": "A1B2",
    "added_by_member_id": 2,
    "packaged_food_id": null,
    "unpackaged_food_id": 1,
    "storage_location": "pantry",
    "quantity": "1.00",
    "unit": "kg",
    "expiry_date": "2026-05-25",
    "date_added": "2026-05-23T12:00:00",
    "date_updated": "2026-05-23T12:00:00",
    "food_name": "Tomato",
    "food_image": null,
    "food_brand": null,
    "food_category": null,
    "source_type": "unpackaged",
    "owner_id": 2,
    "owner_display_name": "Bob"
  }
]
```

**Additional Fields (beyond standard `FoodInventoryResponse`):**
| Field | Type | Description |
|-------|------|-------------|
| food_name | string or null | Resolved food name (from `packaged_food.name` or `unpackaged_food.name`) |
| food_image | string or null | Product image URL (packaged foods only) |
| food_brand | string or null | Brand name (packaged foods only) |
| food_category | string or null | Product category |
| source_type | string or null | Either `"packaged"`, `"unpackaged"`, or `null` (should not be null for valid records) |
| owner_id | int or null | Member ID of the first owner assigned to this item |
| owner_display_name | string or null | Display name of the first owner |

> Items are sorted by `date_added` descending (newest first).

---

## Error Codes Summary

| Status | Meaning | Description |
|:------:|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Deletion succeeded (no response body) |
| 400 | Bad Request | Validation failed (e.g., duplicate barcode, invalid inventory type, missing required fields, invalid source) |
| 404 | Not Found | Resource does not exist |
| 422 | Unprocessable Entity | Request body failed Pydantic schema validation (e.g., required field missing, wrong type, invalid enum value, empty/whitespace-only string, string exceeds length limit, value out of range) |

---

## Endpoint Quick Reference

| Category | Method | Endpoint | Description |
|:--------:|:------:|----------|-------------|
| Health | GET | `/health` | Service status |
| Household | GET | `/households/` | List all households |
| Household | GET | `/households/{id}` | Get single household |
| Household | POST | `/households/` | Create household |
| Household | PUT | `/households/{id}` | Update household |
| Household | DELETE | `/households/{id}` | Delete household |
| User | GET | `/users/` | List all users |
| User | GET | `/users/{id}` | Get single user |
| User | POST | `/users/` | Create user (username unique) |
| Member | GET | `/household-members/` | List all members |
| Member | GET | `/household-members/{id}` | Get single member |
| Member | POST | `/household-members/` | Create member (low-level) |
| Member | PUT | `/household-members/{id}` | Update member |
| Member | DELETE | `/household-members/{id}` | Delete member |
| Member | POST | `/member/join/` | Join a household |
| Member | POST | `/member/leave/` | Leave a household |
| Member | GET | `/member/{user_id}/households` | List user's households |
| Member | GET | `/member/{household_id}/members` | List household members with user info |
| Packaged Food | GET | `/packaged-foods/` | List all packaged foods |
| Packaged Food | GET | `/packaged-foods/{id}` | Get single packaged food |
| Packaged Food | POST | `/packaged-foods/` | Create packaged food |
| Packaged Food | PUT | `/packaged-foods/{id}` | Update packaged food |
| Packaged Food | DELETE | `/packaged-foods/{id}` | Delete packaged food |
| Unpackaged Food | GET | `/unpackaged-foods/` | List all unpackaged foods |
| Unpackaged Food | GET | `/unpackaged-foods/{id}` | Get single unpackaged food |
| Unpackaged Food | POST | `/unpackaged-foods/` | Create unpackaged food |
| Unpackaged Food | PUT | `/unpackaged-foods/{id}` | Update unpackaged food |
| Unpackaged Food | DELETE | `/unpackaged-foods/{id}` | Delete unpackaged food |
| Inventory | GET | `/food-inventory/` | List all inventory items |
| Inventory | GET | `/food-inventory/{id}` | Get single inventory item (with food details) |
| Inventory | POST | `/food-inventory/` | Create inventory item |
| Inventory | PUT | `/food-inventory/{id}` | Update inventory item |
| Inventory | DELETE | `/food-inventory/{id}` | Delete inventory item |
| Event | GET | `/food-events/` | List all events |
| Event | GET | `/food-events/{id}` | Get single event |
| Event | GET | `/food-events/by-inventory/{id}` | List events by inventory item |
| Event | GET | `/food-events/by-inventory/{id}/with-members` | List events by inventory item (with member names) |
| Event | POST | `/food-events/` | Create event |
| Event | DELETE | `/food-events/{id}` | Delete event |
| Ownership | GET | `/food-ownerships/` | List all ownerships |
| Ownership | GET | `/food-ownerships/by-inventory/{id}` | List ownerships by inventory item |
| Ownership | GET | `/food-ownerships/by-member/{id}` | List ownerships by member |
| Ownership | POST | `/food-ownerships/` | Create ownership |
| Ownership | DELETE | `/food-ownerships/{inv_id}/{mem_id}` | Delete ownership |
| **Search** | **GET** | **`/foods/search?q=...`** | **Unified FoodKeeper + PackagedFood search** |
| **Add** | **POST** | **`/foods/add-to-inventory`** | **Unified add to inventory (1 call)** |
| **Inventory** | **GET** | **`/households/{id}/inventory`** | **Household inventory with resolved names and owner info** |
