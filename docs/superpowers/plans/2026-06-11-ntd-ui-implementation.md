# NTD UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full 11-stage NTD module UI with per-commodity multi-supplier model (Sheet Metal / Plastics / EPS).

**Architecture:** Each NTD component carries a `commodity` field set at Stage 1; vendor pools at Stage 3 are grouped per commodity; Stage 5 picks one supplier per commodity; Stages 6–11 run per-commodity-supplier in parallel under a single `current_stage` integer. Three shared components (`ComponentApprovalBoard`, `VersionedFileInput`, `ActivityFeed`) are already complete and must be reused — do not rebuild them.

**Tech Stack:** Next.js 16 + React 19 app router, TypeScript, Tailwind v4, shadcn/ui, localStorage only (no backend), lucide-react icons, nanoid.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/mockData.ts` | Modify | Add EPS vendor entries to VENDOR_CATALOG |
| `src/types/ntd.ts` | Modify | Add commodity field to NTDComponent + NTDRFQVendor; extend NTDRecord, NTDSelectionData, NTDHandoffData, NTDStage11Data, NTDInitiationData |
| `src/lib/ntd.ts` | Modify | Add per-commodity helper functions; update isNTDStageUnlocked |
| `src/app/(internal)/ntd/new/page.tsx` | Modify | Add commodity dropdown per component row at creation |
| `src/app/(internal)/ntd/[id]/page.tsx` | Modify | Stages 2–6, 9, 11 cards — update Stage 3 to commodity-grouped, Stage 5 to per-commodity selection, Stage 6 to per-commodity ACK |
| `src/app/(internal)/ntd/[id]/dfm/page.tsx` | Modify | Wire ComponentApprovalBoard fully; add commodity filter chips |
| `src/app/(internal)/ntd/[id]/mould-design/page.tsx` | Modify | Add per-commodity 8B joint review sections |
| `src/app/(internal)/ntd/[id]/trials/page.tsx` | Modify | Add redesign integration — on partial fail, write redesign entry; gate next trial on `ready_for_retrial` |
| `src/app/supplier/ntd/[id]/page.tsx` | Modify | Add commodity selector dropdown at top; filter components throughout by selected commodity |
| `src/app/rfq/ntd/[ntdId]/[vendorToken]/page.tsx` | Modify | Show only components matching vendor's commodity; flesh out quotation + thread |
| `src/app/supplier/ntd/redesign/[id]/page.tsx` | Modify | Redesign DFM submission form (reuse DFM upload pattern) |
| `.claude/rules/ntd.md` | Modify | Append per-commodity model addendum |

---

## Task 1: Seed EPS Vendors in VENDOR_CATALOG

**Files:**
- Modify: `src/lib/mockData.ts`

- [ ] **Step 1: Add EPS entry to VENDOR_CATALOG**

In `src/lib/mockData.ts`, find `"Packaging & Others":` (around line 121). Insert this block **before** it:

```ts
  "EPS": [
    { name: "Nirlon Foam Industries",  tier: "Tier 1", commodityMatch: 95, auditScore: 88, certifications: ["ISO 9001:2015"],               status: "verified",      spocName: "Ramesh Pillai",  spocEmail: "r.pillai@nirlon.in",         spocPhone: "+91 98201 11201" },
    { name: "Supreme EPS Solutions",   tier: "Tier 2", commodityMatch: 82, auditScore: 76, certifications: ["ISO 9001:2015"],               status: "verified",      spocName: "Lata Nair",      spocEmail: "l.nair@supremeeps.in",       spocPhone: "+91 98201 11202" },
    { name: "Aerofoam India Pvt Ltd",  tier: "Tier 2", commodityMatch: 73, auditScore: 65, certifications: [],                              status: "new",           spocName: "Vikram Joshi",   spocEmail: "v.joshi@aerofoam.in",        spocPhone: "+91 98201 11203" },
  ],
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat(ntd): seed EPS vendors in VENDOR_CATALOG"
```

---

## Task 2: Type Extensions in types/ntd.ts

**Files:**
- Modify: `src/types/ntd.ts`

All changes are **additive** — no existing fields removed.

- [ ] **Step 1: Add NTD_COMMODITIES constant and CommodityType alias above the NTDRole type**

```ts
// ─── Commodity ────────────────────────────────────────────────
export const NTD_COMMODITIES = ["Sheet Metal", "Plastics", "EPS"] as const
export type NTDCommodity = typeof NTD_COMMODITIES[number]
```

- [ ] **Step 2: Add `commodity` to NTDComponent**

Find:
```ts
export type NTDComponent = {
  componentId: string    // "C01", "C02"...
  name: string
}
```
Replace with:
```ts
export type NTDComponent = {
  componentId: string    // "C01", "C02"...
  name: string
  commodity: NTDCommodity
}
```

- [ ] **Step 3: Add `components` to NTDInitiationData**

Find:
```ts
export type NTDInitiationData = {
  title: string
  spoc: "Rohan Desai"
  notes: string
  part_specs: VersionedFile[]
  submitted_by: string
  submitted_at: string
}
```
Replace with:
```ts
export type NTDInitiationData = {
  title: string
  spoc: "Rohan Desai"
  notes: string
  components: NTDComponent[]          // captured at creation; commodity-tagged
  part_specs: VersionedFile[]
  submitted_by: string
  submitted_at: string
}
```

- [ ] **Step 4: Add `commodity` to NTDRFQVendor**

Find:
```ts
export type NTDRFQVendor = {
  vendor_name: string
  is_catalog: boolean
  token: string
  nda_required: boolean
  nda_signed: boolean
  sent: boolean
  sent_at: string
  sent_by: string
}
```
Replace with:
```ts
export type NTDRFQVendor = {
  vendor_name: string
  is_catalog: boolean
  token: string
  nda_required: boolean
  nda_signed: boolean
  sent: boolean
  sent_at: string
  sent_by: string
  commodity: string                    // which commodity pool this vendor belongs to
}
```

- [ ] **Step 5: Add `selectedSuppliers` to NTDRecord**

Find `supplier?: string` in NTDRecord and add below it:
```ts
  selectedSuppliers?: Record<string, string>   // commodity → vendor_name, set at Stage 5
```

- [ ] **Step 6: Replace NTDSelectionData with per-commodity shape**

Find the entire `NTDSelectionData` type and replace:
```ts
export type NTDCommoditySelection = {
  vendor_id: string
  vendor_name: string
}

export type NTDSelectionData = {
  selections: Record<string, NTDCommoditySelection>   // key = commodity
  sourcing_approved: boolean
  sourcing_approved_by: string
  sourcing_approved_at: string
  rnd_acknowledged: boolean
  rnd_acknowledged_by: string
  rnd_acknowledged_at: string
}
```

- [ ] **Step 7: Add per-commodity ACK to NTDHandoffData**

Find `supplier_acknowledged: boolean` in NTDHandoffData and add below it:
```ts
  supplier_acknowledged_by_commodity?: Record<string, boolean>  // commodity → acked
```

- [ ] **Step 8: Change NTDStage11Data.inspection to per-commodity**

Find:
```ts
  inspection: {
    report: VersionedFile
    submitted_by: string
    submitted_at: string
  } | null
```
Replace with:
```ts
  inspection: Record<string, {          // key = commodity
    report: VersionedFile
    submitted_by: string
    submitted_at: string
  }> | null
```

- [ ] **Step 9: Type-check**

```bash
npx tsc --noEmit
```

Fix any errors that surface (existing code references `NTDSelectionData.selected_vendor_id` — those will need updating in the page files in Tasks 4+).

- [ ] **Step 10: Commit**

```bash
git add src/types/ntd.ts
git commit -m "feat(ntd): additive type extensions for per-commodity multi-supplier model"
```

---

## Task 3: Per-Commodity Helper Functions in lib/ntd.ts

**Files:**
- Modify: `src/lib/ntd.ts`

- [ ] **Step 1: Import NTD_COMMODITIES at top of ntd.ts**

Add to imports:
```ts
import type { ..., NTDCommoditySelection } from "@/types/ntd"
import { NTD_COMMODITIES } from "@/types/ntd"
```

- [ ] **Step 2: Add getActiveCommodities helper**

After the `getCurrentNTDStage` function, add:

```ts
// Returns the unique commodities present in this NTD's component list.
// Derived from initiation data — set at Stage 1, locked at Stage 6.
export function getActiveCommodities(ntdId: string): string[] {
  const init = getNTDInitiation(ntdId)
  if (!init?.components?.length) return []
  return [...new Set(init.components.map(c => c.commodity))]
}
```

- [ ] **Step 3: Add Stage 3 gate helper**

```ts
// Stage 3 → 4: at least one RFQ sent per active commodity
export function allCommoditiesHaveRFQ(ntdId: string): boolean {
  const commodities = getActiveCommodities(ntdId)
  if (commodities.length === 0) return false
  const rfq = getNTDRFQ(ntdId)
  if (!rfq) return false
  return commodities.every(commodity =>
    Object.values(rfq.vendors).some(v => v.commodity === commodity && v.sent)
  )
}
```

- [ ] **Step 4: Add Stage 4 gate helper**

```ts
// Stage 4 → 5: at least one finalized vendor per active commodity
export function allCommoditiesHaveFinalized(ntdId: string): boolean {
  const commodities = getActiveCommodities(ntdId)
  if (commodities.length === 0) return false
  const q = getNTDQuotation(ntdId)
  if (!q) return false
  const rfq = getNTDRFQ(ntdId)
  if (!rfq) return false
  return commodities.every(commodity => {
    const vendorIdsForCommodity = Object.entries(rfq.vendors)
      .filter(([, v]) => v.commodity === commodity)
      .map(([id]) => id)
    return vendorIdsForCommodity.some(vid => q[vid]?.status === "finalized")
  })
}
```

- [ ] **Step 5: Add Stage 5 gate helper**

```ts
// Stage 5 → 6: one supplier selected per active commodity + both approvals
export function allCommoditiesSelected(ntdId: string): boolean {
  const commodities = getActiveCommodities(ntdId)
  if (commodities.length === 0) return false
  const sel = getNTDSelection(ntdId)
  if (!sel?.sourcing_approved || !sel?.rnd_acknowledged) return false
  return commodities.every(c => !!sel.selections?.[c]?.vendor_name)
}
```

- [ ] **Step 6: Add Stage 6 gate helper**

```ts
// Stage 6 → 7: every active commodity-supplier has acknowledged handoff
export function allCommoditiesAcknowledged(ntdId: string): boolean {
  const commodities = getActiveCommodities(ntdId)
  if (commodities.length === 0) return false
  const handoff = getNTDHandoff(ntdId)
  if (!handoff) return false
  return commodities.every(c => handoff.supplier_acknowledged_by_commodity?.[c] === true)
}
```

- [ ] **Step 7: Add Stage 11 gate helper**

```ts
// Stage 11 sub-step 1: all commodity-suppliers submitted inspection report
export function allInspectionsSubmitted(ntdId: string): boolean {
  const commodities = getActiveCommodities(ntdId)
  if (commodities.length === 0) return false
  const s11 = getNTDStage11(ntdId)
  if (!s11?.inspection) return false
  return commodities.every(c => !!s11.inspection![c]?.submitted_at)
}
```

- [ ] **Step 8: Update isNTDStageUnlocked cases 3–7 and 11**

Find `isNTDStageUnlocked` and replace these cases:

```ts
    case 3: {
      const spec = getNTDSpec(id)
      return !!spec?.sourcing_signed
    }

    case 4: {
      return allCommoditiesHaveRFQ(id)
    }

    case 5: {
      return allCommoditiesHaveFinalized(id)
    }

    case 6: {
      return allCommoditiesSelected(id)
    }

    case 7: {
      return allCommoditiesAcknowledged(id)
    }
```

For case 11 (advance after trials):
```ts
    case 11: {
      const trials = getNTDTrials(id)
      return trials?.stage_complete === true
    }
```
(Stage 11 gate unchanged — `stage_complete` is still the trials completion flag.)

Also update `getStage11CurrentSubstep` to use `allInspectionsSubmitted` for sub-step 1:

Find the existing function and replace:
```ts
export function getStage11CurrentSubstep(id: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const s11 = getNTDStage11(id)
  if (!s11) return 1
  if (!allInspectionsSubmitted(id)) return 1
  if (!s11.commissioning) return 2
  if (!s11.shipment) return 3
  if (!s11.exim?.cleared) return 4
  if (!s11.arrival) return 5
  return 6
}
```

- [ ] **Step 9: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/ntd.ts src/types/ntd.ts
git commit -m "feat(ntd): per-commodity helper functions and stage gate updates"
```

---

## Task 4: Stage 1 Creation Wizard — Component Rows with Commodity

**Files:**
- Modify: `src/app/(internal)/ntd/new/page.tsx`

- [ ] **Step 1: Import NTD_COMMODITIES and NTDCommodity**

At the top of the file, add:
```ts
import { NTD_COMMODITIES, type NTDCommodity } from "@/types/ntd"
```

- [ ] **Step 2: Replace the component state type**

The current page creates the NTD without components in initiation data. Add a component state:

```ts
interface ComponentRow {
  id: string
  name: string
  commodity: NTDCommodity
  specSlotName: string
  specLink: string
}
```

Replace `const [fileSlots, setFileSlots] = useState<FileSlot[]>(...)` with:
```ts
const [componentRows, setComponentRows] = useState<ComponentRow[]>([
  { id: "C01", name: "", commodity: "Sheet Metal", specSlotName: "", specLink: "" }
])
```

- [ ] **Step 3: Add row helpers**

```ts
const addComponentRow = () => {
  const nextNum = componentRows.length + 1
  const id = `C${String(nextNum).padStart(2, "0")}`
  setComponentRows(prev => [...prev, { id, name: "", commodity: "Sheet Metal", specSlotName: "", specLink: "" }])
}

const removeComponentRow = (id: string) => {
  if (componentRows.length > 1) setComponentRows(prev => prev.filter(r => r.id !== id))
}

const updateComponentRow = (id: string, field: keyof ComponentRow, value: string) => {
  setComponentRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
}
```

- [ ] **Step 4: Update validate to check component rows**

```ts
const validate = () => {
  const e: Record<string, string> = {}
  if (!title.trim()) e.title = "Title is required"
  const hasValidComponent = componentRows.some(r => r.name.trim())
  if (!hasValidComponent) e.components = "At least one component with a name is required"
  return e
}
```

- [ ] **Step 5: Update handleSubmit to include components and spec files**

Replace the `handleSubmit` body after `setSubmitting(true)`:

```ts
    const id = generateNTDId()
    const now = new Date().toISOString()
    const ntdRole = currentRole === "rnd_head" ? "rnd_head" : currentRole === "super_admin" ? "super_admin" : "rnd"

    const validComponents = componentRows.filter(r => r.name.trim())
    const ntdComponents = validComponents.map(r => ({
      componentId: r.id,
      name: r.name.trim(),
      commodity: r.commodity,
    }))

    const partSpecs = validComponents
      .filter(r => r.specSlotName.trim() && r.specLink.trim())
      .map(r => createVersionedFile(r.specSlotName.trim(), r.specLink.trim(), currentRole))

    saveNTDRecord({
      id,
      typeOfWork: "NTD",
      title: title.trim(),
      spoc: "Rohan Desai",
      created_by: currentRole,
      created_at: now,
      current_stage: 2,
      status: "active",
    })

    setNTDInitiation(id, {
      title: title.trim(),
      spoc: "Rohan Desai",
      notes: notes.trim(),
      components: ntdComponents,
      part_specs: partSpecs,
      submitted_by: currentRole,
      submitted_at: now,
    })

    appendActivity(id, currentRole, ntdRole, 1, "ntd_created",
      `NTD created: "${title.trim()}" — ${ntdComponents.length} component(s) across ${[...new Set(ntdComponents.map(c => c.commodity))].join(", ")}`)

    router.push(`/ntd/${id}`)
```

- [ ] **Step 6: Replace the file slots JSX with component rows UI**

In the return JSX, find the file slots section and replace with:

```tsx
{/* Component rows */}
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <label className="text-sm font-semibold text-slate-700">
      Components <span className="text-red-500">*</span>
    </label>
    <button type="button" onClick={addComponentRow}
      className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
      <Plus className="w-3.5 h-3.5" /> Add Component
    </button>
  </div>

  {errors.components && (
    <p className="text-xs text-red-600 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" /> {errors.components}
    </p>
  )}

  {componentRows.map((row, idx) => (
    <div key={row.id} className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{row.id}</span>
        {componentRows.length > 1 && (
          <button type="button" onClick={() => removeComponentRow(row.id)}
            className="text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Component name */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Component Name <span className="text-red-500">*</span>
          </label>
          <input type="text" autoComplete="off"
            placeholder="e.g. Core Insert"
            value={row.name}
            onChange={e => updateComponentRow(row.id, "name", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Commodity */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Commodity <span className="text-red-500">*</span>
          </label>
          <select value={row.commodity}
            onChange={e => updateComponentRow(row.id, "commodity", e.target.value as NTDCommodity)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            {NTD_COMMODITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Spec file slot (optional per component) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spec File Name</label>
          <input type="text" autoComplete="off"
            placeholder="e.g. Core Insert Drawing"
            value={row.specSlotName}
            onChange={e => updateComponentRow(row.id, "specSlotName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spec File Link</label>
          <input type="text" autoComplete="off"
            placeholder="Drive / SharePoint URL"
            value={row.specLink}
            onChange={e => updateComponentRow(row.id, "specLink", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(internal\)/ntd/new/page.tsx
git commit -m "feat(ntd): Stage 1 wizard — per-component commodity selection"
```

---

## Task 5: Stage 3 — Per-Commodity RFQ Dispatch

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/page.tsx`

The current Stage 3 handler uses a flat `VENDOR_CATALOG` (local string array). Replace it with commodity-grouped pools from `mockData.ts`.

- [ ] **Step 1: Import VENDOR_CATALOG from mockData and helpers from ntd.ts**

At the top of `ntd/[id]/page.tsx`, add or update imports:

```ts
import { VENDOR_CATALOG } from "@/lib/mockData"
import { ..., getActiveCommodities, allCommoditiesHaveRFQ } from "@/lib/ntd"
```

Remove the local `const VENDOR_CATALOG = [...]` array near line 30.

- [ ] **Step 2: Replace handleAddVendorToRFQ to include commodity**

Find `handleAddVendorToRFQ` and replace:

```ts
const handleAddVendorToRFQ = (vendorName: string, isCatalog: boolean, commodity: string) => {
  const existing = rfqData ?? { vendors: {} }
  const vendorId = `vendor_${commodity.replace(/\s+/g, "_")}_${Date.now()}`
  setNTDRFQ(id, {
    vendors: {
      ...existing.vendors,
      [vendorId]: {
        vendor_name: vendorName,
        is_catalog: isCatalog,
        commodity,
        token: generateVendorToken(),
        nda_required: !isCatalog,
        nda_signed: isCatalog,
        sent: false,
        sent_at: "",
        sent_by: "",
      }
    }
  })
  reload()
}
```

- [ ] **Step 3: Update handleAdvanceFromRFQ to check the per-commodity gate**

Find:
```ts
const handleAdvanceFromRFQ = () => {
  advanceNTDStage(id, 4, currentRole, ntdRole)
  reload()
}
```

Replace with:
```ts
const handleAdvanceFromRFQ = () => {
  if (!allCommoditiesHaveRFQ(id)) return
  appendActivity(id, currentRole, ntdRole, 3, "stage_complete", "RFQs dispatched to all commodity vendor pools")
  advanceNTDStage(id, 4, currentRole, ntdRole)
  reload()
}
```

- [ ] **Step 4: Replace Stage 3 card JSX with commodity-grouped UI**

Find the Stage 3 card in the `cards.push(...)` block (the one with `stageNum={3}`). Replace its children with:

```tsx
{/* Per-commodity vendor pool sections */}
{(() => {
  const activeCommodities = getActiveCommodities(id)
  const vendors = rfqData?.vendors ?? {}
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const allSent = allCommoditiesHaveRFQ(id)

  return (
    <div className="space-y-5">
      {activeCommodities.map(commodity => {
        const catalogVendors = VENDOR_CATALOG[commodity] ?? []
        const selectedVendorIds = Object.entries(vendors)
          .filter(([, v]) => v.commodity === commodity)
          .map(([vid]) => vid)

        return (
          <div key={commodity} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{commodity}</span>
              <span className="text-[10px] text-slate-400">{catalogVendors.length} catalog vendors</span>
            </div>
            <div className="p-4 space-y-3">
              {/* Catalog vendor checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {catalogVendors.map(cv => {
                  const existingEntry = Object.entries(vendors).find(([, v]) => v.vendor_name === cv.name && v.commodity === commodity)
                  const isAdded = !!existingEntry
                  const [existingId, existingVendor] = existingEntry ?? ["", null]
                  const rfqUrl = existingVendor ? `${baseUrl}/rfq/ntd/${id}/${existingVendor.token}` : ""

                  return (
                    <div key={cv.name} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${isAdded ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                      <input type="checkbox" checked={isAdded}
                        onChange={() => {
                          if (isAdded) {
                            // Remove vendor
                            const { [existingId]: _, ...rest } = vendors
                            setNTDRFQ(id, { vendors: rest })
                            reload()
                          } else {
                            handleAddVendorToRFQ(cv.name, true, commodity)
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{cv.name}</p>
                        <p className="text-[10px] text-slate-400">{cv.tier} · {cv.spocName}</p>
                        {isAdded && existingVendor && (
                          <div className="flex items-center gap-2 mt-1.5">
                            {existingVendor.sent ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> RFQ Sent
                              </span>
                            ) : (
                              <button onClick={() => handleSendRFQ(existingId)}
                                className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded-lg transition-colors">
                                Send RFQ
                              </button>
                            )}
                            {rfqUrl && <CopyButton text={rfqUrl} />}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add custom vendor */}
              {isSourcing && (
                <div className="flex items-center gap-2 pt-1">
                  <input type="text" autoComplete="off"
                    placeholder={`Add custom ${commodity} vendor...`}
                    value={customVendorName}
                    onFocus={pausePolling} onBlur={resumePolling}
                    onChange={e => setCustomVendorName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => {
                    if (customVendorName.trim()) {
                      handleAddVendorToRFQ(customVendorName.trim(), false, commodity)
                      setCustomVendorName("")
                    }
                  }} disabled={!customVendorName.trim()}
                    className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3 h-3 inline mr-1" />Add
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Advance gate */}
      {isSourcing && stage === 3 && (
        <button onClick={handleAdvanceFromRFQ} disabled={!allSent}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors">
          {allSent ? "Proceed to Quotation Review →" : `Waiting for RFQs across all commodities`}
        </button>
      )}
    </div>
  )
})()}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): Stage 3 — per-commodity vendor pool RFQ dispatch"
```

---

## Task 6: Stage 5 — Per-Commodity Supplier Selection

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/page.tsx`

- [ ] **Step 1: Import allCommoditiesSelected and allCommoditiesHaveFinalized**

Already added in Task 5 import block.

- [ ] **Step 2: Replace handleSelectSupplier with per-commodity version**

Find `handleSelectSupplier` and replace:

```ts
const handleSelectCommoditySupplier = (commodity: string, vendorId: string, vendorName: string) => {
  const existing = selectionData ?? {
    selections: {},
    sourcing_approved: false, sourcing_approved_by: "", sourcing_approved_at: "",
    rnd_acknowledged: false, rnd_acknowledged_by: "", rnd_acknowledged_at: "",
  }
  const updatedSelections = { ...existing.selections, [commodity]: { vendor_id: vendorId, vendor_name: vendorName } }
  const activeCommodities = getActiveCommodities(id)
  const allSelected = activeCommodities.every(c => updatedSelections[c]?.vendor_name)

  const updated = {
    ...existing,
    selections: updatedSelections,
    ...(allSelected ? { sourcing_approved: true, sourcing_approved_by: currentRole, sourcing_approved_at: new Date().toISOString() } : {}),
  }
  setNTDSelection(id, updated)
  appendActivity(id, currentRole, ntdRole, 5, "supplier_selected", `${commodity} supplier selected: ${vendorName}`, { vendor_id: vendorId })
  reload()
}
```

- [ ] **Step 3: Replace handleRndAcknowledge to work with new selection shape**

Find `handleRndAcknowledge` and replace:

```ts
const handleRndAcknowledge = () => {
  if (!selectionData) return
  const updated = {
    ...selectionData,
    rnd_acknowledged: true,
    rnd_acknowledged_by: currentRole,
    rnd_acknowledged_at: new Date().toISOString(),
  }
  setNTDSelection(id, updated)
  // Write selectedSuppliers to the master NTD record
  const r = getNTDRecord(id)
  if (r) {
    const suppliersMap: Record<string, string> = {}
    Object.entries(selectionData.selections ?? {}).forEach(([commodity, sel]) => {
      suppliersMap[commodity] = sel.vendor_name
    })
    saveNTDRecord({ ...r, selectedSuppliers: suppliersMap })
  }
  if (updated.sourcing_approved && updated.rnd_acknowledged) {
    advanceNTDStage(id, 6, currentRole, ntdRole)
  }
  appendActivity(id, currentRole, ntdRole, 5, "supplier_acknowledged", "R&D acknowledged all supplier selections")
  reload()
}
```

- [ ] **Step 4: Replace Stage 5 card JSX**

Find the Stage 5 card children and replace with per-commodity selection UI:

```tsx
{(() => {
  const activeCommodities = getActiveCommodities(id)
  const vendors = rfqData?.vendors ?? {}
  const quotations = quotationData ?? {}
  const currentSelections = selectionData?.selections ?? {}

  return (
    <div className="space-y-5">
      {/* Per-commodity selection */}
      {activeCommodities.map(commodity => {
        const finalizedVendorIds = Object.entries(vendors)
          .filter(([, v]) => v.commodity === commodity)
          .filter(([vid]) => quotations[vid]?.status === "finalized")
          .map(([vid, v]) => ({ vendorId: vid, vendorName: v.vendor_name }))

        const selected = currentSelections[commodity]

        return (
          <div key={commodity} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{commodity}</span>
              {selected && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> {selected.vendor_name}
                </span>
              )}
            </div>
            <div className="p-4">
              {finalizedVendorIds.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No finalized vendors for this commodity yet</p>
              ) : (
                <div className="space-y-2">
                  {finalizedVendorIds.map(({ vendorId, vendorName }) => {
                    const q = quotations[vendorId]?.quotation
                    const isSelected = selected?.vendor_id === vendorId
                    return (
                      <div key={vendorId}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${isSelected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{vendorName}</p>
                          {q && (
                            <p className="text-[10px] text-slate-400">
                              {q.currency} {q.amount.toLocaleString()} · {q.lead_time_days}d lead time
                            </p>
                          )}
                        </div>
                        {isSourcing && !selected && (
                          <button onClick={() => handleSelectCommoditySupplier(commodity, vendorId, vendorName)}
                            className="text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg transition-colors">
                            Select
                          </button>
                        )}
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* R&D acknowledgement */}
      {selectionData?.sourcing_approved && !selectionData.rnd_acknowledged && isRnd && (
        <div className="border border-indigo-200 rounded-xl bg-indigo-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-indigo-800">Acknowledge Supplier Selections</p>
          <div className="space-y-1">
            {Object.entries(selectionData.selections ?? {}).map(([commodity, sel]) => (
              <p key={commodity} className="text-xs text-slate-700">
                <span className="font-semibold text-slate-500">{commodity}:</span> {sel.vendor_name}
              </p>
            ))}
          </div>
          <button onClick={handleRndAcknowledge}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 text-white transition-colors">
            Acknowledge All Selections
          </button>
        </div>
      )}

      {selectionData?.rnd_acknowledged && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-800">Supplier selections acknowledged by {selectionData.rnd_acknowledged_by}</p>
        </div>
      )}
    </div>
  )
})()}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): Stage 5 — per-commodity supplier selection and R&D acknowledgement"
```

---

## Task 7: Stage 6 — Per-Commodity Design Handoff

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/page.tsx`

- [ ] **Step 1: Update handleSubmitHandoff to use components from initiation data**

The component list now comes from `initData.components` (set at Stage 1, not the local builder state). Replace `handleSubmitHandoff`:

```ts
const handleSubmitHandoff = () => {
  // Components are locked from Stage 1 — don't re-enter them here
  const comps = initData?.components ?? []
  if (comps.length === 0) return
  const finalFiles = finalDesignSlots.filter(s => s.slotName.trim() && s.link.trim())
    .map(s => createVersionedFile(s.slotName, s.link, currentRole))
  setNTDHandoff(id, {
    components: comps,
    component_count: comps.length,
    final_designs: finalFiles,
    submitted_by: currentRole,
    submitted_at: new Date().toISOString(),
    supplier_acknowledged: false,
    supplier_acknowledged_at: "",
    supplier_acknowledged_by_commodity: {},
  })
  const r = getNTDRecord(id)
  if (r) saveNTDRecord({ ...r, component_count: comps.length })
  appendActivity(id, currentRole, ntdRole, 6, "file_uploaded", `Design handoff submitted — ${comps.length} components`)
  reload()
}
```

- [ ] **Step 2: Update handleSimulateSupplierAck to use per-commodity ACK**

Replace `handleSimulateSupplierAck`:

```ts
const handleSimulateSupplierAck = (commodity: string) => {
  if (!handoffData) return
  const updated = {
    ...handoffData,
    supplier_acknowledged_by_commodity: {
      ...(handoffData.supplier_acknowledged_by_commodity ?? {}),
      [commodity]: true,
    },
  }
  // Check if all commodities have acked
  const activeCommodities = getActiveCommodities(id)
  const allAcked = activeCommodities.every(c => updated.supplier_acknowledged_by_commodity?.[c] === true)
  if (allAcked) {
    updated.supplier_acknowledged = true
    updated.supplier_acknowledged_at = new Date().toISOString()
    advanceNTDStage(id, 7, currentRole, ntdRole)
  }
  setNTDHandoff(id, updated)
  appendActivity(id, currentRole, ntdRole, 6, "supplier_acknowledged", `${commodity} supplier acknowledged design handoff`)
  reload()
}
```

- [ ] **Step 3: Replace Stage 6 card JSX**

Find Stage 6 card children and replace with:

```tsx
{(() => {
  const comps = initData?.components ?? []
  const activeCommodities = getActiveCommodities(id)
  const ackByCommodity = handoffData?.supplier_acknowledged_by_commodity ?? {}
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const suppliers = record.selectedSuppliers ?? {}

  if (!handoffData) {
    return isRnd ? (
      <div className="space-y-5">
        {/* Component list (read-only from initiation) */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Components ({comps.length}) — locked from Stage 1
          </p>
          <div className="space-y-1">
            {comps.map(c => (
              <div key={c.componentId} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{c.componentId}</span>
                <span className="text-xs font-medium text-slate-800">{c.name}</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full ml-auto">{c.commodity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Final design file slots */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Final Design Files</p>
            <button onClick={() => setFinalDesignSlots(prev => [...prev, { id: String(Date.now()), slotName: "", link: "" }])}
              className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-medium">
              <Plus className="w-3 h-3" /> Add File
            </button>
          </div>
          {finalDesignSlots.map(s => (
            <div key={s.id} className="flex gap-2">
              <input type="text" autoComplete="off" placeholder="File name" value={s.slotName}
                onFocus={pausePolling} onBlur={resumePolling}
                onChange={e => setFinalDesignSlots(prev => prev.map(x => x.id === s.id ? { ...x, slotName: e.target.value } : x))}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input type="text" autoComplete="off" placeholder="Drive link" value={s.link}
                onFocus={pausePolling} onBlur={resumePolling}
                onChange={e => setFinalDesignSlots(prev => prev.map(x => x.id === s.id ? { ...x, link: e.target.value } : x))}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
        </div>

        <button onClick={handleSubmitHandoff} disabled={comps.length === 0}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white transition-colors">
          Submit & Notify Suppliers →
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-sm text-amber-800">Awaiting R&D to submit final design files.</p>
      </div>
    )
  }

  // Handoff submitted — show per-commodity ACK status
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>Design files submitted by {handoffData.submitted_by} · {handoffData.component_count} components</span>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Per-Supplier Acknowledgement
        </p>
        {activeCommodities.map(commodity => {
          const supplierName = suppliers[commodity] ?? commodity
          const isAcked = !!ackByCommodity[commodity]
          const portalUrl = `${baseUrl}/supplier/ntd/${id}?commodity=${encodeURIComponent(commodity)}`
          return (
            <div key={commodity} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isAcked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
              <div>
                <p className="text-xs font-semibold text-slate-800">{commodity}</p>
                <p className="text-[10px] text-slate-400">{supplierName}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAcked ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Acknowledged
                  </span>
                ) : (
                  <>
                    <CopyButton text={portalUrl} />
                    <button onClick={() => handleSimulateSupplierAck(commodity)}
                      className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                      Simulate ACK
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})()}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): Stage 6 — per-commodity design handoff and ACK tracking"
```

---

## Task 8: Stage 7 DFM Page — Commodity Filter + Full Wiring

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/dfm/page.tsx`

- [ ] **Step 1: Read the existing DFM page fully to understand current state**

The DFM page already has the `ComponentApprovalBoard` integration started. Read current content to confirm what `getDFMOrInit` does (initializes DFM data from handoff components).

Add missing import if absent:
```ts
import { getActiveCommodities } from "@/lib/ntd"
import type { NTDCommodity } from "@/types/ntd"
```

- [ ] **Step 2: Add commodity filter state**

In the component body, after existing state declarations:
```ts
const [commodityFilter, setCommodityFilter] = useState<string>("All")
```

- [ ] **Step 3: Ensure getDFMOrInit uses commodity-tagged components**

Find or add the `getDFMOrInit` function. It should initialize each `NTDDFMComponent` from `handoff.components` — these now have `commodity` on them. The component already exists in `NTDDFMData` (just `componentId` and `name`) but the `NTDDFMComponent` type doesn't have commodity — that's fine. The filter will work from `initData.components` which has commodity.

- [ ] **Step 4: Add commodity filter chips to page JSX**

Find the return JSX in DFMPage and add after the header / before the board:

```tsx
{/* Commodity filter chips */}
{(() => {
  const commodities = getActiveCommodities(id)
  if (commodities.length <= 1) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {["All", ...commodities].map(c => (
        <button key={c} onClick={() => setCommodityFilter(c)}
          className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors ${
            commodityFilter === c
              ? "bg-indigo-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}>
          {c}
        </button>
      ))}
    </div>
  )
})()}
```

- [ ] **Step 5: Filter components passed to ComponentApprovalBoard**

Find where `ComponentApprovalBoard` is rendered and update the `components` prop:

```tsx
{/* Filter DFM components by selected commodity */}
{(() => {
  const initData = getNTDInitiation(id)
  const commodityMap: Record<string, string> = {}
  initData?.components?.forEach(c => { commodityMap[c.componentId] = c.commodity })

  const filteredComponents = commodityFilter === "All"
    ? dfmData.components
    : dfmData.components.filter(c => commodityMap[c.componentId] === commodityFilter)

  return (
    <ComponentApprovalBoard
      components={filteredComponents}
      mode="dfm"
      role={ntdRole}
      onFileAction={handleDFMFileAction}
      redesignRound={redesignData?.redesign_rounds?.length ?? 0}
    />
  )
})()}
```

- [ ] **Step 6: Ensure handleDFMFileAction is complete**

The DFM page needs a `handleDFMFileAction` that processes all file actions. If not already complete, add:

```ts
function handleDFMFileAction(
  componentId: string,
  fileSlot: "ppt" | "design_3d" | "rnd_doc",
  action: "upload" | "revise" | "approve" | "comment" | "resolve",
  data: Record<string, unknown>
) {
  if (!dfmData) return
  const updated = { ...dfmData }
  const compIdx = updated.components.findIndex(c => c.componentId === componentId)
  if (compIdx < 0) return
  const comp = { ...updated.components[compIdx] }

  if (fileSlot === "rnd_doc") {
    const newDoc = createVersionedFile(data.name as string, data.link as string, currentRole)
    comp.rnd_docs = [...(comp.rnd_docs ?? []), newDoc]
    appendActivity(id, currentRole, ntdRole, 7, "file_uploaded", `R&D doc shared for ${componentId}`, { component_id: componentId })
  } else {
    const fileKey = fileSlot as "ppt" | "design_3d"
    if (action === "upload") {
      comp[fileKey] = createVersionedFile(fileSlot === "ppt" ? "DFM PPT" : "3D Design", data.link as string, currentRole)
      comp.final_status = "under_review"
      comp.iteration_no = (comp.iteration_no ?? 0) + 1
      appendActivity(id, currentRole, ntdRole, 7, "file_uploaded", `${fileSlot} uploaded for ${componentId} (v1)`, { component_id: componentId, version_no: 1 })
    } else if (action === "revise") {
      comp[fileKey] = addFileVersion(comp[fileKey], data.link as string, currentRole, data.note as string | undefined)
      appendActivity(id, currentRole, ntdRole, 7, "file_revised", `${fileSlot} revised for ${componentId} (v${comp[fileKey].current_version})`, { component_id: componentId })
    } else if (action === "approve") {
      comp[fileKey] = approveFile(comp[fileKey], currentRole)
      // Check if both files approved → component approved
      if (comp.ppt?.approved && comp.design_3d?.approved) {
        comp.final_status = "approved"
        comp.approved_by = currentRole
        comp.approved_at = new Date().toISOString()
        appendActivity(id, currentRole, ntdRole, 7, "component_approved", `${componentId} DFM approved`, { component_id: componentId })
      } else {
        appendActivity(id, currentRole, ntdRole, 7, "file_approved", `${fileSlot} approved for ${componentId}`, { component_id: componentId })
      }
    } else if (action === "comment") {
      comp[fileKey] = addFileComment(comp[fileKey], currentRole, ntdRole, data.text as string, data.req as boolean)
      if (data.req) {
        comp.final_status = "revision_required"
        appendActivity(id, currentRole, ntdRole, 7, "file_rejected", `Revision requested on ${fileSlot} for ${componentId}`, { component_id: componentId })
      } else {
        appendActivity(id, currentRole, ntdRole, 7, "comment_added", `Comment on ${fileSlot} for ${componentId}`, { component_id: componentId })
      }
    } else if (action === "resolve") {
      comp[fileKey] = resolveComment(comp[fileKey], data.cid as string, currentRole)
      appendActivity(id, currentRole, ntdRole, 7, "comment_resolved", `Comment resolved on ${fileSlot} for ${componentId}`, { component_id: componentId })
    }
  }

  updated.components[compIdx] = comp
  // Check if all components approved → stage complete
  const allApproved = updated.components.every(c => c.final_status === "approved")
  if (allApproved && !updated.stage_complete) {
    updated.stage_complete = true
    appendActivity(id, currentRole, ntdRole, 7, "stage_complete", "All DFM components approved — advancing to Stage 8")
    advanceNTDStage(id, 8, currentRole, ntdRole)
  }
  setNTDDFM(id, updated)
  reload()
}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/dfm/page.tsx
git commit -m "feat(ntd): Stage 7 DFM — commodity filter + full ComponentApprovalBoard wiring"
```

---

## Task 9: Stage 8 Mould Design — Per-Commodity 8B Joint Review

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/mould-design/page.tsx`

- [ ] **Step 1: Add per-commodity 8B joint feedback state**

In `MouldDesignPage`, add:
```ts
const [commodityJointFeedback, setCommodityJointFeedback] = useState<Record<string, string>>({})
const [commodityJointFiles, setCommodityJointFiles] = useState<Record<string, string>>({})
```

- [ ] **Step 2: Add per-commodity 8B handlers**

```ts
const handleSubmitCommodityJointFeedback = (commodity: string) => {
  const feedback = commodityJointFeedback[commodity]?.trim()
  if (!feedback || !mouldData) return
  const now = new Date().toISOString()
  const deadline = new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000).toISOString()

  // Store per-commodity joint review in a nested structure under joint_review
  // We extend the existing joint_review field to be commodity-keyed
  // Use localStorage directly with a per-commodity key pattern:
  const key = `ntd_mould_8b_${id}_${commodity.replace(/\s+/g, "_")}`
  localStorage.setItem(key, JSON.stringify({
    feedback,
    feedback_by: currentRole,
    feedback_at: now,
    supplier_deadline: deadline,
    supplier_files: [],
    supplier_uploaded_at: "",
    approved: false,
    approved_by: "",
    approved_at: "",
  }))
  appendActivity(id, currentRole, ntdRole, 8, "dual_signed",
    `8B joint feedback submitted for ${commodity}`, undefined, "8B")
  reload()
}

const handleApproveCommodity8B = (commodity: string) => {
  const key = `ntd_mould_8b_${id}_${commodity.replace(/\s+/g, "_")}`
  const existing = JSON.parse(localStorage.getItem(key) ?? "{}")
  const updated = { ...existing, approved: true, approved_by: currentRole, approved_at: new Date().toISOString() }
  localStorage.setItem(key, JSON.stringify(updated))

  // Check if all commodity 8Bs complete
  const activeCommodities = getActiveCommodities(id)
  const allDone = activeCommodities.every(c => {
    const k = `ntd_mould_8b_${id}_${c.replace(/\s+/g, "_")}`
    return JSON.parse(localStorage.getItem(k) ?? "{}").approved === true
  })
  if (allDone && mouldData) {
    const updatedMould = { ...mouldData, stage_complete: true, joint_review: { feedback: "multi-commodity", feedback_by: currentRole, feedback_at: new Date().toISOString(), supplier_deadline: "", supplier_files: [], supplier_uploaded_at: "", approved: true, approved_by: currentRole, approved_at: new Date().toISOString() } }
    setNTDMould(id, updatedMould)
    advanceNTDStage(id, 9, currentRole, ntdRole)
    appendActivity(id, currentRole, ntdRole, 8, "stage_complete", "All commodity 8B joint reviews complete — advancing to Stage 9", undefined, "8B")
  }
  reload()
}
```

- [ ] **Step 3: Add commodity filter + per-commodity 8B sections to page JSX**

In the 8B tab content, replace the single joint review form with per-commodity sections:

```tsx
{/* 8B — Per-commodity joint review */}
{(() => {
  const activeCommodities = getActiveCommodities(id)
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-700">
        Joint review runs per commodity-supplier. Each supplier must upload confirmed files within 24h of feedback.
      </p>
      {activeCommodities.map(commodity => {
        const key = `ntd_mould_8b_${id}_${commodity.replace(/\s+/g, "_")}`
        const commodityJR = typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(key) ?? "null")
          : null

        return (
          <div key={commodity} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{commodity}</span>
              {commodityJR?.approved && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> 8B Complete
                </span>
              )}
            </div>
            <div className="p-4">
              {!commodityJR ? (
                (isSourcing || isRnd) ? (
                  <div className="space-y-2">
                    <textarea rows={3} autoComplete="off"
                      placeholder={`Joint review feedback for ${commodity} supplier...`}
                      value={commodityJointFeedback[commodity] ?? ""}
                      onChange={e => setCommodityJointFeedback(prev => ({ ...prev, [commodity]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                    <button onClick={() => handleSubmitCommodityJointFeedback(commodity)}
                      disabled={!commodityJointFeedback[commodity]?.trim()}
                      className="text-sm font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                      Submit Joint Feedback
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Awaiting joint review submission</p>
                )
              ) : !commodityJR.approved ? (
                <div className="space-y-3">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Feedback Sent</p>
                    <p className="text-xs text-slate-700">{commodityJR.feedback}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supplier deadline: {new Date(commodityJR.supplier_deadline).toLocaleString("en-IN")}
                    </p>
                  </div>
                  {/* Simulate supplier upload + approve for demo */}
                  {(isSourcing || isRnd) && (
                    <button onClick={() => handleApproveCommodity8B(commodity)}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                      Approve {commodity} 8B (Simulate Supplier Upload + Approve)
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-xs font-semibold">Complete — approved by {commodityJR.approved_by}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})()}
```

- [ ] **Step 4: Also add commodity filter chips to 8A tab**

Same pattern as Task 8 Step 4 — add filter chips above the ComponentApprovalBoard in 8A, filtering mould components by commodity using initiation data.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/mould-design/page.tsx
git commit -m "feat(ntd): Stage 8 — per-commodity 8B joint review + commodity filter in 8A"
```

---

## Task 10: Stage 9 Manufacturing — Per-Commodity Dashboard

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/page.tsx`

- [ ] **Step 1: Make manufacturing track per-commodity status**

The existing `NTDMfgData` is single. For the demo, we'll keep single `ntd_mfg_{id}` for the combined view but track per-commodity completion using a separate simple key. Add a helper:

In `ntd/[id]/page.tsx`:
```ts
const mfgByCommodityKey = `ntd_mfg_commodity_${id}`
const getMfgByCommodity = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(mfgByCommodityKey) ?? "{}") } catch { return {} }
}
```

- [ ] **Step 2: Update handleMfgComplete to require all commodities**

Replace `handleMfgComplete`:
```ts
const handleMfgComplete = (commodity?: string) => {
  if (!mfgData) return
  if (commodity) {
    const current = getMfgByCommodity()
    const updated = { ...current, [commodity]: true }
    localStorage.setItem(mfgByCommodityKey, JSON.stringify(updated))
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_complete", `${commodity} manufacturing complete`)

    const activeCommodities = getActiveCommodities(id)
    const allComplete = activeCommodities.every(c => updated[c] === true)
    if (allComplete) {
      setNTDMfg(id, { ...mfgData, status: "complete", completed_by: currentRole, completed_at: new Date().toISOString() })
      advanceNTDStage(id, 10, currentRole, ntdRole)
      appendActivity(id, currentRole, ntdRole, 9, "manufacturing_complete", "All commodity manufacturing complete — advancing to Stage 10")
    }
  } else {
    // Legacy single-commodity path
    setNTDMfg(id, { ...mfgData, status: "complete", completed_by: currentRole, completed_at: new Date().toISOString() })
    advanceNTDStage(id, 10, currentRole, ntdRole)
    appendActivity(id, currentRole, ntdRole, 9, "manufacturing_complete", "Manufacturing marked complete")
  }
  reload()
}
```

- [ ] **Step 3: Update Stage 9 card JSX with per-commodity tracking**

In the Stage 9 card, show a per-commodity status panel after the existing manufacturing status/updates:

```tsx
{/* Per-commodity completion tracking */}
{isSourcing && mfgData?.status === "in_progress" && (
  <div className="space-y-2 mt-4">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commodity Status</p>
    {getActiveCommodities(id).map(commodity => {
      const isDone = getMfgByCommodity()[commodity] === true
      const supplierName = record.selectedSuppliers?.[commodity] ?? commodity
      return (
        <div key={commodity} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${isDone ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <div>
            <p className="text-xs font-semibold text-slate-800">{commodity}</p>
            <p className="text-[10px] text-slate-400">{supplierName}</p>
          </div>
          {isDone
            ? <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Complete</span>
            : (
              <button onClick={() => handleMfgComplete(commodity)}
                className="text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                Mark Complete
              </button>
            )
          }
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): Stage 9 — per-commodity manufacturing completion tracking"
```

---

## Task 11: Stage 10 Trials — Redesign Integration

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/trials/page.tsx`

The trials page already has the trial initiation, sample dispatch, and 7-parameter testing infrastructure. This task adds the redesign integration on partial fail.

- [ ] **Step 1: Import redesign helpers and mould helpers**

Ensure at the top:
```ts
import { ..., setNTDRedesign, getNTDRedesign, setNTDMould, canInitiateNewTrial, getFailedComponentsFromTrial } from "@/lib/ntd"
import type { ..., NTDRedesignData } from "@/types/ntd"
```

- [ ] **Step 2: Add handleTriggerRedesign**

After a trial result is submitted with `partial_fail`, call this to write the redesign entry and unlock failed components in mould data:

```ts
const handleTriggerRedesign = (trialNo: number, failedComponentIds: string[]) => {
  const existingRedesign = getNTDRedesign(id) ?? { redesign_rounds: [] }
  const roundNo = existingRedesign.redesign_rounds.length + 1
  const mouldData = getNTDMould(id)

  // Create redesign entry
  const newRedesign: NTDRedesignData = {
    redesign_rounds: [
      ...existingRedesign.redesign_rounds,
      {
        round_no: roundNo,
        triggered_by_trial: trialNo,
        failed_component_ids: failedComponentIds,
        re_enters: "STAGE_8A_MOULD_DESIGN_ONLY",
        mould_redesign_round_ref: (mouldData?.redesign_round ?? 0) + 1,
        resolved_at: "",
      }
    ]
  }
  setNTDRedesign(id, newRedesign)
  appendActivity(id, currentRole, ntdRole, 10, "redesign_triggered",
    `Redesign Round ${roundNo} triggered by Trial T${trialNo} — ${failedComponentIds.length} component(s) to rework`,
    { trial_no: trialNo, round_no: roundNo })

  // Unlock failed components in mould data — reset their status so they re-enter 8A
  if (mouldData) {
    const updatedMould = {
      ...mouldData,
      redesign_round: (mouldData.redesign_round ?? 0) + 1,
      stage_complete: false,
      components: mouldData.components.map(c => {
        if (!failedComponentIds.includes(c.componentId)) return c
        // Reset to pending so supplier can resubmit mould
        return {
          ...c,
          final_status: "pending" as const,
          locked: false,
          mould_3d: createVersionedFile("Mould 3D", "", "system"),
          mfa_ppt: createVersionedFile("MFA PPT", "", "system"),
          rnd_review: { verdict: "pending" as const, comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: "" },
          sourcing_review: { verdict: "pending" as const, comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: "" },
          iteration_no: (c.iteration_no ?? 1) + 1,
        }
      }),
    }
    setNTDMould(id, updatedMould)
  }

  reload()
}
```

- [ ] **Step 3: Call handleTriggerRedesign when trial result is partial_fail**

Find the code where `result: "partial_fail"` is set on a trial (after testing submission) and add:

```ts
// After setting trial result to partial_fail:
const failed = getFailedComponentsFromTrial(id, trialNo)
if (failed.length > 0) {
  handleTriggerRedesign(trialNo, failed)
}
```

- [ ] **Step 4: Add redesign status panel to Trials page**

After the trial tabs, add a redesign status section showing which components are in redesign:

```tsx
{(() => {
  const redesignData = getNTDRedesign(id)
  if (!redesignData?.redesign_rounds?.length) return null
  const latestRound = redesignData.redesign_rounds[redesignData.redesign_rounds.length - 1]
  const isResolved = !!latestRound.resolved_at
  const mouldData = getNTDMould(id)

  return (
    <div className={`border rounded-xl overflow-hidden ${isResolved ? "border-emerald-200" : "border-amber-200"}`}>
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isResolved ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <span className="text-xs font-bold text-slate-700">
          Redesign Round {latestRound.round_no} — triggered by Trial T{latestRound.triggered_by_trial}
        </span>
        {isResolved
          ? <span className="text-[10px] font-semibold text-emerald-700">Resolved</span>
          : <span className="text-[10px] font-semibold text-amber-700">In Progress</span>}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Failed components re-entering Stage 8A:
        </p>
        {latestRound.failed_component_ids.map(cid => {
          const mouldComp = mouldData?.components.find(c => c.componentId === cid)
          const status = mouldComp?.final_status ?? "pending"
          const isReady = status === "approved"
          return (
            <div key={cid} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isReady ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
              <span className="text-xs font-semibold text-slate-800">{cid}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  status === "approved" ? "bg-emerald-100 text-emerald-700"
                  : status === "under_review" ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
                }`}>
                  {isReady ? "Ready for Retrial" : status.replace(/_/g, " ")}
                </span>
                {!isReady && (
                  <Link href={`/ntd/${id}/mould-design`}
                    className="text-[10px] font-semibold text-indigo-700 hover:underline">
                    → Stage 8A
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})()}
```

- [ ] **Step 5: Gate "Initiate New Trial" button on canInitiateNewTrial**

Find the "Initiate New Trial" button and ensure it's disabled when redesign is pending. The `canInitiateNewTrial(id)` helper from `lib/ntd.ts` already handles this logic:

```tsx
<button
  onClick={handleInitiateTrial}
  disabled={!canInitiateNewTrial(id) || (trialsData?.trials?.at(-1)?.status !== "complete" && (trialsData?.trials?.length ?? 0) > 0)}
  className="... disabled:opacity-40 disabled:cursor-not-allowed ...">
  Initiate {getNextTrialNo(id) === 1 ? "First" : `T${getNextTrialNo(id)}`} Trial
</button>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/trials/page.tsx
git commit -m "feat(ntd): Stage 10 — redesign integration on trial partial-fail, retrial gate"
```

---

## Task 12: Stage 11 — Per-Commodity Inspection

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/page.tsx`

The `NTDStage11Data.inspection` is now `Record<string, {...}> | null`.

- [ ] **Step 1: Update Stage 11 card to show per-commodity inspection checklist**

In the Stage 11 card, sub-step 1 section (where `inspection` is shown), replace with:

```tsx
{/* Sub-step 1 — per-commodity inspection */}
{s11Step === 1 && (
  <div className="space-y-4">
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-3">
        Sub-step 1: Final Inspection Reports
      </p>
      <p className="text-xs text-slate-500 mb-3">Each supplier uploads their inspection report via the supplier portal.</p>
      <div className="space-y-2">
        {getActiveCommodities(id).map(commodity => {
          const inspection = s11Data?.inspection?.[commodity]
          const supplierName = record.selectedSuppliers?.[commodity] ?? commodity
          const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
          const portalUrl = `${baseUrl}/supplier/ntd/${id}?commodity=${encodeURIComponent(commodity)}`
          return (
            <div key={commodity} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${inspection ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
              <div>
                <p className="text-xs font-semibold text-slate-800">{commodity}</p>
                <p className="text-[10px] text-slate-400">{supplierName}</p>
              </div>
              <div className="flex items-center gap-2">
                {inspection
                  ? <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Submitted</span>
                  : (
                    <>
                      <span className="text-[10px] text-slate-400">Awaiting...</span>
                      <CopyButton text={portalUrl} />
                    </>
                  )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    {allInspectionsSubmitted(id) && (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <p className="text-sm text-emerald-800">All inspections received — proceeding to sub-step 2</p>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: Import allInspectionsSubmitted at top of the file**

```ts
import { ..., allInspectionsSubmitted } from "@/lib/ntd"
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): Stage 11 — per-commodity inspection report checklist"
```

---

## Task 13: Supplier Portal — Commodity Selector + All Stages

**Files:**
- Modify: `src/app/supplier/ntd/[id]/page.tsx`

- [ ] **Step 1: Add commodity selector state (read from URL param or dropdown)**

At the top of `SupplierNTDPortal`, add:
```ts
const searchParams = useSearchParams()
const urlCommodity = searchParams.get("commodity") ?? ""
const [selectedCommodity, setSelectedCommodity] = useState("")

// On load, set commodity from URL param or first active commodity
useEffect(() => {
  const r = getNTDRecord(id)
  if (!r) return
  const init = getNTDInitiation(id)
  const commodities = [...new Set(init?.components?.map(c => c.commodity) ?? [])]
  if (urlCommodity && commodities.includes(urlCommodity)) {
    setSelectedCommodity(urlCommodity)
  } else if (commodities.length > 0) {
    setSelectedCommodity(commodities[0])
  }
  // ... rest of existing useEffect
}, [id, urlCommodity])
```

- [ ] **Step 2: Add commodity selector dropdown at top of page JSX**

After the portal header (inside `SupplierPortalShell`), add:

```tsx
{/* Commodity selector — demo only, no real auth */}
{(() => {
  const init = getNTDInitiation(id)
  const commodities = [...new Set(init?.components?.map(c => c.commodity) ?? [])]
  if (commodities.length <= 1) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-xs font-semibold text-amber-800">Viewing as:</span>
      <select value={selectedCommodity}
        onChange={e => setSelectedCommodity(e.target.value)}
        className="text-xs font-semibold border border-amber-300 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400">
        {commodities.map(c => (
          <option key={c} value={c}>{c} Supplier</option>
        ))}
      </select>
      <span className="text-[10px] text-amber-600">(Demo — select supplier view)</span>
    </div>
  )
})()}
```

- [ ] **Step 3: Filter components by selectedCommodity throughout**

Wherever `handoff?.components` or `dfmData?.components` is mapped, add a filter:

```ts
const myComponents = handoff?.components?.filter(c => c.commodity === selectedCommodity) ?? []
const myDFMComponents = dfmData?.components?.filter(c =>
  (handoff?.components ?? []).find(hc => hc.componentId === c.componentId)?.commodity === selectedCommodity
) ?? []
```

Apply the same pattern for mould components.

- [ ] **Step 4: Update Stage 6 acknowledgement to be per-commodity**

Find `handleAcknowledge` and replace:
```ts
const handleAcknowledge = () => {
  if (!handoff || !selectedCommodity) return
  const updated = {
    ...handoff,
    supplier_acknowledged_by_commodity: {
      ...(handoff.supplier_acknowledged_by_commodity ?? {}),
      [selectedCommodity]: true,
    },
  }
  const activeCommodities = [...new Set(handoff.components?.map(c => c.commodity) ?? [])]
  const allAcked = activeCommodities.every(c => updated.supplier_acknowledged_by_commodity?.[c])
  if (allAcked) {
    updated.supplier_acknowledged = true
    updated.supplier_acknowledged_at = new Date().toISOString()
  }
  setNTDHandoff(id, updated)
  appendActivity(id, "supplier", "supplier", 6, "supplier_acknowledged", `${selectedCommodity} supplier acknowledged design handoff`)
  setAcknowledged(true)
}
```

- [ ] **Step 5: Update Stage 11 inspection to be per-commodity**

Find the inspection link upload handler and update:
```ts
const handleSubmitInspection = () => {
  if (!inspectionLink.trim() || !selectedCommodity) return
  const s11 = getNTDStage11(id) ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
  const updatedInspection = {
    ...(s11.inspection ?? {}),
    [selectedCommodity]: {
      report: createVersionedFile("Final Inspection Report", inspectionLink.trim(), "supplier"),
      submitted_by: "supplier",
      submitted_at: new Date().toISOString(),
    }
  }
  setNTDStage11(id, { ...s11, inspection: updatedInspection })
  appendActivity(id, "supplier", "supplier", 11, "supplier_submitted", `${selectedCommodity} inspection report submitted`)
  setInspectionLink("")
}
```

- [ ] **Step 6: Add a visible note showing which components this supplier is responsible for**

After the commodity selector, when handoff data exists:
```tsx
{selectedCommodity && handoff?.components && (
  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
      Your Components ({selectedCommodity})
    </p>
    <div className="flex flex-wrap gap-2">
      {handoff.components.filter(c => c.commodity === selectedCommodity).map(c => (
        <span key={c.componentId} className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
          {c.componentId} — {c.name}
        </span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/app/supplier/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): supplier portal — commodity selector and per-commodity scoping across stages 6-11"
```

---

## Task 14: Vendor RFQ Portal — Commodity-Scoped View

**Files:**
- Modify: `src/app/rfq/ntd/[ntdId]/[vendorToken]/page.tsx`

- [ ] **Step 1: Show only components matching vendor's commodity**

After the vendor token lookup resolves `vendor` object, the vendor has a `commodity` field. Display only matching components:

```tsx
{/* Components relevant to this vendor's commodity */}
{initData?.components && vendor.commodity && (
  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
      Your Components ({vendor.commodity})
    </p>
    <div className="flex flex-wrap gap-2">
      {initData.components.filter(c => c.commodity === vendor.commodity).map(c => (
        <span key={c.componentId} className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
          {c.componentId} — {c.name}
        </span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Add the full quotation form if not already complete**

Ensure the existing `handleSubmitInitialQuote` writes correctly to `NTDQuotationData`:

```ts
const handleSubmitInitialQuote = () => {
  if (!amount || !leadTime) return
  const existing = quotationData ?? {}
  const now = new Date().toISOString()
  setNTDQuotation(ntdId, {
    ...existing,
    [vendorId]: {
      quotation: {
        amount: Number(amount),
        currency,
        lead_time_days: Number(leadTime),
        doc_link: docLink,
        notes,
        submitted_at: now,
        last_updated_at: now,
      },
      thread: existing[vendorId]?.thread ?? [],
      status: "quotation_received",
    },
  })
  appendActivity(ntdId, vendor.vendor_name, "vendor", 4, "quotation_submitted",
    `Quotation submitted: ${currency} ${Number(amount).toLocaleString()} — ${leadTime}d lead time`,
    { vendor_id: vendorId })
  setAmount(""); setLeadTime(""); setDocLink(""); setNotes("")
}
```

- [ ] **Step 3: Ensure vendor can post thread messages**

Add counter-message submission handler:
```ts
const handlePostCounter = () => {
  if (!counterNote.trim() || !quotationData) return
  const existing = quotationData[vendorId] ?? { quotation: undefined, thread: [], status: "sent" as const }
  setNTDQuotation(ntdId, {
    ...quotationData,
    [vendorId]: {
      ...existing,
      status: "negotiating",
      thread: [...existing.thread, {
        message_id: String(Date.now()),
        author_name: vendor.vendor_name,
        author_type: "vendor" as const,
        text: counterNote.trim(),
        created_at: new Date().toISOString(),
      }]
    }
  })
  appendActivity(ntdId, vendor.vendor_name, "vendor", 4, "negotiation_round",
    `Vendor response: "${counterNote.trim()}"`, { vendor_id: vendorId })
  setCounterNote(""); setShowCounterForm(false)
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/rfq/ntd/\[ntdId\]/\[vendorToken\]/page.tsx
git commit -m "feat(ntd): vendor RFQ portal — commodity-scoped component view + quotation + thread"
```

---

## Task 15: Redesign Supplier Portal

**Files:**
- Modify: `src/app/supplier/ntd/redesign/[id]/page.tsx`

This page is the supplier's DFM resubmission portal after a trial failure. Same pattern as the main supplier portal's DFM section but filtered to only components in `redesign_rounds[latest].failed_component_ids`.

- [ ] **Step 1: Read the current state of the redesign portal**

Check what's in the file. If it's a stub, implement from scratch.

- [ ] **Step 2: Implement the redesign DFM submission form**

```tsx
"use client"
import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle2, ExternalLink, Upload } from "lucide-react"
import { SupplierPortalShell } from "@/components/SupplierPortalShell"
import {
  getNTDRecord, getNTDRedesign, getNTDDFM, setNTDDFM, getNTDHandoff,
  appendActivity, createVersionedFile, addFileVersion,
} from "@/lib/ntd"
import type { NTDDFMComponent } from "@/types/ntd"

export default function RedesignSupplierPortal() {
  const params = useParams()
  const id = params.id as string
  const searchParams = useSearchParams()
  const commodity = searchParams.get("commodity") ?? ""
  const [uploads, setUploads] = useState<Record<string, { ppt: string; design_3d: string }>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 3000)
    return () => clearInterval(t)
  }, [])

  const record = getNTDRecord(id)
  const redesignData = getNTDRedesign(id)
  const dfmData = getNTDDFM(id)
  const handoffData = getNTDHandoff(id)

  if (!record || !redesignData?.redesign_rounds?.length) return (
    <SupplierPortalShell portalLabel="Redesign Portal" maxWidth="2xl">
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400">No active redesign found.</p>
      </div>
    </SupplierPortalShell>
  )

  const latestRound = redesignData.redesign_rounds[redesignData.redesign_rounds.length - 1]
  const failedIds = latestRound.failed_component_ids

  // Filter to this commodity's failed components
  const myCommodityFailedIds = commodity
    ? failedIds.filter(cid => handoffData?.components?.find(c => c.componentId === cid)?.commodity === commodity)
    : failedIds

  const handleRedesignUpload = (componentId: string) => {
    const u = uploads[componentId]
    if (!u?.ppt || !u?.design_3d || !dfmData) return

    const updated = {
      ...dfmData,
      components: dfmData.components.map((c: NTDDFMComponent) => {
        if (c.componentId !== componentId) return c
        return {
          ...c,
          ppt: c.ppt.versions.length === 0 || !c.ppt.versions[0]?.link
            ? createVersionedFile("DFM PPT", u.ppt, "supplier")
            : addFileVersion(c.ppt, u.ppt, "supplier", `Redesign round ${latestRound.round_no}`),
          design_3d: c.design_3d.versions.length === 0 || !c.design_3d.versions[0]?.link
            ? createVersionedFile("3D Design", u.design_3d, "supplier")
            : addFileVersion(c.design_3d, u.design_3d, "supplier", `Redesign round ${latestRound.round_no}`),
          final_status: "under_review" as const,
          iteration_no: (c.iteration_no ?? 1) + 1,
        }
      })
    }
    setNTDDFM(id, updated)
    appendActivity(id, "supplier", "supplier", 7, "supplier_submitted",
      `Redesign submission for ${componentId} (Round ${latestRound.round_no})`,
      { component_id: componentId, round_no: latestRound.round_no })
    setUploads(prev => { const n = {...prev}; delete n[componentId]; return n })
  }

  return (
    <SupplierPortalShell portalLabel="Redesign Submission" maxWidth="2xl">
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            Redesign Round {latestRound.round_no} — triggered by Trial T{latestRound.triggered_by_trial}
          </p>
          {commodity && <p className="text-xs text-amber-700 mt-0.5">Viewing: {commodity} components</p>}
        </div>

        {myCommodityFailedIds.map(cid => {
          const dfmComp = dfmData?.components.find(c => c.componentId === cid)
          const isSubmitted = dfmComp?.final_status === "under_review" || dfmComp?.final_status === "approved"
          const compName = handoffData?.components?.find(c => c.componentId === cid)?.name ?? cid
          const u = uploads[cid] ?? { ppt: "", design_3d: "" }

          return (
            <div key={cid} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{cid} — {compName}</p>
                  <p className="text-[10px] text-slate-400">{commodity} · Redesign submission required</p>
                </div>
                {isSubmitted && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Under Review
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {isSubmitted ? (
                  <p className="text-xs text-slate-500">Redesign submitted — awaiting R&D review.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DFM PPT Link</label>
                        <input type="text" autoComplete="off" placeholder="Drive / SharePoint URL"
                          value={u.ppt}
                          onChange={e => setUploads(prev => ({ ...prev, [cid]: { ...prev[cid] ?? { ppt: "", design_3d: "" }, ppt: e.target.value } }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3D Design Link</label>
                        <input type="text" autoComplete="off" placeholder="Drive / SharePoint URL"
                          value={u.design_3d}
                          onChange={e => setUploads(prev => ({ ...prev, [cid]: { ...prev[cid] ?? { ppt: "", design_3d: "" }, design_3d: e.target.value } }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      </div>
                    </div>
                    <button onClick={() => handleRedesignUpload(cid)}
                      disabled={!u.ppt.trim() || !u.design_3d.trim()}
                      className="flex items-center gap-2 text-sm font-semibold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                      <Upload className="w-4 h-4" /> Submit Redesign
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SupplierPortalShell>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/supplier/ntd/redesign/\[id\]/page.tsx
git commit -m "feat(ntd): redesign supplier portal — DFM resubmission for trial-failed components"
```

---

## Task 16: Update ntd.md with Per-Commodity Addendum

**Files:**
- Modify: `.claude/rules/ntd.md`

- [ ] **Step 1: Append addendum to ntd.md**

Add at the end of `.claude/rules/ntd.md`:

```markdown
---

## ADDENDUM — Per-Commodity Multi-Supplier Model (added 2026-06-11)

### What Changed

The original spec assumed a single supplier per NTD. The implemented model supports **one supplier per commodity** present in the NTD's component list.

### Commodities

`NTD_COMMODITIES = ["Sheet Metal", "Plastics", "EPS"]` — defined in `src/types/ntd.ts`.

Each `NTDComponent` now carries `commodity: NTDCommodity`. Set at Stage 1 (creation wizard), locked at Stage 6.

### Key Type Changes

| Type | Change |
|------|--------|
| `NTDComponent` | Added `commodity: NTDCommodity` |
| `NTDInitiationData` | Added `components: NTDComponent[]` |
| `NTDRFQVendor` | Added `commodity: string` |
| `NTDRecord` | Added `selectedSuppliers?: Record<string, string>` (commodity → vendor_name) |
| `NTDSelectionData` | Replaced single `selected_vendor_id` with `selections: Record<string, NTDCommoditySelection>` |
| `NTDHandoffData` | Added `supplier_acknowledged_by_commodity?: Record<string, boolean>` |
| `NTDStage11Data.inspection` | Changed from single object to `Record<string, {...}>` keyed by commodity |

### Stage Gate Changes

Stage 3→4: `allCommoditiesHaveRFQ(ntdId)` — at least one sent RFQ per commodity
Stage 4→5: `allCommoditiesHaveFinalized(ntdId)` — at least one finalized vendor per commodity
Stage 5→6: `allCommoditiesSelected(ntdId)` — one selection per commodity + both approvals
Stage 6→7: `allCommoditiesAcknowledged(ntdId)` — all commodity-suppliers acknowledged handoff
Stage 11 sub-step 1: `allInspectionsSubmitted(ntdId)` — all commodity-suppliers submitted report

All helpers in `src/lib/ntd.ts`.

### Corrected Stage 10 Redesign Loop

Trial partial-fail → `handleTriggerRedesign()`:
1. Failed components enter `redesign_pending` via `NTDRedesignData.redesign_rounds` entry
2. Supplier resubmits via `/supplier/ntd/redesign/[id]?commodity=<commodity>` (same DFM pattern, R&D-only review)
3. R&D approves via DFM page → component automatically re-enters Stage 8A (mould) by resetting its `final_status` to "pending" in `NTDMouldData`
4. Stage 8A approved → `canInitiateNewTrial()` returns true → next trial allowed

DFM (Stage 7) is NEVER revisited — only Stage 8A mould design re-enters on trial failure.

### Supplier Portal Commodity Selector

`/supplier/ntd/[id]` has a demo-only commodity dropdown at the top. Not real auth. URL param `?commodity=Sheet+Metal` pre-selects on link copy from the internal portal.

Per-commodity 8B joint review state stored per-commodity under keys `ntd_mould_8b_${id}_${commodity}` in localStorage.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/ntd.md
git commit -m "docs(ntd): addendum — per-commodity multi-supplier model and redesign loop"
```

---

## Task 17: Final Verification

**Files:** All modified files.

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: 0 errors, warnings acceptable.

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5001`.

- [ ] **Step 4: Smoke test — create NTD with 3 commodities**

1. Log in as `rnd_engineer`
2. Go to `/ntd/new`, create NTD:
   - Title: "Test NTD — Multi-Commodity"
   - Add 3 components: "Core Insert" (Sheet Metal), "Foam Pad" (EPS), "Housing Shell" (Plastics)
   - Each with a spec link (any text URL)
3. Submit → verify redirects to `/ntd/[id]` at Stage 2

- [ ] **Step 5: Smoke test — Stage 3 RFQ dispatch**

1. Switch role to `sourcing` (via TopNav role switcher)
2. On Stage 3 card: verify 3 commodity sections appear
3. Select 1 vendor per commodity, send RFQ for each
4. Verify "Proceed to Quotation Review" button activates only after all 3 commodities have sent RFQs

- [ ] **Step 6: Smoke test — Stage 5 per-commodity selection**

1. In vendor portal (`/rfq/ntd/[id]/[token]`) submit quotations for each vendor
2. As sourcing, finalize each vendor's quotation
3. On Stage 5: verify 3 commodity sections appear, select one vendor per commodity
4. Switch to R&D, verify acknowledgement screen shows all 3 selections
5. Acknowledge → verify advance to Stage 6

- [ ] **Step 7: Smoke test — Trial failure → redesign loop**

1. Advance to Stage 10 (use demo advance buttons if needed)
2. Initiate Trial T1
3. Submit test results with at least one component failing
4. Verify redesign panel appears with failed component(s)
5. Go to mould design page → verify failed component appears as "pending" (unlocked)
6. Approve mould component → verify `canInitiateNewTrial()` becomes true
7. Initiate Trial T2 → pass all → verify advance to Stage 11

- [ ] **Step 8: Commit final state**

```bash
git add -A
git commit -m "feat(ntd): complete 11-stage NTD UI with per-commodity multi-supplier model"
```
