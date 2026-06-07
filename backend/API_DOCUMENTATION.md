# FridgePeace API Documentation

## Project Overview

FridgePeace is a refrigerator food management system API that supports household management, member management, food inventory tracking (packaged/unpackaged), event logging, and ownership assignment.

## Project Structure

```
backend/
├── main.py                   FastAPI entry point, router registration, health check
├── models.py                 SQLAlchemy ORM models (9 tables)
├── schemas.py                Pydantic request/response models with validation (input trimming, length constraints, positive-only numeric fields, enum validation, and empty-string-to-null coercion for Optional[int] fields)
├── routers.py                All API endpoint routes
├── requirements.txt          Dependency list
├── API_DOCUMENTATION.md      This file
└── off_data_au.db            Australian OFF subset (SQLite, ~70K products, compact — 19 essential fields)
```

---

## How to Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`

---

## Database Schema (9 Tables + 1 Read-Only OFF Table in separate DB)

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

<!-- ### 9. off_product (DISABLED - removed due to large file size) -->
<!-- off_data.db was removed from the repository. Use the Australian subset below. -->

### 9. off_product_au (Read-only, Australian subset — Compact)

This table lives in a **separate SQLite database** (`off_data_au.db`) and is read-only for API consumers. It is an Australian-product subset (~70K products) of Open Food Facts. The schema has been **compacted to 19 essential fields** to stay within Cloudflare's file size limits — only front-facing identifiers, images, and core nutrition values are retained. All columns are stored as TEXT.

| Category | Column | Type | Description |
|----------|--------|------|-------------|
| Identity | id | INT (PK, Auto) | Internal ID |
| | code | TEXT (Unique) | Product barcode |
| | product_name | TEXT | Product name |
| Brand | brands | TEXT | Brand name(s) |
| Category | categories | TEXT | Category hierarchy |
| Images | image_url | TEXT | Front product image |
| | image_small_url | TEXT | Small front image |
| Popularity | unique_scans_n | TEXT | Unique scan count (for search sorting) |
| Nutrition | energy_kcal_100g | TEXT | Energy in kcal per 100g |
| | energy_100g | TEXT | Energy in kJ per 100g |
| | fat_100g | TEXT | Total fat per 100g |
| | saturated_fat_100g | TEXT | Saturated fat per 100g |
| | carbohydrates_100g | TEXT | Total carbohydrates per 100g |
| | sugars_100g | TEXT | Sugars per 100g |
| | fiber_100g | TEXT | Dietary fiber per 100g |
| | proteins_100g | TEXT | Proteins per 100g |
| | salt_100g | TEXT | Salt per 100g |
| | sodium_100g | TEXT | Sodium per 100g |
| Metadata | imported_at | TEXT | Import timestamp |

> **Removed fields (45):** `generic_name`, `brands_tags`, `categories_tags`, `quantity`, `product_quantity`, `serving_size`, `stores`, `countries_tags`, `countries_en`, `manufacturing_places`, `ingredients_text`, `allergens`, `allergens_en`, `traces`, `traces_en`, `additives_n`, `additives_tags`, `labels_tags`, `packaging_tags`, `nutriscore_grade`, `nutriscore_score`, `nova_group`, `image_nutrition_url`, `image_ingredients_url`, `energy_from_fat_100g`, `trans_fat_100g`, `cholesterol_100g`, `vitamin_a_100g`, `vitamin_c_100g`, `vitamin_d_100g`, `calcium_100g`, `iron_100g`, `magnesium_100g`, `potassium_100g`, `zinc_100g`, `fruits_vegetables_legumes_100g`, `no_nutrition_data`, `popularity_tags`, `url`, `creator`, `created_t`, `last_modified_t`, `owner`, `brand_owner`, `data_quality_errors_tags`

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
| **Input validation** | String fields (`name`, `display_name`, `username`) are trimmed, must not be empty or whitespace-only, and must not exceed 255 characters. `quantity` must be greater than zero. `event_type` accepts only `added`, `consumed`, `expired`, or `moved`. All `Optional[int]` fields accept empty string `""` as input — it is automatically converted to `null` so frontend forms can send blank number inputs without triggering a 422 error |
| **OFF database (read-only)** | The `off_data_au.db` is a separate SQLite database containing an Australian subset of Open Food Facts (~70K AU products). It is read-only — API consumers cannot create, update, or delete OFF products |

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
POST /member/join
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
POST /member/leave
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

### 9. Shopping Suggestions

Analyses the household's food waste patterns and returns a plain-language shopping suggestion. If the household has at least 5 inventory records and a food item has been marked as expired 2 or more times, a "buy less" recommendation is shown for that item. Otherwise a neutral message is returned.

#### 9.1 Get Shopping Suggestion

```
GET /households/{household_id}/suggestions
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| household_id | string (4-char code) | Household code |

**Logic:**
- If the household has fewer than 5 inventory records, returns a neutral message: *"Add more food records to see shopping suggestions."*
- Groups expired `food_event` records by food item, filters for items with 2+ expired events, and picks the worst offender.
- Returns a "buy less" suggestion with the food name, waste count, and total times it was added.

**Response 200 (suggestion available):**
```json
{
  "has_suggestion": true,
  "suggestion_text": "You often have spinach left over. Try buying a smaller amount next time.",
  "food_name": "spinach",
  "wasted_count": 3,
  "total_added_count": 5
}
```

**Response 200 (insufficient data):**
```json
{
  "has_suggestion": false,
  "suggestion_text": "Add more food records to see shopping suggestions.",
  "food_name": null,
  "wasted_count": null,
  "total_added_count": null
}
```

**Response 404:**
```json
{
  "detail": "Household not found"
}
```

---

<!-- ### 10. Open Food Facts Product Search (DISABLED) -->
<!-- off_data.db has been removed due to large file size. -->
<!-- Use the Australian subset /off-products-au/ endpoints instead. -->

### 10. Open Food Facts Australia Subset (Compact)

Read-only endpoints backed by `off_data_au.db`, an Australian-product subset of Open Food Facts (~70K products). The schema has been **compacted to 19 essential fields** (see §9) to fit within Cloudflare's file size limits. Includes front-facing identifiers, images, and core nutrition values.

The three endpoints return **string-typed** values across all columns (since the source CSV stores everything as text).

#### 10.1 Search AU Products by Name

```
GET /off-products-au/search?q={term}&page={n}&page_size={n}
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| q | string | (required) | Search term (min 1 character, case-insensitive LIKE) |
| page | int | 1 | Page number (1-based) |
| page_size | int | 20 | Items per page (1–100) |

**Response 200:**
```json
{
  "items": [
    {
      "code": "9310885115586",
      "product_name": "Dark Peanut Butter Crunchy",
      "brands": "Mayver's",
      "categories": "Plant-based foods and beverages, Plant-based foods, ...",
      "image_url": "https://images.openfoodfacts.org/.../front_en.57.400.jpg",
      "image_small_url": "https://images.openfoodfacts.org/.../front_en.57.200.jpg",
      "unique_scans_n": "9"
    }
  ],
  "total": 1606,
  "page": 1,
  "page_size": 2,
  "total_pages": 803
}
```

**Search Result Fields:**
| Field | Type | Description |
|-------|------|-------------|
| code | string | Product barcode |
| product_name | string | Product name |
| brands | string or null | Brand name(s) |
| categories | string or null | Category hierarchy (comma-separated) |
| image_url | string or null | Product front image URL (400px) |
| image_small_url | string or null | Product front image URL (200px) |
| unique_scans_n | string or null | Number of unique scans (popularity proxy) |

---

#### 10.2 Get AU Product by Barcode

```
GET /off-products-au/by-barcode/{code}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| code | string | Product barcode (EAN-13, e.g. `9310885115586`) |

**Response 200 returns all search result fields plus the following nutrition details:**

| Field | Type | Description |
|-------|------|-------------|
| energy_kcal_100g | string or null | Energy in kcal per 100g |
| energy_100g | string or null | Energy in kJ per 100g |
| fat_100g | string or null | Total fat per 100g |
| saturated_fat_100g | string or null | Saturated fat per 100g |
| carbohydrates_100g | string or null | Total carbohydrates per 100g |
| sugars_100g | string or null | Sugars per 100g |
| fiber_100g | string or null | Dietary fiber per 100g |
| proteins_100g | string or null | Proteins per 100g |
| salt_100g | string or null | Salt per 100g |
| sodium_100g | string or null | Sodium per 100g |

> Note: All numeric fields are returned as **strings** because the source CSV stores them as text. The frontend should parse with `parseFloat()` or similar where numeric comparison is needed.

**Response 404:**
```json
{
  "detail": "Product not found"
}
```

---

#### 10.3 Get AU Database Statistics

```
GET /off-products-au/stats
```

**Response 200:**
```json
{
  "total_products": 70826,
  "imported_at": "2026-06-06 17:17:42"
}
```

---

## Error Codes Summary

| Status | Meaning | Description |
|:------:|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Deletion succeeded (no response body) |
| 400 | Bad Request | Validation failed (e.g., duplicate barcode, invalid inventory type, missing required fields) |
| 404 | Not Found | Resource does not exist |
| 422 | Unprocessable Entity | Request body failed Pydantic schema validation (e.g., required field missing, wrong type, invalid enum value, empty/whitespace-only string, string exceeds length limit, value out of range) |
| 422 (OFF search) | Unprocessable Entity | Search query parameter `q` must be at least 1 character |

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
| Member | POST | `/member/join` | Join a household |
| Member | POST | `/member/leave` | Leave a household |
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
| Inventory | GET | `/food-inventory/{id}` | Get single inventory item |
| Inventory | POST | `/food-inventory/` | Create inventory item |
| Inventory | PUT | `/food-inventory/{id}` | Update inventory item |
| Inventory | DELETE | `/food-inventory/{id}` | Delete inventory item |
| Event | GET | `/food-events/` | List all events |
| Event | GET | `/food-events/{id}` | Get single event |
| Event | GET | `/food-events/by-inventory/{id}` | List events by inventory item |
| Event | POST | `/food-events/` | Create event |
| Event | DELETE | `/food-events/{id}` | Delete event |
| Ownership | GET | `/food-ownerships/` | List all ownerships |
| Ownership | GET | `/food-ownerships/by-inventory/{id}` | List ownerships by inventory item |
| Ownership | GET | `/food-ownerships/by-member/{id}` | List ownerships by member |
| Ownership | POST | `/food-ownerships/` | Create ownership |
| Ownership | DELETE | `/food-ownerships/{inv_id}/{mem_id}` | Delete ownership |
| Suggestion | GET | `/households/{household_id}/suggestions` | Get shopping suggestion for a household |
| OFF AU Product | GET | `/off-products-au/search?q=&page=&page_size=` | Search AU products by name (full-field) |
| OFF AU Product | GET | `/off-products-au/by-barcode/{code}` | Get AU product by barcode (all fields) |
| OFF AU Product | GET | `/off-products-au/stats` | Get AU database statistics |
