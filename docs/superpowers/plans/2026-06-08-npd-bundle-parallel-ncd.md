# Plan: NPD Bundle — Parallel NCD Sub-Requests

**Date:** 2026-06-08  
**Status:** Draft

---

## What we're building

When a user raises a request of type **"NPD"**, it becomes a **parent bundle** containing multiple **NCD sub-requests** that run in parallel. Each NCD sub-request follows the full existing NCD 9-stage workflow independently. The parent NPD is marked complete only when every child NCD reaches stage 8 (closure).

---

## Core Design Decisions

### 1. Data model — linked child records (not embedded)

Each NCD sub-request is a full `NPDRecord` in localStorage with its own ID. The parent NPD is also an `NPDRecord` with extra fields marking it as a bundle.

```
NPD-FY-2026-0001          → parent bundle (typeOfWork: "NPD", isBundle: true)
  NPD-FY-2026-0001-NCD-01 → child (typeOfWork: "NCD", parentId: "NPD-FY-2026-0001")
  NPD-FY-2026-0001-NCD-02 → child (typeOfWork: "NCD", parentId: "NPD-FY-2026-0001")
  NPD-FY-2026-0001-NCD-03 → child (typeOfWork: "NCD", parentId: "NPD-FY-2026-0001")
```

**Why:** Each child reuses ALL existing NCD stage logic, SPOC routing, and localStorage keys without any changes to `npd/[id]/page.tsx`. No new NCD rendering code needed.

A new localStorage key `NPD_BUNDLE_KEY` maps parent ID → child IDs.

```ts
// mockData.ts additions
export const NPD_BUNDLE_KEY = "npd_bundle_v1"
// Record<parentNpdId, string[]>  — list of child IDs

// NPDRecord additions
isBundle?: boolean          // true on the parent record
parentId?: string           // set on every child; links back to parent
bundleItemName?: string     // the per-item name shown in the grid row (child's item)
```

### 2. Creation wizard — grid form in Step 2

Step 1 (work type): selecting **"NPD"** triggers the bundle path.

Step 2 layout: two zones
- **Shared fields** (top, applies to all children): Product Line, Manufacturing Location, Priority, TAT Development, TAT Production, Raised By, Remarks
- **Grid table** (below): each row = one NCD sub-request

Grid row columns:
| # | Item Name | Commodity | Drawing Link | Sample Qty | Rev No. |
|---|-----------|-----------|--------------|------------|---------|

- "Add Item" button appends a new blank row
- Min 1 row; rows can be deleted (trash icon per row) if > 1
- Commodity cell uses the same dropdown as today (Tubes & Pipes, Sheet Metal, etc.) — auto-routes to SPOC
- Each row's SPOC label shown inline (read-only) so user sees routing immediately

Step 3 (Review): shows shared fields as tiles + a compact table listing all items with their auto-assigned SPOCs.

**On submit:**
1. Create the parent `NPDRecord` (id = `NPD-FY-YYYY-XXXX`, `isBundle: true`, `stage: 2`, `itemName` = comma-joined item names or `"{N} items"`, `spoc` = "Multiple")
2. For each grid row, create a child `NPDRecord` (id = `${parentId}-NCD-${01..N}`, `typeOfWork: "NCD"`, `parentId`, `bundleItemName`, commodity, spoc from `SPOC_NAME_MAP[commodity]`, same shared fields)
3. Write `NPD_BUNDLE_KEY[parentId] = [child1Id, child2Id, ...]`
4. Call `addNPD` once per record (parent first, then children)

### 3. All-requests pages — one row per parent

In **archive/page.tsx**, **dashboard/lead/page.tsx**, and **report/all/page.tsx**:

- **Filter out child records from the list view**: `n.parentId == null` (children are hidden from the top-level list)
- Parent row shows a **"Bundle" badge** + item count (e.g. "3 NCD items")
- Status column shows aggregate: e.g. `2/3 complete` based on how many children are at stage 8

SPOC filtering: a sourcing SPOC should see the parent bundle if **at least one child** is assigned to them.
```ts
// archive/page.tsx — updated SPOC filter
if (SPOC_NAMES.includes(currentRole)) return npds.filter(n => {
  if (n.parentId) return false                        // never show children directly
  if (n.isBundle) {
    const childIds = bundleMap[n.id] ?? []
    return npds.some(c => childIds.includes(c.id) && c.spoc === currentRole)
  }
  return n.spoc === currentRole && n.stage >= 2
})
```

### 4. Bundle detail page — `/npd/[id]` when `isBundle`

When `npd/[id]` loads and `npd.isBundle === true`, render a **bundle overview view** instead of the normal stage workflow. The bundle overview:

- **Header card**: parent NPD metadata (product line, priority, TAT, raised by, creation date)
- **Progress bar**: X of N sub-requests complete
- **Sub-request grid**: one row per child NCD with columns — Item, Commodity, SPOC, Stage, TAT Health, Action
  - "Open" button per row → navigates to `/npd/${childId}`
  - Stage shown as a colored badge (stage name + number)
  - TAT health dot
  - Rows assigned to the current SPOC are highlighted; others are dimmed (not hidden — R&D and sourcing_head see all)
- **Completion banner**: shown when all children are at stage 8

The child `npd/[childId]` page renders exactly as a normal NCD today — no change.

**Back navigation**: child page's breadcrumb shows the parent ID and links back to the bundle overview.

### 5. SPOC scoping on the bundle detail page

When a sourcing SPOC opens the bundle detail:
- Rows for **other SPOCs' items** are shown but dimmed (opacity-50), with no "Open" button
- Only their own items have an active "Open" link
- This prevents confusion without hiding the full picture

R&D, sourcing_head, and super_admin see all rows fully active.

---

## Implementation Phases

### Phase 1 — Data model + bundle key (mockData.ts)
- Add `isBundle?: boolean`, `parentId?: string`, `bundleItemName?: string` to `NPDRecord`
- Add `NPD_BUNDLE_KEY` constant
- Add helper `getBundleChildren(parentId: string, npds: NPDRecord[]): NPDRecord[]`

### Phase 2 — Creation wizard (`/npd/new`)
- Detect `typeOfWork === "NPD"` (keep existing `typeOfWork` value)
- Replace step 2 with the grid form for NPD bundles
- On submit: create parent + N children, write bundle key

### Phase 3 — List pages (archive, dashboard/lead, report/all)
- Filter: `n.parentId == null` hides children
- Parent row: bundle badge, item count, aggregate stage status
- SPOC filter: check child SPOC membership

### Phase 4 — Bundle detail page (`/npd/[id]`)
- Add `isBundle` branch at the top of the page component
- Render bundle overview: header + sub-request grid
- Back link on child pages

### Phase 5 — NPDContext / completion rollup
- When a child advances to stage 8, check if all siblings are at stage 8
- If yes, update parent record: `stage: 8` (or a synthetic "complete" state)
- This makes the parent show as complete in list views

---

## Key files to change

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add `NPD_BUNDLE_KEY`, `isBundle?`, `parentId?`, `bundleItemName?` to `NPDRecord`, add `getBundleChildren` helper |
| `src/app/(internal)/npd/new/page.tsx` | Grid form for NPD bundle step 2; batch `addNPD` on submit |
| `src/app/(internal)/npd/[id]/page.tsx` | `isBundle` early return → bundle overview render |
| `src/app/(internal)/archive/page.tsx` | Filter children; SPOC filter reads bundle map |
| `src/app/(internal)/dashboard/lead/page.tsx` | Same list filter changes |
| `src/app/(internal)/report/all/page.tsx` | Same filter; status rollup column |
| `src/lib/npdContext.tsx` | No type changes needed — `addNPD` called per record as today |

---

## Confirmed decisions

1. **Child ID format**: `NPD-FY-2026-0001-NCD-01`, `…-NCD-02`, etc.
2. **Grid rows**: Min 1, max 5. Add/remove buttons. Each row has all per-item NCD fields (same as the current NCD step-2 form). UX: **expandable rows** — collapsed shows Item Name + Commodity + SPOC label; expanded shows full NCD fields (Drawing Link, Drawing Upload, Sample Qty, Revision No., per-item Remarks).
3. **Bundle status in list**: Fraction — `2/5 complete`.
4. **R&D view of bundle**: R&D sees all children fully active in the bundle overview.
5. **Shared TAT**: Set once in the shared fields section (TAT Dev + TAT Production). Applied identically to all child records at creation.
