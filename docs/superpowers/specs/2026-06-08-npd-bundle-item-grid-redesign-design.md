# NPD Bundle Item Grid — Horizontal Table Redesign

**Date:** 2026-06-08  
**File:** `src/app/(internal)/npd/new/page.tsx`  
**Scope:** Step 2 of the NPD creation wizard, NPD bundle type only.

---

## Problem

The current NPD bundle item form stacks each NCD sub-request as a vertically expandable accordion card. With up to 5 items, this creates excessive vertical scroll and makes it hard to compare fields across items at a glance.

## Goal

Replace the accordion with a horizontally scrollable table where each row is one NCD item and each column is a field. Mirrors how the NCD single-item form presents its fields, but scaled to multiple items side-by-side.

---

## Layout

### Shared fields (unchanged)

Top section remains identical: Product Line, Manufacturing Location, Priority, TAT Development, TAT Production, Remarks. These apply to all bundle items.

### NCD Items table

Container: `overflow-x-auto` wrapper. Table uses fixed column widths totalling ~1490px, so it overflows on standard viewports and scrolls horizontally.

#### Columns (left → right)

| Column | Content | Width | Notes |
|--------|---------|-------|-------|
| # | Row number badge | 48px | Sticky (`sticky left-0 bg-white z-10`). Badge turns green checkmark when row is valid. |
| Item Name | `<Input>` text | 200px | Required. |
| Commodity | `<Select>` + SPOC pill beneath | 200px | Required. "Others" reveals an inline text input in the same cell below the select. |
| Drawing Link | `<Input type="url">` with `Link2` icon prefix | 220px | Required. |
| Upload | Click-to-toggle dashed zone — shows filename when toggled on | 140px | Required. Compact: icon + short label, not full upload box. |
| Sample Qty | `<Input type="number">` | 100px | Required. |
| Revision? | `<Checkbox>` | 90px | When unchecked: Revision No and CPL columns are visually disabled (opacity-40, pointer-events-none). |
| Revision No | `<Input>` text | 130px | Active only when Revision? checked. |
| CPL Sheet | Click-to-toggle — same dashed style as Upload | 120px | Active only when Revision? checked. Required when Revision? is on. |
| Remarks | `<textarea rows={1}>` | 200px | Optional. |
| ✕ | Delete button (Trash2 icon) | 40px | Hidden when only 1 row remains. |

#### Table header row

Sticky header (`sticky top-0 bg-slate-50 z-10`) with `text-[10px] font-bold uppercase tracking-wider text-slate-500` labels matching existing label style.

#### Row validation

Left border per row: `border-l-2` — emerald (`border-emerald-400`) when all required fields for that row are valid, slate (`border-slate-200`) otherwise. Row number badge: green filled circle with checkmark when valid, grey numbered circle otherwise. No full-row background tint.

#### Add Item button

Remains top-right of the "NCD Items" section header. Disabled + grayed at 5 items. No change to existing behavior.

#### Minimum rows

Always at least 1 row. Delete button hidden when `bundleItems.length === 1`.

---

## Validation logic

`bundleValid` and per-item `isItemValid` checks are **unchanged**. Required fields per item: `itemName`, `commodity` (+ `customCommodity` when "Others"), `driveLink`, `drawingFile`, `sampleQty`, and `cplAttached` when `hasRevision`. Logic already exists — only the UI rendering changes.

---

## What does NOT change

- Shared fields section
- Step 1 (type selection)
- Step 3 (review + email preview)
- All `BundleItem` state shape and update helpers
- `handleConfirmDispatch` logic
- Validation predicates (`step2Valid`, `bundleValid`)
- All non-NPD type forms (ECN, NCD, ALT_SUPPLIER, NTD, Compliance)

---

## Implementation notes

- The table is a plain `<table>` or a `<div>`-based grid — either works. A `<div>` grid with `display: grid` and fixed `grid-template-columns` is simpler given the mixed interactive content per cell.
- The sticky `#` column requires `overflow-x-auto` on the parent and `sticky left-0` + explicit `bg-white` on the cell to prevent bleed-through.
- Commodity "Others" inline expansion: render a second line inside the commodity cell (`<Input>` below the `<Select>`) when `item.commodity === "Others"`, rather than pushing a new row.
- SPOC pill inside the commodity cell: small `bg-blue-50 border-blue-200` badge with `User` icon, same as current accordion implementation.
- Upload and CPL toggles: compact version — a small dashed border box (height ~36px) with a `FileUp` or `CheckCircle` icon and a short label. No large upload zone.
