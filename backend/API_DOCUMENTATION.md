# FridgePeace API Documentation

## Project Overview

FridgePeace is a refrigerator food management system API that supports household management, member management, food inventory tracking (packaged/unpackaged), event logging, and ownership assignment.

## Project Structure

```
backend/
├── main.py           FastAPI entry point, router registration, health check
├── models.py         SQLAlchemy ORM models (7 tables)
├── schemas.py        Pydantic request/response models
├── routers.py        All API endpoint routes
├── requirements.txt  Dependency list
└── API_DOCUMENTATION.md   This file
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
| image_url | VARCHAR(2048) | Product image URL |
| category | VARCHAR(255) | Category (snacks, drinks, etc.) |
| nutrition | TEXT | Nutritional info |

### 4. unpackaged_food

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

### 5. food_inventory (Core Table)

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique inventory ID |
| household_id | INT (FK → household) | Owning household |
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

### 6. food_event

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK, Auto) | Unique event ID |
| inventory_item_id | INT (FK → food_inventory) | Related inventory item |
| member_id | INT (FK → household_member) | Who triggered it |
| event_type | VARCHAR(50) | Event type (added/consumed/expired/moved) |
| date_occurred | DATETIME | When it happened (auto) |

### 7. food_ownership (M:N Relationship)

| Column | Type | Description |
|--------|------|-------------|
| inventory_item_id | INT (FK → food_inventory) | Inventory item |
| member_id | INT (FK → household_member) | Owner member |
| tagged_at | DATETIME | When assigned (auto) |

> **Composite Primary Key**: (inventory_item_id, member_id)

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Cascade delete household** | Deleting a household cascades to its members, inventory, events, and ownerships |
| **Member deletion restricted** | A member with related inventory or events cannot be deleted (RESTRICT) |
| **Packaged/Unpackaged exclusivity** | Each inventory item must be exactly one type |
| **Unique barcode** | Packaged food barcodes must be unique |
| **Composite PK** | Food ownership uses (inventory_item_id, member_id) as composite key |
| **SET NULL on food deletion** | Deleting a food reference sets it to NULL in inventory |

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
    "id": 1,
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
| household_id | int | Household ID |

**Response 200:**
```json
{
  "id": 1,
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

**Response 201:**
```json
{
  "id": 1,
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
| household_id | int | Household ID |

**Request Body:**
```json
{
  "name": "Happy Family v2"
}
```

**Response 200:**
```json
{
  "id": 1,
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
| household_id | int | Household ID |

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
    "household_id": 1,
    "display_name": "Alice"
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
  "household_id": 1,
  "display_name": "Alice"
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
  "household_id": 1,
  "display_name": "Alice"
}
```

**Validation:** `household_id` must reference an existing household (returns 404 if not found).

**Response 201:**
```json
{
  "id": 1,
  "household_id": 1,
  "display_name": "Alice"
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
  "household_id": 1,
  "display_name": "Alice Updated"
}
```

**Validation:** Both `member_id` and `household_id` are checked for existence.

**Response 200:**
```json
{
  "id": 1,
  "household_id": 1,
  "display_name": "Alice Updated"
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

### 3. Packaged Foods

#### 3.1 List All Packaged Foods

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

#### 3.2 Get Single Packaged Food

```
GET /packaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 200:** Same as above

---

#### 3.3 Create Packaged Food

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

#### 3.4 Update Packaged Food

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

#### 3.5 Delete Packaged Food

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

### 4. Unpackaged Foods

#### 4.1 List All Unpackaged Foods

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

#### 4.2 Get Single Unpackaged Food

```
GET /unpackaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 200:** Same as above

---

#### 4.3 Create Unpackaged Food

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

**Validation:** `name` is required

**Response 201:** Returns the complete food info

---

#### 4.4 Update Unpackaged Food

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

#### 4.5 Delete Unpackaged Food

```
DELETE /unpackaged-foods/{food_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| food_id | int | Food ID |

**Response 204:** No content

---

### 5. Food Inventory

#### 5.1 List All Inventory Items

```
GET /food-inventory/
```

**Response 200:**
```json
[
  {
    "id": 1,
    "household_id": 1,
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

#### 5.2 Get Single Inventory Item

```
GET /food-inventory/{item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| item_id | int | Inventory item ID |

**Response 200:** Same as above

---

#### 5.3 Create Inventory Item

```
POST /food-inventory/
```

**Request Body (packaged example):**
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

**Request Body (unpackaged example):**
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

**Validation Rules:**
- `household_id` and `added_by_member_id` must exist (returns 404)
- Exactly one of `packaged_food_id` or `unpackaged_food_id` must be set (returns 400)
- `quantity` and `unit` are required

**Error Codes:**
| Status | Description |
|:------:|-------------|
| 400 | Item must be either packaged or unpackaged (exactly one of packaged_food_id or unpackaged_food_id) |

**Response 201:** Returns the complete inventory info (with auto-generated `date_added` and `date_updated`)

---

#### 5.4 Update Inventory Item

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

#### 5.5 Delete Inventory Item

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

### 6. Food Events

#### 6.1 List All Events

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

#### 6.2 Get Single Event

```
GET /food-events/{event_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| event_id | int | Event ID |

**Response 200:** Same as above

---

#### 6.3 List Events by Inventory Item

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

#### 6.4 Create Event

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

**Common Event Types:**
| Type | Description |
|------|-------------|
| added | Item added |
| consumed | Item consumed |
| expired | Item expired |
| moved | Item moved |

**Validation:** `inventory_item_id` and `member_id` must exist

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

#### 6.5 Delete Event

```
DELETE /food-events/{event_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| event_id | int | Event ID |

**Response 204:** No content

---

### 7. Food Ownerships

#### 7.1 List All Ownerships

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

#### 7.2 List Ownerships by Inventory Item

```
GET /food-ownerships/by-inventory/{inventory_item_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| inventory_item_id | int | Inventory item ID |

**Response 200:** Returns all ownership records for the specified inventory item

---

#### 7.3 List Ownerships by Member

```
GET /food-ownerships/by-member/{member_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| member_id | int | Member ID |

**Response 200:** Returns all ownership records for the specified member

---

#### 7.4 Create Ownership

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

#### 7.5 Delete Ownership

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

## Error Codes Summary

| Status | Meaning | Description |
|:------:|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Deletion succeeded (no response body) |
| 400 | Bad Request | Validation failed (e.g., duplicate barcode, invalid inventory type) |
| 404 | Not Found | Resource does not exist |

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
| Member | GET | `/household-members/` | List all members |
| Member | GET | `/household-members/{id}` | Get single member |
| Member | POST | `/household-members/` | Create member |
| Member | PUT | `/household-members/{id}` | Update member |
| Member | DELETE | `/household-members/{id}` | Delete member |
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
