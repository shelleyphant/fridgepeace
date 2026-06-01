# FridgePeace Change Log

> **Scope**: All modifications from backend-frontend integration fixes, search query migration, to frontend usability improvements.
> **Date**: 2026-06-01

---

## Table of Contents

1. [Backend-Frontend Integration Fixes](#1-backend-frontend-integration-fixes)
2. [Search Query Migration (Backend)](#2-search-query-migration-backend)
3. [Frontend Usability Improvements](#3-frontend-usability-improvements)
4. [Files Modified](#4-files-modified)

---

## 1. Backend-Frontend Integration Fixes

### 1.1 `member_id` Identity Crisis (Critical)

**Problem**: Three bugs caused by confusing `member_id` with `household_member_id`.

- `useMembership.js` stored `user.id` as `localStorage.setItem('member_id', ...)`
- However, `food_inventory.added_by_member_id` is a foreign key referencing `household_member.id`, not `user.id`
- This caused all inventory operations to silently fail or return empty results

**Fix**:
- `useHousehold.js`: now stores `household_member_id` separately in localStorage after `/member/join/` response
- `useAddFood.js`: reads `household_member_id` from localStorage instead of `member_id`
- `useInventory.js`: reads `household_member_id` from localStorage instead of `member_id`

### 1.2 Trailing Slash Mismatch

**Problem**: Backend routes `/member/join` and `/member/leave` had no trailing slash, but the frontend called `/member/join/` and `/member/leave/` (with trailing slashes). FastAPI's 301 redirect changed POST to GET, breaking the request body.

**Fix**: Added trailing slashes to the backend route definitions in `routers.py`.

### 1.3 FoodDetail Missing Error UI

**Problem**: `FoodDetail.jsx` had no loading or error state rendering, so API failures were invisible to the user.

**Fix**: Added error message display and loading state handling.

---

## 2. Search Query Migration (Backend)

### 2.1 Motivation

The frontend was importing `foodkeeper.json` (617 KB) directly via JavaScript `import`, which:
- Added 617 KB to the webpack bundle (out of ~1.2 MB total)
- Performed all search filtering client-side with `O(n)` linear scans
- Made it impossible to update FoodKeeper data without rebuilding the frontend

The decision was to migrate this to the backend, treating it like any other data source.

### 2.2 New Database Tables

**`foodkeeper_category`**
| Column | Type | Notes |
|--------|------|-------|
| id | int (PK) | Auto-increment |
| category_name | varchar(255) | e.g. "Dairy", "Vegetables" |

**`foodkeeper_product`**
| Column | Type | Notes |
|--------|------|-------|
| id | int (PK) | Auto-increment |
| category_id | int (FK) | References `foodkeeper_category.id` |
| name | varchar(255) | Product name |
| fridge_days_min/max | int | Recommended fridge storage days |
| freezer_days_min/max | int | Recommended freezer storage days |
| pantry_days_min/max | int | Recommended pantry storage days |

Seeded with **25 categories** and **661 products** from `foodkeeper.json`.

### 2.3 New API Endpoints

#### `GET /foods/search?q=<query>`

Searches both FoodKeeper products and user-created packaged foods by name.

**Response**:
```json
{
  "foodkeeper_results": [
    { "id": 1, "name": "Apple", "category_name": "Fruits",
      "fridge_days_min": 7, "fridge_days_max": 14,
      "freezer_days_min": 120, "freezer_days_max": 365,
      "pantry_days_min": 3, "pantry_days_max": 7 }
  ],
  "packaged_results": [
    { "id": 5, "name": "Organic Apple Juice", "barcode": "930060..." }
  ]
}
```

#### `POST /foods/add-to-inventory`

Unified endpoint that accepts both FoodKeeper and packaged food sources in one call.

**Request**:
```json
{
  "household_id": "ABC123",
  "added_by_member_id": 1,
  "source": "foodkeeper",
  "source_id": 42,
  "storage_location": "fridge",
  "quantity": 2.5,
  "unit": "kg",
  "expiry_date": "2026-06-15"
}
```

**Behavior**:
- `source: "foodkeeper"`: Automatically creates/reuses an `UnpackagedFood` record and creates a `FoodInventory` entry
- `source: "packaged"`: Directly creates a `FoodInventory` entry referencing the existing `PackagedFood`
- Replaces 2-4 round trips that were previously needed from the frontend

#### `GET /households/{household_id}/inventory`

Returns flattened inventory items with food name, brand, image, category, and source type pre-joined.

**Response**:
```json
[
  {
    "id": 1,
    "food_name": "Apple",
    "food_brand": null,
    "food_image": null,
    "food_category": "Fruits",
    "source_type": "foodkeeper",
    "quantity": 2.5,
    "unit": "kg",
    "storage_location": "fridge",
    "expiry_date": "2026-06-15",
    "date_added": "2026-05-30T10:00:00",
    "added_by_member_id": 1
  }
]
```

Replaces 3 separate frontend requests that were manually joining data.

### 2.4 Frontend Hooks Rewritten

#### `useSearch.js`

**Before**: Imported `foodkeeper.json` (617 KB) via webpack `import`, filtered client-side, then fetched OpenFoodFacts separately.

**After**: Calls `GET /foods/search?q=` for local results, still fetches OpenFoodFacts for barcode/brand data. Returns `{ results, loading }` instead of raw array. Bundle size reduced from ~1.2 MB to ~587 KB.

#### `useAddFood.js`

**Before**: Separate code paths for each food source:
- OpenFoodFacts: 2-4 API calls (check existing → create PackagedFood → create FoodInventory)
- FoodKeeper: manual inventory creation

**After**: Unified `POST /foods/add-to-inventory` for FoodKeeper and packaged sources (OpenFoodFacts path preserved for barcode scanning).

#### `useInventory.js`

**Before**: Three separate requests to fetch inventory items, then attempt to join with food names client-side.

**After**: Single `GET /households/{id}/inventory` call that returns fully joined data.

---

## 3. Frontend Usability Improvements

### P0 (Critical — Blocking the User Flow)

#### P0-1: FoodDetail Missing Required Fields

**File**: [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx)

**Before**: Only a `quantity` input field and a raw `JSON.stringify` preview. The backend requires `unit` and `storage_location`, causing 422 errors on every add attempt.

**After**:
- Replaced raw JSON with structured food info card (name, brand, category, recommended storage days)
- Added **Unit** dropdown (`kg`, `g`, `L`, `mL`, `pcs`, `item`)
- Added **Storage Location** toggle buttons (Refrigerator / Freezer / Pantry)
- Added **Expiry Date** date picker (optional)
- Success toast "Added to fridge!" with 800ms auto-close
- Button shows "Add more to existing" when updating existing inventory

#### P0-2: Search Has No Loading Indicator

**Files**: [useSearch.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useSearch.js), [NewFood.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/NewFood.jsx)

**Before**: `useSearch` returned a plain array. During the 400ms debounce delay, the list was blank with no feedback.

**After**: `useSearch` returns `{ results, loading }`. NewFood displays "Searching..." text while loading is true.

#### P0-3: Onboarding "Log In" Misleading

**File**: [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx)

**Before**: The "Log In" button actually just looked up a username via `GET /users/`. If the username wasn't found, it threw an error with no way to go back.

**After**:
- "Log In" → **"Find User"** (honest label)
- Added **"Back"** button on both Sign Up/Find User and Create/Join Household forms
- Error messages now display in red (`text-red-600`)

### P1 (Severe — Recommended for This Sprint)

#### P1-1: No Success/Failure Feedback After Adding Food

**File**: [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx)

**Before**: On success, the drawer closed immediately with no confirmation. On failure, the error was hidden once the drawer closed.

**After**: Shows "Added to fridge!" green toast before auto-closing after 800ms. Errors remain visible in the drawer.

#### P1-2: Empty Inventory Shows Nothing

**File**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: New users completing onboarding saw only a "New Food" button and blank space below.

**After**: Shows "Your fridge is empty! Tap 'New Food' to add your first item." when inventory is empty. Also shows "Loading inventory..." while fetching.

Also fixed the `isSetUp` check to require `household_member_id` (not just `member_id`), preventing a stale-state edge case.

#### P1-3: FoodCard Shows Too Little Info

**File**: [FoodCard.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodCard.jsx)

**Before**: Only showed food name and "Expires X days ago" text.

**After**: Shows:
- Food name (title) + brand (subtitle, if available)
- Quantity badge (e.g. "2.5 kg" in a blue pill)
- Storage location with emoji icons (🧊 Fridge / ❄️ Freezer / 📦 Pantry)
- Expiry countdown or "No expiry set"

#### P1-4: RecentFood Shows Empty Area

**File**: [RecentFood.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/RecentFood.jsx)

**Before**: The RecentFood list area was always rendered, showing nothing when there were no recent items.

**After**: Returns `null` when `recentFoods` is empty, hiding the entire section.

#### P1-5: Update/Add Button Ambiguity

**File**: [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx)

**Before**: Both "add new" and "add more to existing" used the same button text "Add to fridge".

**After**: Button shows **"Add more to existing"** when modifying an existing inventory item (from RecentFood), and **"Add to fridge"** for new items.

---

## 4. Files Modified

### Backend (6 files)

| File | Action | Purpose |
|------|--------|---------|
| `backend/models.py` | Modified | Added `FoodKeeperCategory` and `FoodKeeperProduct` tables |
| `backend/schemas.py` | Modified | Added 6 Pydantic models for search, add-to-inventory, inventory listing |
| `backend/routers.py` | Modified | Added `GET /foods/search`, `POST /foods/add-to-inventory`, `GET /households/{id}/inventory`; fixed trailing slash on `/member/join/` and `/member/leave/` |
| `backend/seed_foodkeeper.py` | Created | Imports 661 products + 25 categories from `foodkeeper.json` into SQLite |
| `backend/main.py` | Modified | Added startup event to auto-seed FoodKeeper data |
| `backend/API_DOCUMENTATION.md` | Modified | Documented all 3 new endpoints |

### Frontend (8 files)

| File | Action | Purpose |
|------|--------|---------|
| `client/hooks/useMembership.js` | Modified | Stores `member_id` (user.id) only |
| `client/hooks/useHousehold.js` | Modified | Now stores `household_member_id` separately from `member_id` |
| `client/hooks/useSearch.js` | Rewritten | Calls backend `GET /foods/search` instead of importing 617KB JSON; returns `{ results, loading }` |
| `client/hooks/useAddFood.js` | Rewritten | Unified `POST /foods/add-to-inventory` for foodkeeper/packaged sources |
| `client/hooks/useInventory.js` | Rewritten | Single `GET /households/{id}/inventory` replaces 3 manual requests |
| `client/components/inventory/FoodDetail.jsx` | Rewritten | Added unit, storage location, expiry date inputs; structured display; success toast; button text disambiguation |
| `client/components/inventory/NewFood.jsx` | Modified | Adapted to `{ results, loading }` return; shows "Searching..." indicator |
| `client/components/inventory/FoodCard.jsx` | Rewritten | Shows brand, quantity badge, storage location icons, expiry info |
| `client/components/inventory/RecentFood.jsx` | Modified | Hidden when empty (returns null) |
| `client/components/Onboarding.jsx` | Modified | "Log In" → "Find User"; added Back buttons; red error text |
| `client/index.jsx` | Modified | Empty inventory hint; loading indicator; strict `isSetUp` check |

### Config / Data (2 files)

| File | Action | Purpose |
|------|--------|---------|
| `backend/foodkeeper.json` | Copied | Copied from `client/source/food-data/` for backend seeding |
| `frontend_improvement_plan.md` | Created | Audit document identifying all frontend issues and priorities |
| `search_migration_plan.md` | Created | Analysis document for the search migration strategy |
| `project_overview.md` | Created | Initial project audit overview |
| `CHANGE_LOG.md` | Created | This document |

---

## Summary

- **3 critical backend-frontend bugs** fixed (member_id confusion, trailing slash, missing error UI)
- **3 new API endpoints** created for search, unified food addition, and pre-joined inventory listing
- **617 KB removed** from frontend bundle by migrating FoodKeeper search to the backend
- **3 frontend hooks** rewritten to use the new backend APIs
- **7 usability issues** fixed in the frontend (3 P0 critical, 5 P1 severe)
- **19 files** modified or created across the full stack
