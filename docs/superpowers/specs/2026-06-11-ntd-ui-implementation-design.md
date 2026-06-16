# NTD UI Implementation — Design Spec
**Date:** 2026-06-11  
**Project:** Genessence NPD Platform · Amber Enterprises  
**Scope:** Full 11-stage NTD module UI with per-commodity multi-supplier model

---

## Background

The NTD (New Tool Development) module manages end-to-end tool development lifecycle. Types (`src/types/ntd.ts`) and helpers (`src/lib/ntd.ts`) are already scaffolded. Route files exist but are mostly stub/partial. Three shared components are complete: `ComponentApprovalBoard`, `VersionedFileInput`, `ActivityFeed`.

---

## Key Architectural Decisions

### 1. Per-Commodity Multi-Supplier Model

Each NTD's component list includes a `commodity` field per component. The commodity drives which vendor pool appears at Stage 3 RFQ dispatch. One winner is selected **per commodity** at Stage 5, resulting in up to 3 active suppliers (Sheet Metal, Plastics, EPS).

**Commodities:** `"Sheet Metal" | "Plastics" | "EPS"`

### 2. Types — Additive Changes Only

All changes to `types/ntd.ts` are additive (new optional fields). Nothing existing is removed. `NTDRecord.supplier` is kept for backward compatibility; `selectedSuppliers` is added alongside it.

### 3. Reuse `ComponentApprovalBoard` for DFM + Mould + Redesign

The existing `ComponentApprovalBoard` component (`mode="dfm"` for R&D-only review, `mode="mould"` for dual R&D+Sourcing) covers all three review loops. No new review component is needed.

### 4. Supplier Portal Scoping (Demo-only)

A commodity selector dropdown at the top of `/supplier/ntd/[id]` lets the demo operator switch between supplier views. No real auth. Each commodity-supplier sees only their components.

---

## Type Changes

### `types/ntd.ts`

```ts
// NTDComponent — add commodity
export type NTDComponent = {
  componentId: string
  name: string
  commodity: "Sheet Metal" | "Plastics" | "EPS"
}

// NTDRecord — add per-commodity selection map
export type NTDRecord = {
  ...existing...
  supplier?: string                                    // keep (legacy)
  selectedSuppliers?: Record<string, string>           // commodity → vendor_name
}

// NTDRFQVendor — add commodity tag
export type NTDRFQVendor = {
  ...existing...
  commodity: string
}

// NTDSelectionData — extend to per-commodity
export type NTDSelectionData = {
  selections: Record<string, { vendor_id: string; vendor_name: string }>
  sourcing_approved: boolean
  sourcing_approved_by: string
  sourcing_approved_at: string
  rnd_acknowledged: boolean
  rnd_acknowledged_by: string
  rnd_acknowledged_at: string
}

// NTDHandoffData — per-commodity supplier acknowledgement
export type NTDHandoffData = {
  ...existing...
  supplier_acknowledged_by_commodity?: Record<string, boolean>  // NEW
  // supplier_acknowledged kept as boolean for backward compat (true when all commodities ack'd)
}

// NTDStage11Data — per-commodity inspection
export type NTDStage11Data = {
  inspection: Record<string, {        // key = commodity
    report: VersionedFile
    submitted_by: string
    submitted_at: string
  }> | null
  ...rest unchanged...
}

// NTDInitiationData — include components (with commodity) at Stage 1
export type NTDInitiationData = {
  ...existing...
  components: NTDComponent[]          // NEW — captured at creation, locked at Stage 6
}
```

### `lib/ntd.ts` — New Helper Functions

```ts
// Derived from initiation components
export function getActiveCommodities(ntdId: string): string[]

// Stage 3 gate — at least one sent RFQ per commodity
export function allCommoditiesHaveRFQ(ntdId: string): boolean

// Stage 4 gate — at least one finalized vendor per commodity
export function allCommoditiesHaveFinalized(ntdId: string): boolean

// Stage 5 gate — one selection per commodity + both approvals
export function allCommoditiesSelected(ntdId: string): boolean

// Stage 6 gate — all commodities have acknowledged handoff
export function allCommoditiesAcknowledged(ntdId: string): boolean

// Stage 11 gate — all commodity-suppliers submitted inspection report
export function allInspectionsSubmitted(ntdId: string): boolean
```

Update `isNTDStageUnlocked()` cases 3–7 and 11 to use these helpers instead of single-vendor checks.

---

## Data Seeding — EPS Vendors

Add to `VENDOR_CATALOG` in `src/lib/mockData.ts`:

```ts
"EPS": [
  { name: "Nirlon Foam Industries",   tier: "Tier 1", commodityMatch: 95, auditScore: 88, certifications: ["ISO 9001:2015"], status: "verified", spocName: "Ramesh Pillai", ... },
  { name: "Supreme EPS Solutions",    tier: "Tier 2", commodityMatch: 82, auditScore: 76, certifications: ["ISO 9001:2015"], status: "verified", spocName: "Lata Nair", ... },
  { name: "Aerofoam India Pvt Ltd",   tier: "Tier 2", commodityMatch: 73, auditScore: 65, certifications: [],               status: "new",      spocName: "Vikram Joshi", ... },
]
```

---

## Stage-by-Stage UI Spec

### Stage 1 — Tool Initiation (`/ntd/new`)

**Changes from current stub:**
- Add per-component entry rows: component name + commodity dropdown (Sheet Metal / Plastics / EPS) + file slot (slot name + Drive link)
- Min 1 component, max configurable (add/remove rows)
- On submit: save components (with commodity) into `NTDInitiationData.components`; advance to Stage 2

**Locked at Stage 6:** component list is rendered read-only from Stage 6 onward.

---

### Stage 2 — RFQ Spec Sheet (Dual Sign-off)

**Changes:**
- Vendor comparison table grouped by commodity (one collapsible section per commodity present)
- Sourcing sign-off button (Sourcing role only); R&D sign-off button (R&D role only)
- Both signed → advance to Stage 3
- Query/clarification thread (already typed as `NTDStage2Query[]`)

---

### Stage 3 — RFQ Dispatch

**Changes (significant):**
- For each commodity present, show that commodity's `VENDOR_CATALOG[commodity]` vendor list
- Sourcing selects ≥1 vendor per commodity → each (vendor, commodity) pair gets a unique RFQ token
- NDA toggle per vendor (forced on for non-catalog vendors)
- "Send RFQ" per vendor → writes to `NTDRFQData.vendors` with `commodity` field on each entry
- Gate: at least one sent vendor per every active commodity → advance to Stage 4
- Copy link button per vendor: `/rfq/ntd/[ntdId]/[token]`

---

### Stage 4 — Quotation & Negotiation

**Internal view (Sourcing):**
- Tabs or collapsible sections grouped by commodity
- Per-vendor within each commodity: quotation details + thread + status selector
- Status machine: `sent → quotation_received → negotiating → finalized`
- Gate: at least one `finalized` vendor per commodity → advance to Stage 5

**Vendor RFQ portal (`/rfq/ntd/[ntdId]/[token]`):**
- Shows NTD title + part spec links + spec sheet link
- Shows only components matching that vendor's commodity
- Quotation form: amount, currency, lead time, doc link, RM breakdown, notes
- Thread for back-and-forth with Sourcing

---

### Stage 5 — Supplier Selection

**Changes:**
- Per-commodity section: Sourcing picks winner from finalized vendors for that commodity
- Writes `selections[commodity] = { vendor_id, vendor_name }` to `NTDSelectionData`
- After all selections: R&D acknowledgement screen listing "Sheet Metal → Vendor X / EPS → Vendor Y / Plastics → Vendor Z"
- Both complete → update `NTDRecord.selectedSuppliers` → advance to Stage 6

---

### Stage 6 — Final Design Handoff

**Internal (R&D):**
- Component list displayed (commodity-tagged, read-only — locked from initiation)
- Upload final design files (VersionedFile slots)
- Generate supplier portal URL per commodity-supplier
- Track acknowledgement per commodity in `supplier_acknowledged_by_commodity`
- Gate: all commodities acknowledged → advance to Stage 7

**Supplier portal (`/supplier/ntd/[id]`):**
- Commodity selector dropdown at top: "Viewing as: [Sheet Metal Supplier ▾]"
- Shows components for selected commodity
- "Confirm Receipt" button → writes `supplier_acknowledged_by_commodity[commodity] = true`

---

### Stage 7 — DFM Loop (`/ntd/[id]/dfm`)

**Internal (R&D):**
- `ComponentApprovalBoard mode="dfm"` with all components
- Filter by commodity tab/chips for navigation
- Gate: all components `approved` → advance to Stage 8

**Supplier portal:**
- Commodity selector at top
- Shows non-approved components for selected commodity only
- Upload PPT + 3D link per component → `final_status → under_review`

---

### Stage 8 — Mould Design + MFA (`/ntd/[id]/mould-design`)

**Sub-stage 8A:**
- `ComponentApprovalBoard mode="mould"` with dual R&D + Sourcing review panels
- SLA countdown per component (24h from submission)
- Commodity filter chips for navigation
- Gate: all components `approved` → unlock 8B

**Sub-stage 8B — Joint Review:**
- Run **per commodity-supplier** (not globally)
- Per-commodity: joint feedback textarea + "Submit" button
- After submit: 24h countdown for supplier to upload confirmed files
- Supplier uploads via commodity-scoped portal view
- R&D + Sourcing both approve → that commodity's 8B complete
- Gate: all commodity 8Bs complete → advance to Stage 9

---

### Stage 9 — Manufacturing

**Internal (Sourcing):**
- Dashboard card per commodity-supplier showing: status, start date, ETA, update feed
- "Mark Manufacturing Complete" per commodity-supplier
- Gate: all commodity-suppliers marked complete → advance to Stage 10

**Supplier portal:**
- Commodity selector at top
- Confirm manufacturing start + ETA date for their commodity
- Post status updates

---

### Stage 10 — Trials (`/ntd/[id]/trials`)

**Trial tabs:** T1 | T2 | T3... (unbounded)

**Per trial:**
1. Sourcing initiates trial (disabled if redesign pending for any component)
2. Per commodity-supplier: sample dispatch confirmation (supplier portal, commodity-scoped)
3. R&D marks samples received per component
4. R&D tests each component: 7-parameter checklist → pass/fail

**On partial fail:**
- Failed components → `redesign_pending` state
- Supplier uploads new DFM submission (PPT + 3D) via `/supplier/ntd/redesign/[id]`
- R&D reviews via `ComponentApprovalBoard mode="dfm"` (R&D-only)
- On R&D approval → component auto-enters Stage 8A (mould design loop)
- On 8A approval → `ready_for_retrial`

**Trial history panel:**
- Per-component history: T1: fail (→ redesign) → T2: pass
- "Ready for retrial" badge per component once redesign complete

**Gate:** all components pass in same trial round → advance to Stage 11

---

### Stage 11 — Commissioning & Dispatch

**Sub-step 1 (per-commodity-supplier):**
- Each supplier uploads Final Inspection Report via commodity-scoped portal
- Sourcing sees checklist: "Sheet Metal ✓ / Plastics ✓ / EPS ⏳"
- Gate: all submitted → unlock sub-steps 2+

**Sub-steps 2–6 (single combined flow):**
- 2: Sourcing — commissioning checklist + pack list + invoice
- 3: Sourcing — EXIM docs + mode + tracking ID
- 4: EXIM — status updates + "Mark Cleared"
- 5: Sourcing — confirm arrival at Gurugram plant
- 6: R&D Head + Sourcing Head — dual final sign-off → NTD complete

---

## Cross-Cutting

- **Activity log:** Every state transition calls `appendActivity()` with commodity/supplier context in description where relevant
- **VersionedFile:** All new file slots use existing `createVersionedFile` / `addFileVersion` / `approveFile` helpers
- **Polling:** `setInterval(..., 3000)` with `isEditingRef` pause for cross-portal state detection (Stage 6 ack, Stage 7/8 supplier submissions)
- **Stage gate updates:** `isNTDStageUnlocked()` cases 3–7 and 11 updated to use per-commodity helpers
- **UI palette:** `#153f90` (indigo) for R&D, `#0D9488` (teal) for Sourcing, existing shadcn/ui + Tailwind v4

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/types/ntd.ts` | Modify — additive type extensions |
| `src/lib/ntd.ts` | Modify — add per-commodity helpers, update gate functions |
| `src/lib/mockData.ts` | Modify — add EPS vendors |
| `src/app/(internal)/ntd/new/page.tsx` | Modify — add component rows with commodity dropdown |
| `src/app/(internal)/ntd/[id]/page.tsx` | Modify — implement all Stage 2–6, 9, 11 cards |
| `src/app/(internal)/ntd/[id]/dfm/page.tsx` | Modify — wire ComponentApprovalBoard, add commodity filter |
| `src/app/(internal)/ntd/[id]/mould-design/page.tsx` | Modify — 8A + per-commodity 8B joint review |
| `src/app/(internal)/ntd/[id]/trials/page.tsx` | Modify — full trial loop + redesign integration |
| `src/app/rfq/ntd/[ntdId]/[vendorToken]/page.tsx` | Modify — commodity-scoped component view |
| `src/app/supplier/ntd/[id]/page.tsx` | Modify — commodity selector, Stage 6–11 supplier actions |
| `src/app/supplier/ntd/redesign/[id]/page.tsx` | Modify — redesign DFM submission portal |
| `.claude/rules/ntd.md` | Modify — addendum for per-commodity model |

---

## Invariants (from spec — never violate)

1. Activity log is append-only — never modify/delete entries
2. Component list immutable after Stage 6 submit
3. DFM (Stage 7) never revisited — not on trial failure
4. Trial failure → Stage 8A only, only failed components
5. Approved components permanently locked
6. VersionedFile versions only increment — old versions never deleted
7. Vendor token generated once at Stage 3, never regenerated
8. Stage 11 dual sign-off requires BOTH rnd_head AND sourcing_head
9. Trial count is unbounded — never hardcode a cap
10. Supplier portal never shows approved components
11. New trial cannot start until all failed components reach `ready_for_retrial`
12. EXIM role only acts in Stage 11 sub-step 4
