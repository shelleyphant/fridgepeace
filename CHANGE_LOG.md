# FridgePeace Change Log

> **Date**: 2026-06-01

---


## v0.9 — Ownership Fixes & Sharing Enhancement

### Overview

Fixed core ownership logic defects and completed the full sharing workflow. All food additions now correctly create ownership records (including OpenFoodFacts), the "Mine" filter is based on actual ownership rather than "added by," and users can claim shared food or release ownership in both FoodDetail and FoodEditForm views.

### P0 Fix: "Mine" Filter Uses Ownership

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: The "👤 Mine" filter used `added_by_member_id` — showing items the current user *added*, even if they had released ownership or the item was shared.

**After**: Filter uses `owner_id === currentMemberId`, matching actual ownership. Releasing ownership (Set as shared) immediately removes the item from the "Mine" view, and claiming an item adds it.

```diff
- result = result.filter((i) => i.added_by_member_id === currentMemberId);
+ result = result.filter((i) => i.owner_id === currentMemberId);
```

### P0 Fix: OpenFoodFacts Creates Ownership

**Files modified**: [useAddFood.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useAddFood.js)

**Before**: The OpenFoodFacts (barcode scan / search) path called `POST /food-inventory/` directly, which does not create a `FoodOwnership` record. All items added via this path were permanently "Shared" with no owner.

**After**: Changed to call `POST /foods/add-to-inventory` with `source=packaged`, which automatically creates both a `FoodEvent("added")` and a `FoodOwnership` linking the item to the adding member.

### Feature: Claim Shared Food

**Files modified**: [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx)

**Before**: Only "Set as shared" existed — ownership release was a one-way operation. Shared food could never be claimed by another member.

**After**: Added a green **"Claim as mine"** button in FoodDetail, visible when the viewer is not an owner of the item. Calls `POST /food-ownerships/` to claim ownership, then refreshes the display. The item label changes from green "Shared" to blue "👤 You" immediately.

### Feature: Auto-Claim on Quantity Add

**Files modified**: [useAddFood.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useAddFood.js)

**Before**: `updateFood` only increased the `quantity` field. If the item was Shared or owned by someone else, the added quantity still belonged to the original owner (or no one).

**After**: After updating quantity, `updateFood` now calls `POST /food-ownerships/` to add the current user as an owner. If the user already owns it (HTTP 400), the error is silently ignored — the user now has a claim on the item reflecting their additional contribution.

### Feature: Ownership in FoodEditForm

**Files modified**: [FoodEditForm.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodEditForm.jsx)

**Before**: The Edit form only had quantity, unit, expiry date, and storage location fields — no ownership information or controls.

**After**: Added `OwnerBadge` display at the top (showing "You", "Shared", or another member's name), plus **"Claim as mine"** (green) and **"Set as shared"** (amber) buttons with loading states, matching the functionality in FoodDetail.

### OwnerBadge Visual Polish

**Files modified**: [OwnerBadge.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/OwnerBadge.jsx), [FoodCard.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodCard.jsx), [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx)

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

**Files modified**: [routers.py](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/backend/routers.py), [schemas.py](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/backend/schemas.py)

**Before**: `POST /foods/add-to-inventory` only created an inventory record. `PUT /food-inventory/{id}` updated fields silently. The `FoodEvent` and `FoodOwnership` tables existed with full API endpoints but were never populated by the frontend.

**After**:
- **`add_to_inventory()`** — After creating the inventory record, automatically creates a `FoodEvent(event_type="added")` and a `FoodOwnership` linking the item to the adding member.
- **`update_inventory_item()`** — Detects `storage_location` changes and auto-creates a `FoodEvent(event_type="moved")` when the location differs from the old value.
- **New endpoint** — `GET /food-events/by-inventory/{id}/with-members` returns events joined with `HouseholdMember.display_name` for frontend display.
- **New schema** — `FoodEventWithMemberResponse` extends `FoodEventResponse` with `member_display_name`.

### Frontend: Event Timeline Component

**Files created**: [useFoodEvents.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useFoodEvents.js), [EventTimeline.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/EventTimeline.jsx)

**How it works**:
- `useFoodEvents` hook fetches events for a specific inventory item via the new `/with-members` endpoint.
- `EventTimeline` renders a vertical timeline with icons for each event type (➕ added, ✅ consumed, ⏰ expired, 📦 moved), showing who performed the action and when.
- Integrated into `FoodDetail.jsx` — visible when viewing an existing inventory item (e.g., adding more quantity).

### Frontend: Owner Badge

**Files created**: [OwnerBadge.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/OwnerBadge.jsx), [useFoodOwnership.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useFoodOwnership.js)

**How it works**:
- `OwnerBadge` displays a blue "👤 {name}" badge or gray "Unclaimed" label.
- Shown in `FoodDetail.jsx` for existing inventory items.
- `FoodCard.jsx` has the badge wired up (requires `owner_display_name` field on the inventory item — ready for future schema extension).

### Frontend: "Mine" Filter

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

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

**Files modified**: [useSearch.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useSearch.js), [NewFood.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/NewFood.jsx)

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

**Files modified**: [Drawer.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Drawer.jsx)

**Before**: The Drawer (bottom sheet) had no backdrop/overlay. Users could only close it by dragging the handle bar or pressing the "+" FAB button again.

**After**: Added a `fixed inset-0 bg-black/40` backdrop overlay with fade transition. Clicking the backdrop calls `onClose`. This gives users an intuitive "click outside to dismiss" interaction.

### Form Validation

#### FoodDetail.jsx & FoodEditForm.jsx

**Files modified**: [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx), [FoodEditForm.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodEditForm.jsx)

**Before**: Quantity field accepted empty, zero, or negative values. Expiry date had no bounds checking. Submit button proceeded with invalid data, relying on backend rejection.

**After**:
- **Quantity**: Required field (marked with red `*`). Validates non-empty, must be numeric, must be > 0. Shows red border + inline error message on blur or submit.
- **Expiry Date**: Optional field. If provided, validates as a valid date and rejects dates more than 10 years in the future. Shows red border + inline error on blur or submit.
- **Touch tracking**: Errors only appear after the field is blurred (`onBlur`) or after submit is attempted — pristine fields show no errors.
- **Submit guard**: `handleSubmit` calls `setTouched` on all required fields and aborts if validation fails.

#### Onboarding.jsx

**Files modified**: [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx)

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

**Files modified**: [useInventory.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useInventory.js)

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

**Files created**: [constants.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/constants.js)

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx), [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx), [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx), [FoodEditForm.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodEditForm.jsx), [useInventory.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useInventory.js), [useAddFood.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useAddFood.js), [useDeleteFood.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useDeleteFood.js), [useSearch.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useSearch.js), [useMembership.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useMembership.js), [useHousehold.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useHousehold.js)

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

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: "+ New Food" was a full-width button inside a `fixed bottom-0` bar with border and shadow, occupying 56px of vertical space.

**After**: A `fixed bottom-6 right-6` circular button (`h-14 w-14`) with only "+" icon, following Material Design FAB pattern. Uses `shadow-lg` and `active:scale-95` for press feedback. Content area `pb-24` → `pb-20`.

### Household Management Panel

**Files modified**: [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx)

**Before**: Header showed household code with "copy" link. No way to view household details, switch households, or leave.

**After**: Clicking the household code opens a **bottom sheet panel** (`fixed inset-0 z-30`) with:
- **Household code** display with Copy button
- **Members list** — fetched from `GET /member/{household_id}/members`, shows green indicator dots
- **Switch Household** dropdown — appears only if `GET /member/{user_id}/households` returns more than one household
- **Leave Household** button — two-step confirmation, calls `POST /member/leave/`

### Leave Household Flow

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx), [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx)

**New `handleLeaveHousehold`**: Clears `household_id` and `household_member_id` from localStorage, then resets app to onboarding state (`setReady(false)`) so user can create or join another household.

### Switch Household Flow

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx), [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx)

**New `handleSwitchHousehold`**: Updates `household_id` in localStorage, fetches members from the new household to find and store correct `household_member_id`, then refreshes inventory.

### Logout Confirmation

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

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

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx), [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx), [Drawer.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Drawer.jsx), [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx)

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

**Files modified**: [Button.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Button.jsx), [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx), [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx), [FoodCard.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodCard.jsx), [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx), [FoodEditForm.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodEditForm.jsx), [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx)

**Before**: Raw `<button>` elements had no explicit `text-center` class. While short text like "Edit" or "Save" happened to appear centered, longer text or buttons at full width (`w-full`) appeared left-aligned, creating visual inconsistency.

**After**: Every interactive button component now includes `text-center`:
- **Button.jsx** (base component) — `text-center` added to the primary styled div
- **All raw `<button>` elements** — Logout, Retry, + New Food, Edit, Delete, Confirm, Cancel, Save, storage location toggles, filter tabs, Back, Copy — all include `text-center`

### Onboarding: "Find User" → "Log In"

**Files modified**: [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx)

**Before**: The second option on the welcome screen read "Find User", which was technically accurate (the action queries `GET /users/` to find a user by username) but semantically confusing for end users who expected to see "Log In".

**After**: Changed to **"Log In"**, matching standard authentication terminology. The underlying implementation remains unchanged (username lookup, no password).

### Onboarding: Auto-Skip Household Screen for Returning Users

**Files modified**: [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx)

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

**Files created**: [useDeleteFood.js](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/hooks/useDeleteFood.js)

**Files modified**: [FoodCard.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodCard.jsx), [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: FoodCards were read-only with no delete mechanism. Users could not remove items.

**After**: Each FoodCard shows a **Delete** button → "Confirm" / "Cancel" two-step interaction. Calls `DELETE /food-inventory/{id}` (existing endpoint). List updates optimistically after deletion.

#### P0-2: Edit Inventory Items

**Files created**: [FoodEditForm.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodEditForm.jsx)

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: No way to modify quantity, expiry date, storage location, or unit after adding.

**After**: Each FoodCard has an **Edit** button that opens an inline form pre-filled with current values. Supports editing quantity, unit, storage location, and expiry date. Calls `PUT /food-inventory/{id}` (existing endpoint). List refreshes after save.

#### P0-3: Inventory Sort, Filter, and Expiry Warnings

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx), [FoodCard.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodCard.jsx)

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

**Files created**: [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx)

**Files modified**: [Onboarding.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Onboarding.jsx), [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: After creating a household, the code was hidden in localStorage with no way for users to share it.

**After**:
- **Household creation flow**: Shows large household code with Copy button before navigating to the fridge
- **Header**: Displays household code (click to copy) and current member name
- `localStorage` now stores `member_name` for display

### P1: Feature Enhancements

#### P1-1: Header / Navigation Bar

**Files created**: [Header.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/Header.jsx)

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: Main screen had no title, household info, or logout mechanism.

**After**: Header displays "FridgePeace" title, household code (tappable to copy), member name, and Logout button.

#### P1-2: RecentFood Add-More Clarity

**Files modified**: [FoodDetail.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/FoodDetail.jsx), [RecentFood.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/RecentFood.jsx)

**Before**: Clicking a RecentFood item to "add more" showed the same form as adding new food, with no indication of existing quantity.

**After**: A yellow info banner shows "Currently in fridge: X kg. How many more do you want to add?" RecentFood list also shows current quantity per item.

#### P1-3: Search Source Badges

**Files modified**: [NewFood.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/NewFood.jsx)

**Before**: Search results showed only product names with no source distinction.

**After**: Each result shows a coloured badge:
- 🟢 **FoodKeeper** (green) — USDA database
- 🟣 **Packaged** (purple) — User-created packaged foods
- 🟠 **OpenFoodFacts** (orange) — Crowd-sourced data

#### P1-4: Expiry Visual Warnings on FoodCard

*Implemented as part of P0-3 above.*

#### P1-5: Barcode Input for OpenFoodFacts

**Files modified**: [NewFood.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/NewFood.jsx)

**Before**: Only text-based search was available; no barcode support.

**After**: Inputting an 8, 12, or 13 digit number triggers automatic barcode lookup. Tries backend search first, then falls back to OpenFoodFacts proxy API.

#### P1-6: Skeleton Loading State

**Files created**: [SkeletonCard.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/components/inventory/SkeletonCard.jsx)

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

**Before**: Loading state showed a blank screen.

**After**: Three animated skeleton cards (pulse animation) matching FoodCard dimensions while inventory loads.

#### P1-7: Inventory Error State

**Files modified**: [index.jsx](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/client/index.jsx)

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

See [API_DOCUMENTATION.md](file:///c:/Users/dell/Desktop/ITO5002/fridgepeace/backend/API_DOCUMENTATION.md) for full endpoint details.

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
