# FridgePeace Frontend Feature Gap Analysis & Improvement Plan

> **Phase**: Agile development — focus on functional completeness, not optimization.
> **Goal**: Identify all features a Minimum Viable Product (MVP) needs to be usable, and prioritize them for implementation.
> **Cutoff**: Items marked **v2.0** are explicitly out of scope for the current iteration.

---

## Current State

```
Onboarding (Sign Up / Find User → Create / Join Household)
    ↓
Main Screen: [New Food button]
    ├── Empty state: "Your fridge is empty!"
    └── FoodCard list (name, brand, quantity, storage, expiry)
         └── Each card is read-only — no interaction
              ↓
[New Food] → Drawer
    ├── RecentFood (last 5 items, clickable to add more)
    └── NewFood (search → select → FoodDetail form → "Add to fridge")
```

**Core Problem**: The app is a "write-only" system. Users can add food but cannot manage what they've added.

---

## P0: Missing CRUD Operations (Critical — Blocking)

### P0-1: No Way to Delete Inventory Items

**Impact**: If a user adds a wrong item, or finishes a product, they cannot remove it. The item stays in the fridge forever.

**Needed**:
- Delete button/icon on each FoodCard (swipe-to-delete or a trash icon in the corner)
- Confirmation step before deletion (undo-friendly, e.g. "Are you sure?")
- Frontend call to `DELETE /food-inventory/{item_id}` (endpoint exists)
- Optimistic UI removal on success

**Implementation Sketch**:
```jsx
// In FoodCard.jsx
const handleDelete = async () => {
  if (!confirm('Remove this item from your fridge?')) return;
  await axios.delete(`${API}/food-inventory/${item.id}`);
  onDelete?.(item.id); // parent removes from list
};
```

**Files**: `FoodCard.jsx`, `index.jsx` (lift delete handler up), new `useDeleteFood.js` hook

---

### P0-2: No Way to Edit Inventory Items

**Impact**: If a user entered the wrong expiry date, or needs to adjust quantity after eating some, they have no way to correct it.

**Needed**:
- Edit button on each FoodCard (pencil icon)
- Opens a form/modal pre-filled with current values (quantity, unit, storage_location, expiry_date)
- Frontend call to `PUT /food-inventory/{item_id}` (endpoint exists)
- Partial update: user should be able to change only what they need

**Implementation Sketch**:
```jsx
// In FoodCard.jsx
const [editing, setEditing] = useState(false);

if (editing) {
  return <FoodEditForm item={item} onSave={handleUpdate} onCancel={() => setEditing(false)} />;
}
```

**Files**: New `FoodEditForm.jsx` component, `FoodCard.jsx`, `useInventory.js`

---

### P0-3: No Inventory Sort or Filter

**Impact**: As users add more items, the list grows in insertion order with no organization. Finding a specific item requires scrolling through everything. Expiring items are not highlighted.

**Needed**:
- **Sort options**: by name (A-Z), by expiry date (soonest first), by date added (newest first)
- **Filter tabs**: "All", "Fridge", "Freezer", "Pantry" — filter by `storage_location`
- **Expiry warnings**: visual indicator (yellow background ≈7 days, red background ≈2 days, grey for expired)

**Implementation Sketch**:
```jsx
const SORT_OPTIONS = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'expiry', label: 'Expiring Soon' },
  { value: 'recent', label: 'Recently Added' },
];

const sorted = [...inventory].sort((a, b) => {
  if (sortBy === 'name') return a.name.localeCompare(b.name);
  if (sortBy === 'expiry') return new Date(a.expiry_date) - new Date(b.expiry_date);
  return new Date(b.date_added) - new Date(a.date_added);
});
```

**Files**: `index.jsx` (or a new `InventoryList.jsx` component)

---

### P0-4: No Household Code Display

**Impact**: When a user creates a household, they receive no code to share. Other users cannot join because the household ID is hidden.

**Needed**:
- After creating a household, show the household code prominently (e.g. "Share this code: ABC123")
- On the main screen, add a small household info section showing the household name and code
- "Copy to clipboard" button

**Implementation Sketch**:
```jsx
// In Onboarding.jsx, after household creation
const handleCreateHousehold = async () => {
  const result = await addHousehold(member_id, input);
  // result.data.id contains the household code
  setHouseholdCode(result.data.id);
};

// Show: "🏠 Your Household Code: ABC123 — Share this with friends!"
```

**Files**: `Onboarding.jsx`, `index.jsx` (household badge in header)

---

## P1: Feature Gaps (Severe — Recommended This Sprint)

### P1-1: No Header / Navigation Bar

**Impact**: The main screen has no title, no way to know which household you're in, no logout or settings access.

**Needed**:
- App bar with:
  - Household name + code (small, tappable for details)
  - Current member display name
  - Settings/Logout icon (gear or person icon)

**Files**: New `Header.jsx` component, `index.jsx`

---

### P1-2: No RecentFood Click-to-Add Feedback

**Impact**: When clicking a RecentFood item, the UI shows the FoodDetail form for "Add more to existing", but the flow doesn't clearly communicate that it's adding to what's already in the fridge.

**Needed**:
- Show current quantity in the form: "Currently: 2.5 kg. How many more?"
- After adding more, show brief feedback (already done via toast)

**Files**: `RecentFood.jsx`, `FoodDetail.jsx`

---

### P1-3: No Search Result Source Indicators

**Impact**: Search results mix FoodKeeper products and OpenFoodFacts products without clear source badges. Users can't tell which results are USDA-backed recommendations vs crowd-sourced data.

**Needed**:
- Source badge on each search result: "📖 FoodKeeper" or "📷 OpenFoodFacts" or "🏷️ Packaged"
- Small icon or label distinguishing the sources

**Files**: `NewFood.jsx`

---

### P1-4: FoodCard Lacks Expiry Visual Warnings

**Impact**: Expiring food looks identical to fresh food until you read the text. Users may miss items about to go bad.

**Needed**:
- Expired items: grey background, strikethrough text ("Expired 2 days ago")
- Expiring within 2 days: red left border
- Expiring within 7 days: yellow left border
- No expiry set: no special styling, or a subtle "Set expiry" hint

**Implementation Sketch**:
```jsx
const getExpiryStatus = (date) => {
  if (!date) return 'none';
  const days = moment(date, 'YYYY-MM-DD').diff(moment(), 'days');
  if (days < 0) return 'expired';
  if (days <= 2) return 'critical';
  if (days <= 7) return 'warning';
  return 'ok';
};

const borderColor = {
  expired: 'border-l-red-500',
  critical: 'border-l-red-400',
  warning: 'border-l-yellow-400',
  ok: 'border-l-transparent',
  none: 'border-l-gray-200',
};
```

**Files**: `FoodCard.jsx`

---

### P1-5: No OpenFoodFacts Barcode Input

**Impact**: The frontend has OpenFoodFacts search working, but only by text. Barcode scanning is the primary use case for a fridge app — users should be able to type or scan a barcode.

**Needed**:
- Barcode text input in the search area (alongside text search)
- When a 8-13 digit number is entered, auto-search via OpenFoodFacts barcode API
- Button to switch between "text search" and "barcode search" modes

**Files**: `NewFood.jsx`, `useSearch.js`

---

### P1-6: No Loading State for Inventory Refresh

**Impact**: The refresh function sets loading to true, which hides the inventory and shows "Loading inventory..." — this is a good start but the screen goes blank during refresh.

**Needed**:
- Skeleton cards that match FoodCard shape while loading
- Or: keep showing old inventory with a subtle refresh indicator at the top

**Files**: `index.jsx`, new `SkeletonCard.jsx` component

---

### P1-7: Error State for Inventory List

**Impact**: If the backend is down, users see a blank list with no explanation.

**Needed**:
- Show error message: "Could not load inventory. [Retry]"
- Call `refresh()` on retry button click

**Files**: `index.jsx`

---

## P2: Future Iterations (v1.1)

| # | Feature | Description | Backend Ready? |
|---|---------|-------------|----------------|
| 2.1 | **User Profile Page** | Change display name, view username, leave household | Partial (`PUT /users/{id}` exists) |
| 2.2 | **Household Member List** | See all members in the household, their items | Yes (`GET /member/{household_id}/members`) |
| 2.3 | **Event / Activity Log** | See when items were added, consumed, or expired | Yes (`GET /food-events/by-inventory/{id}`) |
| 2.4 | **Multi-Household Support** | Switch between households without logging out | Partial (`GET /member/{user_id}/households`) |
| 2.5 | **Mark as Consumed** | Instead of deleting, mark food as eaten (creates event) | Yes (Event + Delete combined) |
| 2.6 | **Consume / Waste Tracking** | Track how much food was consumed vs wasted over time | Backend needed |
| 2.7 | **Push Notifications** | Alert when food is about to expire | Backend needed |
| 2.8 | **Shopping List** | Generate shopping list from expiring items | Backend needed |
| 2.9 | **Offline Support** | PWA service worker for offline access | No |
| 2.10 | **Camera Barcode Scan** | Use device camera to scan barcodes (WebRTC) | No |

---

## Implementation Priority Summary

| Priority | Item | Files | Effort |
|----------|------|-------|--------|
| **P0-1** | Delete inventory items | `FoodCard.jsx`, `index.jsx`, new `useDeleteFood.js` | ~1h |
| **P0-2** | Edit inventory items | New `FoodEditForm.jsx`, `FoodCard.jsx` | ~1.5h |
| **P0-3** | Sort/filter inventory + expiry warnings | `index.jsx` (or new `InventoryList.jsx`) | ~1.5h |
| **P0-4** | Display/Share household code | `Onboarding.jsx`, `index.jsx`, new `HouseholdBadge.jsx` | ~1h |
| **P1-1** | Header / navigation bar | New `Header.jsx`, `index.jsx` | ~1h |
| **P1-2** | RecentFood add-more clarity | `RecentFood.jsx`, `FoodDetail.jsx` | ~0.5h |
| **P1-3** | Search result source badges | `NewFood.jsx` | ~0.5h |
| **P1-4** | Expiry visual warnings on cards | `FoodCard.jsx` | ~0.5h |
| **P1-5** | Barcode input for OpenFoodFacts | `NewFood.jsx`, `useSearch.js` | ~1h |
| **P1-6** | Skeleton loading for inventory | `index.jsx`, new `SkeletonCard.jsx` | ~0.5h |
| **P1-7** | Inventory error state | `index.jsx` | ~0.5h |
| **P2.x** | All future features | Various | N/A |

---

## Backend Gap Check

Before starting P0/P1 items, verify these backend capabilities:

| Frontend Need | Backend Status | Endpoint |
|---------------|----------------|----------|
| Delete inventory item | ✅ Exists | `DELETE /food-inventory/{item_id}` |
| Update inventory item | ✅ Exists | `PUT /food-inventory/{item_id}` |
| Get single inventory item | ✅ Exists | `GET /food-inventory/{item_id}` |
| Get household members | ✅ Exists | `GET /member/{household_id}/members` |
| Get user's households | ✅ Exists | `GET /member/{user_id}/households` |
| Update user profile | ✅ Exists | `PUT /users/{user_id}` |
| Leave household | ✅ Exists | `POST /member/leave/` |
| Search by barcode | ⚠️ Partial | OpenFoodFacts external API only |
| Events by inventory item | ✅ Exists | `GET /food-events/by-inventory/{id}` |

**All P0 and P1 backend endpoints are already implemented.** The frontend work is pure UI.

---

## Recommended Sprint Plan

### Sprint A (P0 — Must Have)
1. Delete inventory items (P0-1)
2. Edit inventory items (P0-2)
3. Sort/filter/expiry warnings (P0-3)
4. Household code display (P0-4)

### Sprint B (P1 — Should Have)
5. Header/nav bar (P1-1)
6. Expiry visual warnings on FoodCard (P1-4)
7. Barcode input for OpenFoodFacts (P1-5)
8. Skeleton loading + error state (P1-6, P1-7)
9. Search result source badges (P1-3)
10. RecentFood clarity (P1-2)

### Sprint C+ (P2 — Future)
- All P2 items as prioritized by user feedback
