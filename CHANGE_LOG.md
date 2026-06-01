# FridgePeace Change Log

> **Date**: 2026-06-01

---

## v1.2 — Storage Recommendation Engine & OFF API Stabilisation

### Overview

This release introduces an intelligent storage recommendation engine that automatically suggests storage locations (fridge/freezer/pantry) and recommended expiry dates when users add food. It leverages the existing FoodKeeper data for precise shelf-life values and falls back to category-based estimations for unlisted items. Also includes stabilisation of the OpenFoodFacts search API.

### P0: Backend Shelf Life Engine

#### Files Created

| File | Purpose |
|------|---------|
| `backend/shelf_life.py` | Shelf-life estimation core. Defines a 15-category mapping dictionary with storage location (fridge/freezer/pantry), min/max days, and unit. Exports three functions: `get_storage_recommendations()`, `compute_recommended_expiry()`, and `get_shelf_life_for_category()`. |

#### How It Works

- **FoodKeeper precision first** — If the item matches a FoodKeeper record with explicit `fridge_days_min` / `fridge_days_max` fields, those exact values are used.
- **Category-based fallback** — For packaged foods without FoodKeeper data, the engine maps the item's `category` to the 15-category lookup table (e.g., `dairy` → 5–21 days fridge; `beverages` → 365–730 days pantry).
- **Return value** — `get_storage_recommendations()` returns `{ storage_location, min_days, max_days, source }` where `source` is either `"foodkeeper"` or `"category_estimate"`.

### P1: Schema Extensions (Backward Compatible)

**File modified**: `backend/schemas.py`

**Before**: `PackagedFoodSearchResponse`, `FoodAddToInventoryResponse`, and `InventoryItemWithNames` had no shelf-life fields.

**After**: All three schemas now include the following optional fields (default `None` — zero breaking changes for existing clients):
- `recommended_storage_location` — Suggested location (`"fridge"`, `"freezer"`, `"pantry"`)
- `recommended_expiry_min` — Earliest recommended expiry date (ISO string)
- `recommended_expiry_max` — Latest recommended expiry date (ISO string)
- `shelf_life_min_days` — Minimum shelf life in days
- `shelf_life_max_days` — Maximum shelf life in days
- `shelf_life_source` — Data source (`"foodkeeper"` or `"category_estimate"`)
- `shelf_life_info` (nested dict) — Contains all recommendation metadata for frontend display

### P2: API Endpoint Enrichment

**File modified**: `backend/routers.py`

Three endpoints updated to compute and return shelf-life data:

| Endpoint | Enrichment |
|----------|-----------|
| `POST /foods/search` packaged results | Each `PackagedFood` result is enriched via `get_storage_recommendations(packaged_category=p.category)` |
| `POST /foods/add-to-inventory` response | After adding to inventory, response includes `recommended_expiry` and `shelf_life_info` computed from FoodKeeper or category estimate |
| `GET /household/{id}/inventory` item list | Each `InventoryItemWithNames` enriched with all 6 shelf-life fields sourced from the item's FoodKeeper data or packaged category |

### P3: Frontend UI Integration

#### FoodDetail.jsx — Smart Add Flow

**File modified**: `client/components/inventory/FoodDetail.jsx`

**Before**: Adding a new food item required the user to manually select storage location and set an expiry date. The form provided no guidance on expected shelf life.

**After** (6 edit areas):
- **Storage auto-preselect** — When `recommended_storage_location` is present, that tab is pre-selected and highlighted with a subtle green ring.
- **Expiry date auto-fill** — The "Best before" date field is pre-populated with `recommended_expiry_max` (the latest safe date), with a small "days from now" label (e.g., "~21 days").
- **Shelf life source badge** — Shows a small badge next to the date: 🗄️ FoodKeeper (blue) or 📊 Estimate (amber).
- **Suggest buttons** — Two buttons ("Use min: X days" / "Use max: Y days") appear above the date picker, letting users override the default.
- **Deviation warning** — If the user picks a date beyond `recommended_expiry_max`, an amber warning appears: "This exceeds the recommended X–Y day shelf life."
- **Expiry → Location sync** — Changing the expiry date re-evaluates the recommended location. Picking a short (<7 day) date auto-selects "Fridge", a long (>90 day) date auto-selects "Pantry".

#### FoodEditForm.jsx — Same Sync Logic

**File modified**: `client/components/inventory/FoodEditForm.jsx`

Same auto-preselect and expiry-location sync logic applied for the edit form (5 edit areas), ensuring consistency between Add and Edit flows.

#### useAddFood.js — Response Data Passthrough

**File modified**: `client/hooks/useAddFood.js`

**Before**: `addFood()` returned `{ success: true }` on completion.

**After**: `addFood()` now returns the full API response `{ data }`, allowing callers to access the returned `recommended_expiry` and `shelf_life_info` fields for display in the UI.

### P4: OpenFoodFacts Search Stabilisation

**File modified**: `client/hooks/useSearch.js`

**Problem**: The OFF v2 API endpoint (`/api/v2/search`) does not honour the `search_terms` filter — it returns the same default products regardless of query. The deprecated `cgi/search.pl` was initially replaced in v1.0 to fix a "not valid JSON" error, but v2 API could not perform actual searching.

**Fix**: Reverted to `cgi/search.pl` with proper parameters:
- `search_simple=1` + `action=process` — Required by the old CGI endpoint for text search
- `sort_by=unique_scans_n` — Sort by popularity
- `json=1` — JSON output format
- `User-Agent: FridgePeace/1.0 (university project)` — Identifies the app to OFF and avoids bot detection

**Rate limit awareness**: OFF enforces 10 search requests/min/IP on `cgi/search.pl`. Brief 503 responses may occur on rapid repeated searches; normal service resumes after ~1 minute. This is documented in the OFF API terms.

### Files Modified (v1.2)

| File | Changes |
|------|---------|
| `backend/shelf_life.py` | **Created** — 15-category shelf life mapping + 3 estimation functions |
| `backend/schemas.py` | Added 7 optional shelf-life fields across 3 schemas |
| `backend/routers.py` | Enriched 3 endpoints with shelf-life computation |
| `client/components/inventory/FoodDetail.jsx` | 6 edit areas: auto-preselect, auto-fill, suggest buttons, deviation warning |
| `client/components/inventory/FoodEditForm.jsx` | 5 edit areas: same auto-preselect + sync logic |
| `client/hooks/useAddFood.js` | Returns full response data instead of `{ success: true }` |
| `client/hooks/useSearch.js` | Reverted to `cgi/search.pl` with corrected parameters; added User-Agent header |

---
## v1.1 — CORS Fix, OFF Proxy & Frontend State Management Refactor

### Overview

This release resolves cross-origin issues in both backend and frontend, and refactors the frontend inventory page from a monolithic component into modular, single-responsibility units with centralized state management.

### P0: CORS & Cross-Origin Fixes

#### P0-1: Backend CORS Middleware

**File modified**: [backend/main.py](./backend/main.py)

**Before**: No CORS middleware configured. The FastAPI backend rejected all cross-origin requests from the frontend dev server (`localhost:4040`), causing API calls to fail silently.

**After**: Added `CORSMiddleware` with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`, and `allow_credentials=True`. All cross-origin requests from any frontend origin are now accepted.

#### P0-2: OpenFoodFacts Proxy for Frontend

**File modified**: [client/hooks/useSearch.js](./client/hooks/useSearch.js)

**Before**: `useSearch.js` sent requests directly to `https://world.openfoodfacts.org/cgi/search.pl` from the browser. Because the frontend is served from `localhost:4040`, browsers block these cross-origin requests, causing OFF search results to always fail.

**After**: The function now dynamically constructs a `proxyPath` based on `window.location.origin` and routes OFF search requests through the webpack dev server proxy at `/off-proxy`. The webpack config rewrites `/off-proxy → /` and proxies to `https://world.openfoodfacts.org`. Error messages now read "OFF proxy returned" instead of "OpenFoodFacts API returned".

**Webpack config** ([webpack.config.js](./webpack.config.js)) — Added dev server proxy rule for `/off-proxy` → `https://world.openfoodfacts.org` with path rewrite and `changeOrigin: true`.

### P1: Frontend State Management Refactor

#### Files Created

| File | Purpose |
|------|---------|
| [useFridgeState.js](./client/hooks/useFridgeState.js) | Centralized reducer (`fridgeReducer`) with actions: `FETCH_START`, `FETCH_SUCCESS`, `FETCH_ERROR`, `OPEN_DRAWER`, `CLOSE_DRAWER`, `EDIT_ITEM`, `CLEAR_EDIT`, `SET_SORT`, `SET_FILTER`, `DELETE_ITEM`. Exports `INITIAL_STATE` and `useFridgeState` hook. |
| [FilterBar.jsx](./client/components/inventory/FilterBar.jsx) | Storage-location filter ("All", "Fridge", "Freezer", "Pantry"). Receives `filterBy` + `onChange` as props. |
| [SortSelector.jsx](./client/components/inventory/SortSelector.jsx) | Sort dropdown ("Recent", "Name", "Expiry"). Receives `sortBy` + `onChange` as props. |
| [InventoryList.jsx](./client/components/inventory/InventoryList.jsx) | Handles all three inventory states: **loading** (skeleton grid), **empty** ("Your fridge is empty!" message), and **populated** (item cards grid). Receives `items`, `loading`, `error` + refresh/edit callbacks. |
| [FloatingAddButton.jsx](./client/components/inventory/FloatingAddButton.jsx) | Sticky floating action button that calls `onOpenDrawer`. |

#### Files Modified

| File | Purpose |
|------|---------|
| [index.jsx](./client/index.jsx) | Replaced direct `useInventory` hook + inline skeleton/card rendering with imports from the 4 new sub-components (`FilterBar`, `SortSelector`, `InventoryList`, `FloatingAddButton`). State logic now flows through `useFridgeState` dispatch instead of local `useState` setters. |

**Before**: `index.jsx` contained ~250 lines of monolithic inventory logic including inline skeleton loaders, food card grid rendering, filter/sort state, drawer open/close, and edit-item state — all managed with individual `useState` hooks.

**After**: `index.jsx` is reduced to orchestration only: it imports `useFridgeState` for centralized state, passes slices of state + dispatch callbacks to the 4 sub-components, which each own a single responsibility. Adding new filter types or sort modes no longer requires touching the main page component.

### P2: Cleanup

- **Empty `api/` directory removed** — Deleted `api/.gitkeep`. The directory served no purpose and caused confusion about the project's backend location.
- **`CHANGE_LOG.md` path sanitization** — Replaced all `file:///c:/Users/...` absolute paths with project-relative `./path/...` links, ensuring the changelog renders correctly on any machine.

---

## v1.0 — Production Hardening: Multi-Owner, Inventory Tracking, Search Stability & Clipboard Fix

### Overview

This release hardens the application for production use. It introduces true multi-owner support (server + client), automatic inventory deduction on consume/expire events, search race-condition elimination, clipboard fallback for non-HTTPS contexts, and a comprehensive set of bug fixes across the data layer.

### Phase 1 — Bug Fixes & Data Integrity

**Bugs Fixed**:

- **`delete_event` missing `db.commit()`** ([routers.py](./backend/routers.py)) — Deleting an event called `db.commit()` only inside the `if event_id` branch but not at the function's end. Events appeared deleted in the API response but were still in the database on reload. Moved `db.commit()` to the end of the success path so it always executes.
- **`FoodEvent.event_type` missing CheckConstraint** ([models.py](./backend/models.py)) — The `event_type` column had no database-level validation. Added `CheckConstraint("event_type IN ('consume', 'expire')")` to reject invalid values at the database level.
- **Foreign keys use `RESTRICT` instead of `CASCADE`** ([models.py](./backend/models.py)) — Deleting an inventory item failed with foreign key violations because `ownership`, `event`, and `food_event` tables used `RESTRICT` on delete. Changed to `CASCADE` so deleting an item cascades to all related records.
- **Storage location comparison mismatch** ([routers.py](./backend/routers.py)) — Filtering by storage location failed for mixed-case input (e.g. "Fridge" vs "fridge"). Normalised comparison to lowercase + strip.
- **Duplicate `requirements.txt`** — Removed the duplicate file at project root; only `backend/requirements.txt` is authoritative.
- **Duplicate `foodkeeper.json`** — Removed from client assets; only `backend/foodkeeper.json` is authoritative.
- **FoodKeeper seed data** ([seed_foodkeeper.py](./backend/seed_foodkeeper.py)) — Fixed field mapping to match updated model schema.

### Phase 2 — Core Feature: Inventory Tracking via Events

**Automatic Inventory Deduction** ([routers.py](./backend/routers.py)):

- **`POST /event/create` with `event_type=consume`** — Deducts `quantity_change` from the referenced inventory item. If the item runs out (quantity ≤ 0), it stays at 0 rather than going negative.
- **`POST /event/create` with `event_type=expire`** — Sets the referenced inventory item's quantity to 0 immediately.
- **`DELETE /event/{event_id}`** — Restores inventory by reversing the quantity change of the deleted event. Only the first ownership record's member is used for reverse calculation; multi-owner reversal is tracked via `owner_ids` for future enhancement.

**Ownership Declaration Optional**:

- **`useAddFood.js`** — `ownerMemberId` parameter is now optional (`null`/`undefined`). When omitted, no ownership record is created, and the item appears as "Shared" in the UI.
- **`FoodDetail.jsx`** — "Claim Ownership" button only appears when `inventoryItem` has no current owner (`owner_id` is null).
- **`FoodEditForm.jsx`** — Removed incorrect hardcoded "You" label; now shows actual owner via `OwnerBadge`.

**Leave Household Flow** ([Header.jsx](./client/components/Header.jsx), [index.jsx](./client/index.jsx)):

- Clicking "Leave Household" now clears all localStorage keys and returns the user to the Onboarding screen. Previously, stale keys caused inconsistent state.

### Phase 3 — Multi-Owner Support & Architecture Refactor

**Backend — Schema & API**:

- **[schemas.py](./backend/schemas.py)** — Added `owner_ids: list[int]` and `owner_display_names: list[str]` to `InventoryItemWithNames`, preserving the legacy single-owner fields for backward compatibility.
- **[routers.py](./backend/routers.py)** — `list_household_inventory` now maps all ownership records into the new array fields (`owner_ids_val`, `owner_display_names_val`).

**Frontend — OwnerBadge Component** ([OwnerBadge.jsx](./client/components/inventory/OwnerBadge.jsx)):

- **New signature**: `ownerNames` prop accepts an array of display names.
- **Empty array** → displays "Shared" badge (green).
- **1–2 owners** → displays names joined by comma (blue).
- **3+ owners** → displays first two names + "+N" overflow count (blue).

**Call sites updated**:
- `FoodCard.jsx` — passes `owner_display_names` with backward-compatible fallback.
- `FoodDetail.jsx` — passes `owner_display_names` from inventory item.
- `FoodEditForm.jsx` — same pattern; removed incorrect "You" hardcode.

**"👤 Mine" Filter** ([index.jsx](./client/index.jsx)):

- **Before**: Used `item.owner_id === currentMemberId` (single owner only).
- **After**: Uses `(item.owner_ids ?? []).includes(currentMemberId)` — matches if the current member is *any* owner of the item.

**Timing Fix — FridgeApp Sub-component** ([index.jsx](./client/index.jsx)):

- Extracted the main fridge UI into a `FridgeApp` component, rendered only after Onboarding completes. This ensures `useInventory()` only mounts when household context exists, eliminating race conditions where the hook fires before localStorage is populated.

### Phase 4 — Search Race-Condition Elimination

**[useSearch.js](./client/hooks/useSearch.js)** — Two independent mechanisms prevent stale search results:

1. **`AbortController`** — Each new search call aborts the previous in-flight request (both axios and `window.fetch`). Aborted requests throw `AbortError` which is silently caught.
2. **Request ID counter** — A monotonically increasing `requestIdRef` is incremented per call. After both local and remote responses arrive, the hook checks `currentRequestId !== requestIdRef.current` and discards results if a newer search has superseded them.

**Open Food Facts API** — Replaced deprecated `cgi/search.pl?json=1` endpoint with modern `api/v2/search`. This fixes the `"<!DOCTYPE html>" is not valid JSON` error.

### Bug Fix: Clipboard in Non-HTTPS Context

**[Header.jsx](./client/components/Header.jsx)** & **[Onboarding.jsx](./client/components/Onboarding.jsx)**:

- The Copy button previously used `navigator.clipboard.writeText()` directly. In non-HTTPS contexts (e.g. preview iframe), this throws `NotAllowedError: Write permission denied`.
- **Fix**: Introduced a two-tier fallback:
  1. `navigator.clipboard.writeText()` with `.catch()` handler.
  2. `document.execCommand('copy')` via a hidden `<textarea>` element.
- If both fail, the error is silently swallowed (console.warn only).

### Files Modified (v1.0)

| File | Changes |
|------|---------|
| `backend/schemas.py` | Added `owner_ids`, `owner_display_names` array fields |
| `backend/routers.py` | `delete_event` commit fix; location normalisation; consume/expire inventory deduction; multi-owner response |
| `backend/models.py` | `event_type` CheckConstraint; FK `RESTRICT` → `CASCADE` |
| `backend/seed_foodkeeper.py` | Fixed field mapping for `external_id` |
| `backend/requirements.txt` | Removed duplicate at project root |
| `backend/foodkeeper.json` | Single authoritative copy in backend |
| `client/index.jsx` | "Mine" filter uses `owner_ids`; `FridgeApp` sub-component extraction; logout → onboarding |
| `client/hooks/useSearch.js` | `AbortController` + Request ID race prevention; OFF v2 API endpoint |
| `client/hooks/useAddFood.js` | `ownerMemberId` optional |
| `client/components/inventory/OwnerBadge.jsx` | Rewritten for array input; "Shared" / overflow display |
| `client/components/inventory/FoodCard.jsx` | Passes `owner_display_names` array |
| `client/components/inventory/FoodDetail.jsx` | Owner array; conditional claim button |
| `client/components/inventory/FoodEditForm.jsx` | Owner array; removed "You" hardcode |
| `client/components/Header.jsx` | Clipboard `execCommand` fallback; leave-household clears state |
| `client/components/Onboarding.jsx` | Clipboard `execCommand` fallback |

---

## v0.9 — Ownership Fixes & Sharing Enhancement

### Overview

Fixed core ownership logic defects and completed the full sharing workflow. All food additions now correctly create ownership records (including OpenFoodFacts), the "Mine" filter is based on actual ownership rather than "added by," and users can claim shared food or release ownership in both FoodDetail and FoodEditForm views.

### P0 Fix: "Mine" Filter Uses Ownership

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: The "👤 Mine" filter used `added_by_member_id` — showing items the current user *added*, even if they had released ownership or the item was shared.

**After**: Filter uses `owner_id === currentMemberId`, matching actual ownership. Releasing ownership (Set as shared) immediately removes the item from the "Mine" view, and claiming an item adds it.

```diff
- result = result.filter((i) => i.added_by_member_id === currentMemberId);
+ result = result.filter((i) => i.owner_id === currentMemberId);
```

### P0 Fix: OpenFoodFacts Creates Ownership

**Files modified**: [useAddFood.js](./client/hooks/useAddFood.js)

**Before**: The OpenFoodFacts (barcode scan / search) path called `POST /food-inventory/` directly, which does not create a `FoodOwnership` record. All items added via this path were permanently "Shared" with no owner.

**After**: Changed to call `POST /foods/add-to-inventory` with `source=packaged`, which automatically creates both a `FoodEvent("added")` and a `FoodOwnership` linking the item to the adding member.

### Feature: Claim Shared Food

**Files modified**: [FoodDetail.jsx](./client/components/inventory/FoodDetail.jsx)

**Before**: Only "Set as shared" existed — ownership release was a one-way operation. Shared food could never be claimed by another member.

**After**: Added a green **"Claim as mine"** button in FoodDetail, visible when the viewer is not an owner of the item. Calls `POST /food-ownerships/` to claim ownership, then refreshes the display. The item label changes from green "Shared" to blue "👤 You" immediately.

### Feature: Auto-Claim on Quantity Add

**Files modified**: [useAddFood.js](./client/hooks/useAddFood.js)

**Before**: `updateFood` only increased the `quantity` field. If the item was Shared or owned by someone else, the added quantity still belonged to the original owner (or no one).

**After**: After updating quantity, `updateFood` now calls `POST /food-ownerships/` to add the current user as an owner. If the user already owns it (HTTP 400), the error is silently ignored — the user now has a claim on the item reflecting their additional contribution.

### Feature: Ownership in FoodEditForm

**Files modified**: [FoodEditForm.jsx](./client/components/inventory/FoodEditForm.jsx)

**Before**: The Edit form only had quantity, unit, expiry date, and storage location fields — no ownership information or controls.

**After**: Added `OwnerBadge` display at the top (showing "You", "Shared", or another member's name), plus **"Claim as mine"** (green) and **"Set as shared"** (amber) buttons with loading states, matching the functionality in FoodDetail.

### OwnerBadge Visual Polish

**Files modified**: [OwnerBadge.jsx](./client/components/inventory/OwnerBadge.jsx), [FoodCard.jsx](./client/components/inventory/FoodCard.jsx), [FoodDetail.jsx](./client/components/inventory/FoodDetail.jsx)

**Before**: OwnerBadge showed blue "👤 {name}" for owned items or gray "Unclaimed" label. FoodCard only displayed the badge conditionally. FoodDetail resolved display name with limited logic.

**After**:
- **OwnerBadge**: No owner → green `bg-emerald-100` **"Shared"** label. Current user → blue "👤 **You**". Other member → blue "👤 {name}".
- **FoodCard**: Badge now always visible on every card — shows "Shared" for unclaimed, "👤 You" for your items, or the owner's name.
- **FoodDetail**: Resolves display name with full logic: current owner → "You", other owner → `inventoryItem.owner_display_name`, no owner → `null` (renders "Shared").

### Modified Files (v0.9)

| File | Changes |
|------|---------|
| `client/index.jsx` | "Mine" filter: `added_by_member_id` → `owner_id` |
| `client/hooks/useAddFood.js` | OpenFoodFacts uses `/foods/add-to-inventory`; `updateFood` auto-claims ownership |
| `client/components/inventory/FoodDetail.jsx` | Added "Claim as mine" button; `ownerDisplayName` resolution logic |
| `client/components/inventory/FoodEditForm.jsx` | Added OwnerBadge + Claim / Set as shared buttons |
| `client/components/inventory/OwnerBadge.jsx` | "Unclaimed" → green "Shared" label |
| `client/components/inventory/FoodCard.jsx` | OwnerBadge always visible (unconditional render) |

---

## v0.8 — Operation History & Food Ownership

### Overview

Integrated the backend's existing `FoodEvent` and `FoodOwnership` modules into the frontend. Every food addition now auto-creates an event log entry and ownership record. Users can view the complete timeline of actions on any food item and filter inventory by "My items."

### Backend: Auto-Create Events & Ownership on Add

**Files modified**: [routers.py](./backend/routers.py), [schemas.py](./backend/schemas.py)

**Before**: `POST /foods/add-to-inventory` only created an inventory record. `PUT /food-inventory/{id}` updated fields silently. The `FoodEvent` and `FoodOwnership` tables existed with full API endpoints but were never populated by the frontend.

**After**:
- **`add_to_inventory()`** — After creating the inventory record, automatically creates a `FoodEvent(event_type="added")` and a `FoodOwnership` linking the item to the adding member.
- **`update_inventory_item()`** — Detects `storage_location` changes and auto-creates a `FoodEvent(event_type="moved")` when the location differs from the old value.
- **New endpoint** — `GET /food-events/by-inventory/{id}/with-members` returns events joined with `HouseholdMember.display_name` for frontend display.
- **New schema** — `FoodEventWithMemberResponse` extends `FoodEventResponse` with `member_display_name`.

### Frontend: Event Timeline Component

**Files created**: [useFoodEvents.js](./client/hooks/useFoodEvents.js), [EventTimeline.jsx](./client/components/inventory/EventTimeline.jsx)

**How it works**:
- `useFoodEvents` hook fetches events for a specific inventory item via the new `/with-members` endpoint.
- `EventTimeline` renders a vertical timeline with icons for each event type (➕ added, ✅ consumed, ⏰ expired, 📦 moved), showing who performed the action and when.
- Integrated into `FoodDetail.jsx` — visible when viewing an existing inventory item (e.g., adding more quantity).

### Frontend: Owner Badge

**Files created**: [OwnerBadge.jsx](./client/components/inventory/OwnerBadge.jsx), [useFoodOwnership.js](./client/hooks/useFoodOwnership.js)

**How it works**:
- `OwnerBadge` displays a blue "👤 {name}" badge or gray "Unclaimed" label.
- Shown in `FoodDetail.jsx` for existing inventory items.
- `FoodCard.jsx` has the badge wired up (requires `owner_display_name` field on the inventory item — ready for future schema extension).

### Frontend: "Mine" Filter

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: Filter options were All / Fridge / Freezer / Pantry — only by storage location.

**After**: Added "👤 Mine" as the second filter option. When selected, only items where `added_by_member_id` matches the current user are shown. This lets users quickly find food they personally added.

### Modified Files (v0.8)

| File | Changes |
|------|---------|
| `backend/routers.py` | Auto-create FoodEvent + FoodOwnership on add; detect storage change on edit; new `/with-members` endpoint |
| `backend/schemas.py` | New `FoodEventWithMemberResponse` schema |
| `client/hooks/useFoodEvents.js` | **Created** — fetch events by inventory item |
| `client/hooks/useFoodOwnership.js` | **Created** — fetch, claim, remove ownership |
| `client/components/inventory/EventTimeline.jsx` | **Created** — vertical timeline UI with event icons |
| `client/components/inventory/OwnerBadge.jsx` | **Created** — owner display badge |
| `client/components/inventory/FoodDetail.jsx` | Integrated EventTimeline + OwnerBadge |
| `client/components/inventory/FoodCard.jsx` | Added OwnerBadge placeholder |
| `client/index.jsx` | Added "👤 Mine" filter option |

---

## v0.7 — Search UX & Form Validation

### Overview

Redesigned the search interaction from real-time (debounced) to explicit button-triggered search, added backdrop dismiss for the drawer, and implemented comprehensive form validation across all data-entry screens.

### Search: Real-Time → Button-Triggered

**Files modified**: [useSearch.js](./client/hooks/useSearch.js), [NewFood.jsx](./client/components/inventory/NewFood.jsx)

**Before**: `useSearch` hook used `useEffect` with a 400ms debounce timer tied to the query string. Every keystroke triggered a backend API call and OpenFoodFacts fetch. Users had no control over when searches fired.

**After**:
- **`useSearch.js`** — Rewritten from reactive (useEffect-based) to imperative (function-based). Exposes `search(query)` and `clear()` functions. Tracks `hasSearched` state for UI differentiation between "no results yet" and "searched but empty".
- **`NewFood.jsx`** — Added a **Search** button alongside the input field. Search only triggers on button click or Enter key press. Added **Clear** link to dismiss results. Added `useRef` + `mousedown` event listener to auto-clear results when clicking outside the search area.

```diff
- const { results, loading } = useSearch(isBarcode(search) ? '' : search);
+ const { results, loading, hasSearched, search: triggerSearch, clear } = useSearch();
+ const searchRef = useRef(null);
```

### Drawer: Backdrop Overlay

**Files modified**: [Drawer.jsx](./client/components/Drawer.jsx)

**Before**: The Drawer (bottom sheet) had no backdrop/overlay. Users could only close it by dragging the handle bar or pressing the "+" FAB button again.

**After**: Added a `fixed inset-0 bg-black/40` backdrop overlay with fade transition. Clicking the backdrop calls `onClose`. This gives users an intuitive "click outside to dismiss" interaction.

### Form Validation

#### FoodDetail.jsx & FoodEditForm.jsx

**Files modified**: [FoodDetail.jsx](./client/components/inventory/FoodDetail.jsx), [FoodEditForm.jsx](./client/components/inventory/FoodEditForm.jsx)

**Before**: Quantity field accepted empty, zero, or negative values. Expiry date had no bounds checking. Submit button proceeded with invalid data, relying on backend rejection.

**After**:
- **Quantity**: Required field (marked with red `*`). Validates non-empty, must be numeric, must be > 0. Shows red border + inline error message on blur or submit.
- **Expiry Date**: Optional field. If provided, validates as a valid date and rejects dates more than 10 years in the future. Shows red border + inline error on blur or submit.
- **Touch tracking**: Errors only appear after the field is blurred (`onBlur`) or after submit is attempted — pristine fields show no errors.
- **Submit guard**: `handleSubmit` calls `setTouched` on all required fields and aborts if validation fails.

#### Onboarding.jsx

**Files modified**: [Onboarding.jsx](./client/components/Onboarding.jsx)

**Before**: Username, household name, and household code inputs accepted empty or single-character values. Backend errors appeared but no client-side pre-validation.

**After**:
- **Username** (Sign Up / Log In): Required, minimum 2 characters.
- **Household name** (Create): Required, minimum 2 characters.
- **Household code** (Join): Required, non-empty.
- All fields show red border + error message on blur or submit. Submit blocked until validation passes.

### Modified Files (v0.7)

| File | Changes |
|------|---------|
| `client/hooks/useSearch.js` | Rewritten: reactive → imperative (`search()`, `clear()`, `hasSearched`) |
| `client/components/inventory/NewFood.jsx` | Search button, Enter key, Clear link, click-outside-to-dismiss |
| `client/components/Drawer.jsx` | Added backdrop overlay (`bg-black/40`) with `onClick={onClose}` |
| `client/components/inventory/FoodDetail.jsx` | Quantity + expiry validation, `touched` state, error indicators |
| `client/components/inventory/FoodEditForm.jsx` | Quantity + expiry validation, `touched` state, error indicators |
| `client/components/Onboarding.jsx` | Username, household name, household code validation |

---

## v0.6 — Basic Functionality Fixes: Shared Inventory & Code Quality

### Overview

Fixed a critical bug where household members couldn't see each other's food items, and extracted all hardcoded API URL and localStorage key references into a shared constant file. This is a foundational refactor to ensure basic "shared kitchen" functionality works before adding more features.

### P0 Bug: Shared Inventory Visibility

**Files modified**: [useInventory.js](./client/hooks/useInventory.js)

**Problem**: The `useInventory` hook filtered inventory items by `added_by_member_id`, so each member could only see food they personally added — defeating the purpose of a shared household inventory.

**Fix**: Removed the `.filter((item) => item.added_by_member_id === memberId)` line. All household members now see the complete shared inventory.

```diff
- const items = data
-   .filter((item) => item.added_by_member_id === memberId)
-   .map((item) => ({ ...item, name: item.food_name ?? 'Unknown' }));
+ const items = data.map((item) => ({
+   ...item,
+   name: item.food_name ?? 'Unknown',
+ }));
```

### Code Quality: Constants Extraction

**Files created**: [constants.js](./client/constants.js)

**Files modified**: [index.jsx](./client/index.jsx), [Header.jsx](./client/components/Header.jsx), [Onboarding.jsx](./client/components/Onboarding.jsx), [FoodEditForm.jsx](./client/components/inventory/FoodEditForm.jsx), [useInventory.js](./client/hooks/useInventory.js), [useAddFood.js](./client/hooks/useAddFood.js), [useDeleteFood.js](./client/hooks/useDeleteFood.js), [useSearch.js](./client/hooks/useSearch.js), [useMembership.js](./client/hooks/useMembership.js), [useHousehold.js](./client/hooks/useHousehold.js)

**Problem**: `process.env.API_URL` and localStorage key strings were duplicated across 10+ files, making the codebase fragile and hard to maintain.

**Fix**: Created `client/constants.js` as the single source of truth:

```javascript
export const API_URL = process.env.API_URL ?? '';

export const STORAGE_KEYS = {
  MEMBER_ID: 'member_id',
  MEMBER_NAME: 'member_name',
  HOUSEHOLD_ID: 'household_id',
  HOUSEHOLD_MEMBER_ID: 'household_member_id',
};
```

All 10 existing files updated to import and use these constants. No functional changes.

### What Was NOT Changed (by design)

- **`NewFood.jsx`** — Contains barcode-related logic only; excluded per scope decision.
- **Backend code** — No backend changes in this version.
- **UI/UX styling** — Only functional bug fixes and code quality improvements.

### Modified Files (v0.6)

| File | Changes |
|------|---------|
| `client/constants.js` | **Created** — API_URL and STORAGE_KEYS constants |
| `client/hooks/useInventory.js` | Removed `added_by_member_id` filter; imported constants |
| `client/index.jsx` | Imported constants; replaced all hardcoded keys |
| `client/components/Header.jsx` | Imported API_URL; replaced hardcoded references |
| `client/components/Onboarding.jsx` | Imported constants; replaced all hardcoded keys |
| `client/components/inventory/FoodEditForm.jsx` | Imported API_URL; replaced hardcoded reference |
| `client/hooks/useAddFood.js` | Imported constants; replaced all hardcoded keys |
| `client/hooks/useDeleteFood.js` | Imported API_URL; replaced hardcoded reference |
| `client/hooks/useSearch.js` | Imported API_URL; replaced hardcoded references |
| `client/hooks/useMembership.js` | Imported constants; replaced all hardcoded keys |
| `client/hooks/useHousehold.js` | Imported constants; replaced all hardcoded keys |

---

## v0.5 — UX Improvements: FAB Button & Household Management

### Overview

Replaced the fixed bottom bar with a compact floating action button (FAB), added a household management panel with member listing, household switching, and leave household functionality, and added logout confirmation.

### FAB: Bottom Bar → Floating Action Button

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: "+ New Food" was a full-width button inside a `fixed bottom-0` bar with border and shadow, occupying 56px of vertical space.

**After**: A `fixed bottom-6 right-6` circular button (`h-14 w-14`) with only "+" icon, following Material Design FAB pattern. Uses `shadow-lg` and `active:scale-95` for press feedback. Content area `pb-24` → `pb-20`.

### Household Management Panel

**Files modified**: [Header.jsx](./client/components/Header.jsx)

**Before**: Header showed household code with "copy" link. No way to view household details, switch households, or leave.

**After**: Clicking the household code opens a **bottom sheet panel** (`fixed inset-0 z-30`) with:
- **Household code** display with Copy button
- **Members list** — fetched from `GET /member/{household_id}/members`, shows green indicator dots
- **Switch Household** dropdown — appears only if `GET /member/{user_id}/households` returns more than one household
- **Leave Household** button — two-step confirmation, calls `POST /member/leave/`

### Leave Household Flow

**Files modified**: [index.jsx](./client/index.jsx), [Header.jsx](./client/components/Header.jsx)

**New `handleLeaveHousehold`**: Clears `household_id` and `household_member_id` from localStorage, then resets app to onboarding state (`setReady(false)`) so user can create or join another household.

### Switch Household Flow

**Files modified**: [index.jsx](./client/index.jsx), [Header.jsx](./client/components/Header.jsx)

**New `handleSwitchHousehold`**: Updates `household_id` in localStorage, fetches members from the new household to find and store correct `household_member_id`, then refreshes inventory.

### Logout Confirmation

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: `handleLogout` called `localStorage.clear()` immediately with no warning.

**After**: Added `window.confirm('Logout and clear local data?')` before clearing.

### Modified Files (v0.5)

| File | Changes |
|------|---------|
| `client/index.jsx` | FAB button, `pb-20`, added `axios` import + `API` constant, `handleLeaveHousehold`, `handleSwitchHousehold`, logout confirmation, pass `userId`/`onLeaveHousehold`/`onSwitchHousehold` to Header, updated empty state text |
| `client/components/Header.jsx` | Added household management bottom sheet panel with members list, household switcher, and leave household flow |

---

## v0.4 — Mobile-First Vertical Layout & Onboarding Refinements

### Overview

Restructured the entire UI for mobile-first vertical layout. The toolbar was split into discrete rows, a fixed bottom action bar was added for thumb-friendly access, and the onboarding flow was streamlined to auto-skip household selection for returning users.

### Layout: Mobile-First Vertical Stack

**Files modified**: [index.jsx](./client/index.jsx), [Header.jsx](./client/components/Header.jsx), [Drawer.jsx](./client/components/Drawer.jsx), [Onboarding.jsx](./client/components/Onboarding.jsx)

**Before**: "New Food" button, sort dropdown, and filter tabs were crammed into a single horizontal row. On narrow mobile screens, controls overlapped and felt cluttered. The Drawer used `absolute` positioning (relative to the content container), so it could break on scroll. The Header was spacious (`text-2xl`, `py-1.5`), consuming precious vertical space.

**After**:
- **Vertical stack order**: Header → Filters (wrapping row) → Sort (right-aligned) → Content → Drawer
- **Fixed bottom bar**: "+ New Food" button is now a `fixed bottom-0` full-width bar with `z-10`, always accessible without scrolling. Content area has `pb-24` to prevent overlap.
- **Drawer**: Changed from `absolute` to `fixed` with `z-20`, ensuring it always overlays all content including the bottom bar.
- **Compact Header**: Title reduced to `text-xl`, all font sizes tightened (`text-xs` for details), button padding reduced (`px-3 py-1`), text truncation for long household codes.
- **Onboarding centering**: All screens use `min-h-screen flex flex-col justify-center` for proper vertical center alignment on mobile.

```diff
- <div className="flex items-center justify-between mb-3">
-   <Button title="New Food" ... />
-   <select sortBy ... />
- </div>
- <div className="flex gap-1 mb-3">[All | Fridge | Freezer | Pantry]</div>
+ <div className="mb-3"><div className="flex flex-wrap gap-1">[All | Fridge | Freezer | Pantry]</div></div>
+ <div className="mb-3 flex justify-end"><select sortBy ... /></div>
+ <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white px-4 py-3 shadow">+ New Food</div>
```

### Button Text Alignment

**Files modified**: [Button.jsx](./client/components/Button.jsx), [Header.jsx](./client/components/Header.jsx), [index.jsx](./client/index.jsx), [FoodCard.jsx](./client/components/inventory/FoodCard.jsx), [FoodDetail.jsx](./client/components/inventory/FoodDetail.jsx), [FoodEditForm.jsx](./client/components/inventory/FoodEditForm.jsx), [Onboarding.jsx](./client/components/Onboarding.jsx)

**Before**: Raw `<button>` elements had no explicit `text-center` class. While short text like "Edit" or "Save" happened to appear centered, longer text or buttons at full width (`w-full`) appeared left-aligned, creating visual inconsistency.

**After**: Every interactive button component now includes `text-center`:
- **Button.jsx** (base component) — `text-center` added to the primary styled div
- **All raw `<button>` elements** — Logout, Retry, + New Food, Edit, Delete, Confirm, Cancel, Save, storage location toggles, filter tabs, Back, Copy — all include `text-center`

### Onboarding: "Find User" → "Log In"

**Files modified**: [Onboarding.jsx](./client/components/Onboarding.jsx)

**Before**: The second option on the welcome screen read "Find User", which was technically accurate (the action queries `GET /users/` to find a user by username) but semantically confusing for end users who expected to see "Log In".

**After**: Changed to **"Log In"**, matching standard authentication terminology. The underlying implementation remains unchanged (username lookup, no password).

### Onboarding: Auto-Skip Household Screen for Returning Users

**Files modified**: [Onboarding.jsx](./client/components/Onboarding.jsx)

**Before**: After any sign-up or log-in, users were always shown the "Create a Household / Join a Household" screen — even if they already belonged to a household. This forced returning users through an unnecessary extra step every time.

**After**: The `handleMembership` function now calls `GET /member/{user_id}/households` immediately after authentication:
- If the user has **one or more** household memberships, it auto-selects the first household, stores `household_id` and `household_member_id` in `localStorage`, and calls `onComplete()` — bypassing the household selection screen entirely.
- If the user has **no** households, the existing flow is preserved (show Create/Join buttons).
- Requires a new `axios` import in Onboarding.jsx.

```js
// After successful login/signup
const { data: households } = await axios.get(`/member/${userId}/households`);
if (households.length > 0) {
  const household = households[0];
  localStorage.setItem('household_id', household.id);
  // Also fetches household_member_id for inventory queries
  const { data: members } = await axios.get(`/member/${household.id}/members`);
  const myMembership = members.find(m => String(m.user_id) === String(userId));
  localStorage.setItem('household_member_id', String(myMembership.id));
  onComplete();  // Skip directly to main app
  return;
}
```

### Modified Files (v0.4)

| File | Changes |
|------|---------|
| `client/index.jsx` | Vertical stack layout, fixed bottom bar, `pb-24`, removed `Button` import |
| `client/components/Header.jsx` | Compact sizing (`text-xl`, `text-xs`, `px-3 py-1`, truncation) |
| `client/components/Drawer.jsx` | `absolute` → `fixed`, added `z-20` and `right-0` |
| `client/components/Onboarding.jsx` | Full-screen vertical centering, "Log In" label, auto-skip household, `text-center` on Back/Copy |
| `client/components/Button.jsx` | Added `text-center` |
| `client/components/inventory/FoodCard.jsx` | `text-center` on Edit/Delete/Confirm/Cancel |
| `client/components/inventory/FoodDetail.jsx` | `text-center` on storage toggles and submit button |
| `client/components/inventory/FoodEditForm.jsx` | `text-center` on storage toggles and Save/Cancel |

---

## v0.3 — Frontend Feature Gap Implementation

### Overview

Frontend was a "write-only" system — users could add food but had no way to manage it. This version adds full CRUD operations, inventory sorting/filtering, expiry warnings, household code sharing, and various usability enhancements.

### P0: Missing CRUD Operations (Critical)

#### P0-1: Delete Inventory Items

**Files created**: [useDeleteFood.js](./client/hooks/useDeleteFood.js)

**Files modified**: [FoodCard.jsx](./client/components/inventory/FoodCard.jsx), [index.jsx](./client/index.jsx)

**Before**: FoodCards were read-only with no delete mechanism. Users could not remove items.

**After**: Each FoodCard shows a **Delete** button → "Confirm" / "Cancel" two-step interaction. Calls `DELETE /food-inventory/{id}` (existing endpoint). List updates optimistically after deletion.

#### P0-2: Edit Inventory Items

**Files created**: [FoodEditForm.jsx](./client/components/inventory/FoodEditForm.jsx)

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: No way to modify quantity, expiry date, storage location, or unit after adding.

**After**: Each FoodCard has an **Edit** button that opens an inline form pre-filled with current values. Supports editing quantity, unit, storage location, and expiry date. Calls `PUT /food-inventory/{id}` (existing endpoint). List refreshes after save.

#### P0-3: Inventory Sort, Filter, and Expiry Warnings

**Files modified**: [index.jsx](./client/index.jsx), [FoodCard.jsx](./client/components/inventory/FoodCard.jsx)

**Before**: Inventory displayed in insertion order with no organization. Expiring food looked identical to fresh food.

**After**:
- **Sort**: Dropdown with "Recently Added", "Name A–Z", "Expiring Soon"
- **Filter**: Tab bar with "All", "🧊 Fridge", "❄️ Freezer", "📦 Pantry"
- **Expiry visual status** (left border):
  - **Expired** → Red border + grey background
  - **≤2 days** → Red border
  - **≤7 days** → Yellow border
  - **OK** → Green border
  - **No expiry** → Grey border

#### P0-4: Household Code Display

**Files created**: [Header.jsx](./client/components/Header.jsx)

**Files modified**: [Onboarding.jsx](./client/components/Onboarding.jsx), [index.jsx](./client/index.jsx)

**Before**: After creating a household, the code was hidden in localStorage with no way for users to share it.

**After**:
- **Household creation flow**: Shows large household code with Copy button before navigating to the fridge
- **Header**: Displays household code (click to copy) and current member name
- `localStorage` now stores `member_name` for display

### P1: Feature Enhancements

#### P1-1: Header / Navigation Bar

**Files created**: [Header.jsx](./client/components/Header.jsx)

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: Main screen had no title, household info, or logout mechanism.

**After**: Header displays "FridgePeace" title, household code (tappable to copy), member name, and Logout button.

#### P1-2: RecentFood Add-More Clarity

**Files modified**: [FoodDetail.jsx](./client/components/inventory/FoodDetail.jsx), [RecentFood.jsx](./client/components/inventory/RecentFood.jsx)

**Before**: Clicking a RecentFood item to "add more" showed the same form as adding new food, with no indication of existing quantity.

**After**: A yellow info banner shows "Currently in fridge: X kg. How many more do you want to add?" RecentFood list also shows current quantity per item.

#### P1-3: Search Source Badges

**Files modified**: [NewFood.jsx](./client/components/inventory/NewFood.jsx)

**Before**: Search results showed only product names with no source distinction.

**After**: Each result shows a coloured badge:
- 🟢 **FoodKeeper** (green) — USDA database
- 🟣 **Packaged** (purple) — User-created packaged foods
- 🟠 **OpenFoodFacts** (orange) — Crowd-sourced data

#### P1-4: Expiry Visual Warnings on FoodCard

*Implemented as part of P0-3 above.*

#### P1-5: Barcode Input for OpenFoodFacts

**Files modified**: [NewFood.jsx](./client/components/inventory/NewFood.jsx)

**Before**: Only text-based search was available; no barcode support.

**After**: Inputting an 8, 12, or 13 digit number triggers automatic barcode lookup. Tries backend search first, then falls back to OpenFoodFacts proxy API.

#### P1-6: Skeleton Loading State

**Files created**: [SkeletonCard.jsx](./client/components/inventory/SkeletonCard.jsx)

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: Loading state showed a blank screen.

**After**: Three animated skeleton cards (pulse animation) matching FoodCard dimensions while inventory loads.

#### P1-7: Inventory Error State

**Files modified**: [index.jsx](./client/index.jsx)

**Before**: Backend failures resulted in a blank list with no explanation.

**After**: Shows "Could not load inventory." with a **Retry** button that calls `refresh()`.

### New Files (v0.3)

| File | Purpose |
|------|---------|
| `client/hooks/useDeleteFood.js` | Delete inventory item hook |
| `client/components/Header.jsx` | Top navigation bar |
| `client/components/inventory/FoodEditForm.jsx` | Inline edit form for inventory items |
| `client/components/inventory/SkeletonCard.jsx` | Skeleton loading placeholder |

### Modified Files (v0.3)

| File | Changes |
|------|---------|
| `client/index.jsx` | Header integration, sort/filter, delete/edit handlers, skeleton loading, error state |
| `client/components/inventory/FoodCard.jsx` | Delete/Edit buttons, expiry visual border colours |
| `client/components/inventory/FoodDetail.jsx` | "Currently in fridge" banner for add-more |
| `client/components/inventory/NewFood.jsx` | Source badges, barcode detection, dual lookup |
| `client/components/inventory/RecentFood.jsx` | Quantity display per item, section label |
| `client/components/Onboarding.jsx` | Household code display screen, `member_name` storage |

---

## v0.2 — Backend Search Migration & Integration Fixes

### Overview

Migrated 617 KB of FoodKeeper data from the frontend bundle to the backend database, added unified search and inventory APIs, and fixed critical backend-frontend integration bugs.

### Backend Changes

See [API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md) for full endpoint details.

- **New DB tables**: `foodkeeper_category` (25 rows) and `foodkeeper_product` (661 rows) seeded from `foodkeeper.json`
- **New endpoints**: Food search, unified add-to-inventory, flattened household inventory listing
- **Bug fix**: Added trailing slashes to `/member/join/` and `/member/leave/` routes to prevent FastAPI 301 redirects
- **Files**: `models.py`, `schemas.py`, `routers.py`, `main.py`, `seed_foodkeeper.py`, `API_DOCUMENTATION.md`

### Frontend Changes

#### `useSearch.js` — Rewritten

**Before**: Imported `foodkeeper.json` (617 KB) via webpack `import`, filtered client-side with O(n) linear scan, then fetched OpenFoodFacts separately. Returned a plain array.

**After**: Calls `GET /foods/search?q=` for FoodKeeper + PackagedFood results from backend. Still fetches OpenFoodFacts for barcode/brand data. Returns `{ results, loading }` object instead of raw array. Bundle size reduced from ~1.2 MB to ~587 KB.

#### `useAddFood.js` — Rewritten

**Before**: Separate code paths per food source — OpenFoodFacts required 2–4 API calls (check existing → create PackagedFood → create FoodInventory), FoodKeeper used manual inventory creation.

**After**: Unified `POST /foods/add-to-inventory` for FoodKeeper and packaged sources. OpenFoodFacts path preserved for barcode scanning flow. `updateFood()` kept for adding quantity to existing inventory items.

#### `useInventory.js` — Rewritten

**Before**: Made 3 separate requests to fetch `food_inventory` → `packaged_food` / `unpackaged_food`, then manually joined data client-side.

**After**: Single `GET /households/{household_id}/inventory` call returning fully joined data with `food_name`, `food_brand`, `food_category`, `source_type` pre-populated. Filters items by current member's `household_member_id`.

#### `useHousehold.js` — Fixed `member_id` / `household_member_id` Confusion

**Before**: Only stored `member_id` (which was `user.id`). Inventory queries used this value to filter `added_by_member_id`, which references `household_member.id` — causing all queries to return empty results.

**After**: Now stores `household_member_id` separately via `localStorage.setItem('household_member_id', ...)` after each `/member/join/` response. `useAddFood` and `useInventory` both read from the correct key.

#### `FoodDetail.jsx` — Rewritten

**Before**: Only had a `quantity` input field and a raw `JSON.stringify` preview. Missing `unit` and `storage_location` fields caused 422 errors on every add attempt. No success or error feedback.

**After**:
- Structured food info card showing name, brand, category, and USDA recommended storage days
- **Unit** dropdown: `kg`, `g`, `L`, `mL`, `pcs`, `item`
- **Storage Location** toggle buttons: Refrigerator / Freezer / Pantry
- **Expiry Date** date picker (optional)
- Green success toast "Added to fridge!" with 800ms auto-close
- Button shows "Add more to existing" when updating vs "Add to fridge" for new items

#### `FoodCard.jsx` — Rewritten

**Before**: Displayed only food name and "Expires X days ago" text with no visual structure.

**After**:
- Food name (title) + brand (subtitle, if available)
- Quantity badge (e.g. "2.5 kg" in a blue pill)
- Storage location with emoji icons (🧊 Fridge / ❄️ Freezer / 📦 Pantry)
- Expiry countdown or "No expiry set" fallback

#### `Onboarding.jsx` — Modified

**Before**: "Log In" button misleadingly only looked up username via `GET /users/`. No Back navigation — if username wasn't found, the app was stuck on the error screen. Error text had no visible colour.

**After**:
- "Log In" → **"Find User"** (accurate label)
- **Back buttons** on both Sign Up / Find User and Create / Join Household forms, with error reset logic
- Error messages now render in red (`text-red-600` class)

#### `index.jsx` — Modified

**Before**: New users completing onboarding saw only a "New Food" button and blank space. `isSetUp` only checked `member_id`, missing `household_member_id` edge case.

**After**: Shows "Your fridge is empty! Tap 'New Food' to add your first item." when inventory is empty. Shows "Loading inventory..." while fetching. `isSetUp` now requires `household_member_id` in addition to `member_id` and `household_id`.

#### `NewFood.jsx` — Modified

**Before**: Directly used `useSearch` return value as an array, with no loading awareness.

**After**: Adapted to `{ results, loading }` destructured return. Shows "Searching..." text during debounce/API wait.

#### `RecentFood.jsx` — Modified

**Before**: Always rendered the RecentFood list area, showing nothing when empty.

**After**: Returns `null` when `recentFoods.length === 0`, hiding the entire section.

### Files Created (v0.2)

| File | Purpose |
|------|---------|
| `backend/seed_foodkeeper.py` | Imports FoodKeeper data from JSON to SQLite |
| `backend/foodkeeper.json` | Copied from client source data for backend seeding |

### Files Modified (v0.2)

| File | Purpose |
|------|---------|
| `backend/models.py` | Added `FoodKeeperCategory` and `FoodKeeperProduct` tables |
| `backend/schemas.py` | Added 6 Pydantic models for search, add-to-inventory, inventory listing |
| `backend/routers.py` | Added 3 endpoints; fixed trailing slash bug |
| `backend/main.py` | Added startup event for FoodKeeper seeding |
| `backend/API_DOCUMENTATION.md` | Documented all new endpoints |
| `client/hooks/useSearch.js` | Backend API call instead of local JSON import |
| `client/hooks/useAddFood.js` | Unified add-to-inventory endpoint |
| `client/hooks/useInventory.js` | Single flattened inventory endpoint |
| `client/hooks/useHousehold.js` | Fixed member_id/household_member_id |
| `client/components/inventory/FoodDetail.jsx` | Complete form rewrite with unit/storage/expiry inputs |
| `client/components/inventory/FoodCard.jsx` | Rich card display with brand, quantity badge, icons |
| `client/components/inventory/NewFood.jsx` | Loading state support |
| `client/components/inventory/RecentFood.jsx` | Empty state handling |
| `client/components/Onboarding.jsx` | Button labels, back navigation, red error text |
| `client/index.jsx` | Empty state, loading indicator, strict setup check |

---
