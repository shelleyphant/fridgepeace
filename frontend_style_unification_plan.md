# Frontend Style Unification Plan

## Current State

The project uses **Tailwind CSS v4** with a custom `water` color palette and two font families defined in `main.css`. However, components apply styles inconsistently — there are **5+ button variants**, **3+ input styles**, and multiple color tokens for the same semantic role (primary, danger, etc.).

---

## 1. Design Tokens (Define Once)

Define these in `main.css` under the `@theme` block. Some already exist but are unused.

| Token | Current Value | Usage | Status |
|-------|---------------|-------|--------|
| `--color-primary-500` | `#4b7bc5` (water-600) | Primary buttons, active toggles | Missing |
| `--color-primary-700` | `#4169b4` (water-700) | Hover state for primary | Missing |
| `--color-danger-500` | `#ef4444` (red-500) | Delete buttons, error text | Missing |
| `--color-danger-100` | `#fee2e2` (red-100) | Error background | Missing |
| `--color-surface` | `#ffffff` | Card/container background | Missing |
| `--color-muted` | `#f9fafb` (gray-50) | Section background | Missing |
| `--font-sans` | `'Noto Sans', sans-serif` | Body text | Exists as `--font-noto` |
| `--radius-btn` | `9999px` (rounded-full) | All buttons | Missing |
| `--radius-card` | `1.5rem` (rounded-3xl) | Cards and containers | Missing |
| `--shadow-card` | `0 0 12px rgba(0,0,0,0.25)` | Card shadows | Exists as `--shadow` |

**Recommendation**: Add the missing tokens and use them across components rather than hardcoding Tailwind utility classes.

---

## 2. Button System — 5 Current Variants vs 3 Unified

### Current Inconsistencies

| Location | Classes | Shape | Color |
|----------|---------|-------|-------|
| `Button.jsx` | `bg-water-800 rounded-4xl px-6 py-2 text-white` | pill | water-800 |
| `FoodDetail` submit | `rounded bg-blue-500 px-4 py-2 text-white` | rounded | blue-500 |
| `FoodEditForm` save | `rounded bg-blue-500 px-4 py-2 text-white` | rounded | blue-500 |
| `index.jsx` filter active | `bg-blue-500 text-white border-blue-500` | rounded | blue-500 |
| Storage toggle active | `bg-blue-500 text-white border-blue-500` | rounded | blue-500 |
| Header Logout | `rounded bg-gray-100 px-3 py-1 text-sm` | rounded | gray-100 |
| FoodCard Edit/Delete | `rounded bg-gray-100 px-3 py-1 text-xs` | rounded | gray-100 |
| FoodCard Confirm | `rounded bg-red-500 px-3 py-1 text-xs text-white` | rounded | red-500 |
| FoodCard Cancel | `rounded bg-gray-200 px-3 py-1 text-xs` | rounded | gray-200 |
| Onboarding Back | `text-sm text-gray-500 underline` | none (link) | gray-500 |
| Copy (household code) | `rounded bg-blue-500 px-4 py-3 text-sm text-white` | rounded | blue-500 |

### Proposed: 3 Button Variants

```jsx
// Variant 1: Primary (pill shape, water-600 bg)
<button className="rounded-full bg-water-600 px-6 py-2 text-white text-sm font-medium hover:bg-water-700 disabled:opacity-50">
  {title}
</button>

// Variant 2: Secondary (pill shape, gray-100 bg)
<button className="rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200">
  {title}
</button>

// Variant 3: Danger (pill shape, red-500 bg)
<button className="rounded-full bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600">
  {title}
</button>
```

**Changes needed**:

| File | Current | Replace With |
|------|---------|--------------|
| `Button.jsx` | `bg-water-800 rounded-4xl` | `bg-water-600 rounded-full` |
| `FoodDetail.jsx` submit | `rounded bg-blue-500 px-4 py-2` | `rounded-full bg-water-600 px-6 py-2` |
| `FoodEditForm.jsx` save | `rounded bg-blue-500 px-4 py-2` | `rounded-full bg-water-600 px-6 py-2` |
| `FoodEditForm.jsx` cancel | `rounded bg-gray-200 px-3 py-1.5` | `rounded-full bg-gray-100 px-4 py-1.5` |
| `FoodCard.jsx` Edit | `rounded bg-gray-100 px-3 py-1 text-xs` | `rounded-full bg-gray-100 px-4 py-1 text-xs` |
| `FoodCard.jsx` Delete | `rounded bg-gray-100 px-3 py-1 text-xs text-red-500` | `rounded-full bg-red-500 px-4 py-1 text-xs text-white` |
| `FoodCard.jsx` Confirm | `rounded bg-red-500 px-3 py-1 text-xs` | (same, keep) |
| `FoodCard.jsx` Cancel | `rounded bg-gray-200 px-3 py-1 text-xs` | `rounded-full bg-gray-100 px-3 py-1 text-xs` |
| `Header.jsx` Logout | `rounded bg-gray-100 px-3 py-1 text-sm` | `rounded-full bg-gray-100 px-4 py-1.5 text-sm` |
| `index.jsx` Retry | `rounded bg-red-500 px-4 py-1 text-sm text-white` | `rounded-full bg-red-500 px-4 py-1.5 text-sm text-white` |
| `Onboarding.jsx` Copy code | `rounded bg-blue-500 px-4 py-3` | `rounded-full bg-water-600 px-4 py-3` |

---

## 3. Toggle / Filter Button Group

**Problem**: Storage location toggles (`FoodDetail`, `FoodEditForm`) and filter buttons (`index.jsx`) use the same pattern but with slightly different classes.

**Current pattern** (appears in 3 places):

```jsx
// Active
className="flex-1 rounded px-3 py-1.5 text-sm border bg-blue-500 text-white border-blue-500"

// Inactive
className="flex-1 rounded px-3 py-1.5 text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
```

**Proposed unified pattern**:

```jsx
// Active
className="flex-1 rounded-full px-3 py-1.5 text-sm border bg-water-600 text-white border-water-600"

// Inactive
className="flex-1 rounded-full px-3 py-1.5 text-sm border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
```

**Changes needed**: All 3 occurrences in `FoodDetail.jsx`, `FoodEditForm.jsx`, and `index.jsx`.

---

## 4. Card System

**Current state**: Mostly consistent (`rounded-4xl bg-white p-4 shadow-sm mt-3`) but `rounded-4xl` is not a standard Tailwind class — it's likely a custom value. FoodEditForm adds `border-l-4 border-l-blue-400`.

**Proposed**: Keep the existing card pattern but standardize:

```jsx
// Base card
className="rounded-2xl bg-white p-4 shadow-sm mt-3"

// Card with expiry status (FoodCard)
className="rounded-2xl bg-white p-4 shadow-sm mt-3 border-l-4 border-l-{status}"

// Card for edit form
className="rounded-2xl bg-white p-4 shadow-sm mt-3 border-l-4 border-l-water-400"
```

**Change**: Replace `rounded-4xl` with `rounded-2xl` everywhere for consistency (unless `rounded-4xl` is a deliberate custom token — in that case, keep it but use it everywhere).

Files: `FoodCard.jsx`, `FoodEditForm.jsx`, `SkeletonCard.jsx`, `Drawer.jsx`

---

## 5. Input Fields

**Current inconsistencies**:

| Location | Classes |
|----------|---------|
| `Onboarding.jsx` | `w-full border` |
| `NewFood.jsx` search | `w-full border` |
| `FoodDetail.jsx` | `w-full border px-2 py-1` |
| `FoodEditForm.jsx` | `w-full border px-2 py-1` |
| `index.jsx` sort `<select>` | `border rounded px-2 py-1 text-sm` |

**Proposed unified input**:

```jsx
// Text input
className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-water-500 focus:ring-1 focus:ring-water-500 outline-none"

// Select
className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-water-500 focus:ring-1 focus:ring-water-500 outline-none"
```

**Changes needed**: All 5 locations above. Also add `outline-none` and focus ring for accessibility.

---

## 6. Error / Success Text Colors

**Current inconsistency**: 
- `text-red-500` used in `NewFood.jsx` (barcode error)
- `text-red-600` used in `FoodDetail.jsx`, `Onboarding.jsx`, `FoodEditForm.jsx`, `index.jsx`
- `text-green-600` used in `FoodDetail.jsx` (success)
- `text-blue-500` used in `NewFood.jsx` (barcode loading)

**Proposed**: Standardize to:
- **Error**: `text-red-600` (darker = more readable)
- **Success**: `text-green-600`
- **Info/loading**: `text-water-600` (use brand color instead of blue-500)

**Changes needed**:
- `NewFood.jsx` line 107: `text-red-500` → `text-red-600`
- `NewFood.jsx` line 100: `text-blue-500` → `text-water-600`

---

## 7. Error State Containers

**Current** (`index.jsx`):
```jsx
<div className="mt-4 rounded bg-red-50 p-4 text-center">
```

**Proposed**: Keep this pattern; it's clean. Apply to any future error containers.

---

## 8. Onboarding Back Button

**Current**: 
```jsx
<button className="mt-2 text-sm text-gray-500 underline">
```

This is the only underlined link-style button in the app. It doesn't match any other button style.

**Proposed**: 
```jsx
<button className="mt-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200">
```

This makes it a proper Secondary variant button, consistent with the rest of the app.

---

## 9. Summary of All Changes by File

| File | Changes |
|------|---------|
| `main.css` | Add `--color-primary-500/700`, `--color-danger-500/100`, `--radius-btn`, `--radius-card` tokens |
| `Button.jsx` | `bg-water-800` → `bg-water-600`, `rounded-4xl` → `rounded-full` |
| `FoodCard.jsx` | Edit/Delete → pill shapes; Delete bg → `red-500`; Cancel → `bg-gray-100`; `rounded-4xl` → `rounded-2xl` |
| `FoodDetail.jsx` | Submit → `rounded-full bg-water-600`; Toggles → `rounded-full` with `border-water-600` |
| `FoodEditForm.jsx` | Save → `rounded-full bg-water-600`; Cancel → `rounded-full bg-gray-100`; Toggles → `rounded-full`; `rounded-4xl` → `rounded-2xl` |
| `NewFood.jsx` | Error → `text-red-600`; Info → `text-water-600`; Input → add `rounded-lg px-3 py-2` |
| `RecentFood.jsx` | (No style changes needed) |
| `SkeletonCard.jsx` | `rounded-4xl` → `rounded-2xl` |
| `Drawer.jsx` | `rounded-tl-3xl rounded-tr-3xl` → `rounded-tl-2xl rounded-tr-2xl` (keep consistent) |
| `Header.jsx` | Logout → `rounded-full bg-gray-100 px-4 py-1.5` |
| `Header.jsx` | Copy code → `text-water-600` instead of `text-blue-500` |
| `Onboarding.jsx` | Input → add `rounded-lg px-3 py-2 focus:...`; Back → pill button; Copy → `bg-water-600` |
| `index.jsx` | Filter active → `bg-water-600 border-water-600`; Filter inactive → `rounded-full`; Retry → `rounded-full`; Select → `rounded-lg px-3 py-2` |

---

## 10. Visual Before/After Examples

### Buttons
```
Before:  [Button]   [   Add to fridge   ]  [Edit][Delete]  [Back]
         water-800   blue-500 rounded      gray-100         underline
         rounded-4xl

After:   [Button]   [   Add to fridge   ]  [Edit] [Delete] [ Back ]
         water-600   water-600 rounded-full  gray-100 red-500 gray-100
         rounded-full                        rounded-full   rounded-full
```

### Toggle / Filter Group
```
Before:  [🧊 Fridge] [❄️ Freezer] [📦 Pantry]
         border water-600     same style

After:   [🧊 Fridge] [❄️ Freezer] [📦 Pantry]
         water-600 active     same pill shape
         rounded-full
```

### Input Fields
```
Before:  [________________________]  (w-full border, no padding, no focus)

After:   [________________________]  (w-full border border-gray-300 rounded-lg
                                      px-3 py-2 focus:ring-water-500)
```

---

## 11. Effort Estimate

| Priority | Files | Changes | Est. Time |
|----------|-------|---------|-----------|
| P0 | `Button.jsx`, `FoodDetail.jsx`, `FoodCard.jsx` | Core button variants, most visible | 15 min |
| P1 | `FoodEditForm.jsx`, `index.jsx`, `Onboarding.jsx` | Toggle groups, inputs, Back button | 20 min |
| P2 | `NewFood.jsx`, `Header.jsx`, `Drawer.jsx`, `SkeletonCard.jsx`, `main.css` | Color tokens, minor fixes | 15 min |

**Total**: ~50 min
