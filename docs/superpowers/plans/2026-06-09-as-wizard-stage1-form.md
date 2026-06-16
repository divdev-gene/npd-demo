# AS Wizard Stage 1 Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Alternative Supplier wizard (Step 2) to collect full Stage 1 data — objective-specific sub-fields, customer specifics, and supplier details — and write it to `AS_STAGE1_KEY` at submit time so the detail page opens directly at Stage 2 with Stage 1 already complete.

**Architecture:** All new state lives in `npd/new/page.tsx`. The existing ALT_SUPPLIER right-column section is replaced with the full form. On `handleConfirmDispatch`, the AS path writes `AS_STAGE1_KEY` and creates the NPD at `stage: 2` (not 1). The detail page `[id]/page.tsx` gets an extended `ASStage1Data` type and an updated Stage 1 display card. No new files created.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind v4, shadcn/ui, localStorage

---

## File Map

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add `ASStage1Data` type export |
| `src/app/(internal)/npd/new/page.tsx` | New AS state, extended form, submit logic, Step 3 review |
| `src/app/(internal)/npd/[id]/page.tsx` | Update `asStage1Data` type + Stage 1 display card |

---

### Task 1: Add `ASStage1Data` type to mockData.ts

**Files:**
- Modify: `src/lib/mockData.ts` (near line 389, after `AS_STAGE1_KEY` constant)

- [ ] **Step 1: Add the type**

Open `src/lib/mockData.ts`. After the line `export const AS_STAGE1_KEY = "as_stage1_v1"` (line ~389), add:

```ts
export type ASCostChecklistItem = {
  label: string
  oldPrice: number
  newPrice: number
}

export type ASStage1Data = {
  supplierName: string
  reason: string
  docsLink?: string
  submittedBy: string
  submittedAt: number
  changeObjective: string
  objectiveDetails?: {
    // cost_innovation
    checklist?: ASCostChecklistItem[]
    // capacity_expansion
    location?: string
    newBusinessOrder?: string
    // compliance_regulatory
    pasQcoReference?: string
    dmNotification?: string
    // new_supply
    newSupplyDetails?: string
  }
  customerSpecific?: {
    enabled: boolean
    grade?: string
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat(as): add ASStage1Data type to mockData"
```

---

### Task 2: Add AS-specific state variables to wizard

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx`

- [ ] **Step 1: Add state**

In `NewRequestWizard`, after the `changeObjective` state line (~line 116), add:

```ts
// AS-specific Stage 1 state
type CostRow = { id: string; label: string; oldPrice: string; newPrice: string }
const [asCostChecklist, setAsCostChecklist] = useState<CostRow[]>([{ id: "row-1", label: "", oldPrice: "", newPrice: "" }])
const [asCapacityLocation, setAsCapacityLocation] = useState("")
const [asCapacityNBO, setAsCapacityNBO]           = useState("")
const [asCompliancePAS, setAsCompliancePAS]       = useState("")
const [asComplianceDM, setAsComplianceDM]         = useState("")
const [asNewSupplyDetails, setAsNewSupplyDetails] = useState("")
const [asCustomerSpecific, setAsCustomerSpecific] = useState(false)
const [asCustomerGrade, setAsCustomerGrade]       = useState("")
const [asSupplierName, setAsSupplierName]         = useState("")
const [asReason, setAsReason]                     = useState("")
const [asDocsLink, setAsDocsLink]                 = useState("")
```

Note: `CostRow` is defined inline in the component as a local type — do NOT add it to mockData.ts (it's UI state only; `ASCostChecklistItem` in mockData is the persisted shape).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 3: Add AS_STAGE1_KEY to wizard import

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` line 18

- [ ] **Step 1: Update import**

Change:
```ts
import { getStageName, REJECTED_PARTS_KEY, DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD, VENDOR_CATALOG, ECN_STAGE1_KEY, NPD_BUNDLE_KEY } from "@/lib/mockData"
```
To:
```ts
import { getStageName, REJECTED_PARTS_KEY, DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD, VENDOR_CATALOG, ECN_STAGE1_KEY, NPD_BUNDLE_KEY, AS_STAGE1_KEY, type ASStage1Data } from "@/lib/mockData"
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 4: Update `handleConfirmDispatch` for ALT_SUPPLIER

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` (~lines 260–300)

- [ ] **Step 1: Replace the single-record path start stage + add AS_STAGE1_KEY write**

Find this block (~line 260):
```ts
// ── Single-record path (NCD, ECN, ALT_SUPPLIER, NTD) ─────────────────
const startStage = isECN || isAltSup ? 1 : 2
addNPD({
  ...
  stage: startStage,
  stageName: getStageName(startStage, workTypeLabel),
  ...
  existingPartNumber: existingPartNumber || undefined,
  ecnPartNumber: isECN ? ecnPartNumber : undefined,
  ecnPartName: isECN ? ecnPartName : undefined,
  ecnChangeDescription: isECN ? ecnChangeDescription : undefined,
})
if (isECN) {
  const entry = { submittedBy: raisedBy, submittedAt: Date.now() }
  const raw = localStorage.getItem(ECN_STAGE1_KEY)
  const all: Record<string, typeof entry> = raw ? JSON.parse(raw) : {}
  all[newId] = entry
  localStorage.setItem(ECN_STAGE1_KEY, JSON.stringify(all))
}
router.push('/archive')
```

Replace with:
```ts
// ── Single-record path (NCD, ECN, ALT_SUPPLIER, NTD) ─────────────────
// AS starts at stage 2 — Stage 1 data is collected in the wizard itself
const startStage = isECN ? 1 : isAltSup ? 2 : 2
addNPD({
  id: newId,
  itemName: isECN ? (ecnPartName || "ECN Component") : (itemName || "New Component"),
  itemCategory: isECN ? "Engineering Change" : (effectiveCommodity || "Others"),
  productLine: productLine || "Unspecified",
  typeOfWork: workTypeLabel,
  rAndDDivision: "Rajpura RAC",
  stage: startStage,
  stageName: getStageName(startStage, workTypeLabel),
  tatHealth: "green",
  tatDaysRemaining: effectiveTat,
  totalTat: effectiveTat,
  spoc: isECN ? "Rohan Desai" : (SPOC_NAME_MAP[commodity] || "General Sourcing"),
  supplier: isECN ? ecnSupplier : isAltSup ? asSupplierName.trim() : "Pending Assignment",
  priority: priorityLabel,
  gradeA: false,
  tqrScore: null,
  cost: null,
  raisedBy,
  driveLink: driveLink || undefined,
  sampleQty: sampleQty ? Number(sampleQty) : undefined,
  createdAt: new Date().toISOString(),
  manufacturingLocation: manufacturingLocation || undefined,
  remarks: remarks || undefined,
  tatDevelopment: devTat || undefined,
  tatProduction: prodTat || undefined,
  existingPartNumber: existingPartNumber || undefined,
  ecnPartNumber: isECN ? ecnPartNumber : undefined,
  ecnPartName: isECN ? ecnPartName : undefined,
  ecnChangeDescription: isECN ? ecnChangeDescription : undefined,
})
if (isECN) {
  const entry = { submittedBy: raisedBy, submittedAt: Date.now() }
  const raw = localStorage.getItem(ECN_STAGE1_KEY)
  const all: Record<string, typeof entry> = raw ? JSON.parse(raw) : {}
  all[newId] = entry
  localStorage.setItem(ECN_STAGE1_KEY, JSON.stringify(all))
}
if (isAltSup) {
  const objectiveDetails: ASStage1Data["objectiveDetails"] = {}
  if (changeObjective === "Cost Innovation") {
    objectiveDetails.checklist = asCostChecklist
      .filter(r => r.label.trim())
      .map(r => ({ label: r.label.trim(), oldPrice: Number(r.oldPrice) || 0, newPrice: Number(r.newPrice) || 0 }))
  } else if (changeObjective === "Capacity Expansion") {
    objectiveDetails.location = asCapacityLocation.trim() || undefined
    objectiveDetails.newBusinessOrder = asCapacityNBO.trim() || undefined
  } else if (changeObjective === "Compliance & Regulatory") {
    objectiveDetails.pasQcoReference = asCompliancePAS.trim() || undefined
    objectiveDetails.dmNotification = asComplianceDM.trim() || undefined
  } else if (changeObjective === "New Supply") {
    objectiveDetails.newSupplyDetails = asNewSupplyDetails.trim() || undefined
  }
  const asEntry: ASStage1Data = {
    supplierName: asSupplierName.trim(),
    reason: asReason.trim(),
    docsLink: asDocsLink.trim() || undefined,
    submittedBy: raisedBy,
    submittedAt: Date.now(),
    changeObjective,
    objectiveDetails: Object.keys(objectiveDetails).length ? objectiveDetails : undefined,
    customerSpecific: { enabled: asCustomerSpecific, grade: asCustomerSpecific ? asCustomerGrade.trim() || undefined : undefined },
  }
  const rawAs = localStorage.getItem(AS_STAGE1_KEY)
  const allAs: Record<string, ASStage1Data> = rawAs ? JSON.parse(rawAs) : {}
  allAs[newId] = asEntry
  localStorage.setItem(AS_STAGE1_KEY, JSON.stringify(allAs))
  router.push(`/npd/${newId}`)
  return
}
router.push('/archive')
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 5: Update `step2Valid` for ALT_SUPPLIER

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` (~line 316–318)

- [ ] **Step 1: Add asSupplierName + asReason to ALT_SUPPLIER validation**

Find:
```ts
    : typeOfWork === "ALT_SUPPLIER"
    ? (!!itemName && !!productLine && !!driveLink && !!drawingFile && !!priority && tatValid && !!manufacturingLocation && !!existingPartNumber.trim() && !!changeObjective)
```

Replace with:
```ts
    : typeOfWork === "ALT_SUPPLIER"
    ? (!!itemName && !!productLine && !!driveLink && !!drawingFile && !!priority && tatValid && !!manufacturingLocation && !!existingPartNumber.trim() && !!changeObjective && !!asSupplierName.trim() && !!asReason.trim())
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 6: Replace ALT_SUPPLIER right-column section with full form

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` (~lines 1133–1178)

This task replaces the current `{typeOfWork === "ALT_SUPPLIER" && (...)}` block in the right column with the full extended form.

- [ ] **Step 1: Replace the ALT_SUPPLIER section**

Find the exact block (starts with `{/* ALT_SUPPLIER-specific fields */}` and ends with the closing `</>`):

```tsx
            {/* ALT_SUPPLIER-specific fields */}
            {typeOfWork === "ALT_SUPPLIER" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Existing Part Number <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. AMB-PT-2024-0042"
                    value={existingPartNumber}
                    onChange={e => setExistingPartNumber(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    Change Objective <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AS_CHANGE_OBJECTIVES.map(obj => {
                      const Icon = obj.icon
                      const selected = changeObjective === obj.id
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => setChangeObjective(obj.id)}
                          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                            selected
                              ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`mt-0.5 rounded-md p-1.5 ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${selected ? "text-blue-800" : "text-slate-700"}`}>{obj.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{obj.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
```

Replace with:

```tsx
            {/* ALT_SUPPLIER-specific fields */}
            {typeOfWork === "ALT_SUPPLIER" && (
              <>
                {/* Existing Part Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Existing Part Number <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. AMB-PT-2024-0042"
                    value={existingPartNumber}
                    onChange={e => setExistingPartNumber(e.target.value)}
                    className="bg-white"
                  />
                </div>

                {/* Change Objective card picker */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    Change Objective <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AS_CHANGE_OBJECTIVES.map(obj => {
                      const Icon = obj.icon
                      const selected = changeObjective === obj.id
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => setChangeObjective(obj.id)}
                          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                            selected
                              ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`mt-0.5 rounded-md p-1.5 ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${selected ? "text-blue-800" : "text-slate-700"}`}>{obj.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{obj.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Objective-specific sub-fields */}
                {changeObjective === "Cost Innovation" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cost Breakdown Checklist</Label>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[38%]">Item</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[22%]">Old Price (₹)</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[22%]">New Price (₹)</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 w-[14%]">% Change</th>
                            <th className="px-3 py-2 w-[4%]" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {asCostChecklist.map((row, i) => {
                            const old = Number(row.oldPrice) || 0
                            const nw  = Number(row.newPrice) || 0
                            const pct = old > 0 ? ((nw - old) / old) * 100 : null
                            return (
                              <tr key={row.id} className="bg-white">
                                <td className="px-2 py-1.5">
                                  <Input
                                    placeholder="e.g. Raw Material"
                                    value={row.label}
                                    onChange={e => setAsCostChecklist(prev => prev.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                                    className="h-7 text-xs bg-transparent border-slate-200"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={row.oldPrice}
                                    onChange={e => setAsCostChecklist(prev => prev.map((r, j) => j === i ? { ...r, oldPrice: e.target.value } : r))}
                                    className="h-7 text-xs bg-transparent border-slate-200"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={row.newPrice}
                                    onChange={e => setAsCostChecklist(prev => prev.map((r, j) => j === i ? { ...r, newPrice: e.target.value } : r))}
                                    className="h-7 text-xs bg-transparent border-slate-200"
                                  />
                                </td>
                                <td className="px-2 py-1.5 font-semibold">
                                  {pct !== null ? (
                                    <span className={pct < 0 ? "text-emerald-600" : pct > 0 ? "text-red-500" : "text-slate-400"}>
                                      {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setAsCostChecklist(prev => prev.filter((_, j) => j !== i))}
                                    disabled={asCostChecklist.length <= 1}
                                    className="text-slate-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAsCostChecklist(prev => [...prev, { id: `row-${Date.now()}`, label: "", oldPrice: "", newPrice: "" }])}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>
                )}

                {changeObjective === "Capacity Expansion" && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</Label>
                      <Input
                        placeholder="e.g. Jhajjar Plant 1"
                        value={asCapacityLocation}
                        onChange={e => setAsCapacityLocation(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">New Business Order</Label>
                      <textarea
                        rows={3}
                        placeholder="Describe the new business order or volume requirement…"
                        value={asCapacityNBO}
                        onChange={e => setAsCapacityNBO(e.target.value)}
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                    </div>
                  </div>
                )}

                {changeObjective === "Compliance & Regulatory" && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">PAS / QCO Reference</Label>
                      <Input
                        placeholder="e.g. IS 1239, QCO-2024-0078"
                        value={asCompliancePAS}
                        onChange={e => setAsCompliancePAS(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">DM Notification by Supplier</Label>
                      <textarea
                        rows={3}
                        placeholder="Paste or summarise the supplier's DM notification…"
                        value={asComplianceDM}
                        onChange={e => setAsComplianceDM(e.target.value)}
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                    </div>
                  </div>
                )}

                {changeObjective === "New Supply" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Details</Label>
                    <textarea
                      rows={4}
                      placeholder="Describe the new supply addition — geography, volume, risk mitigation rationale…"
                      value={asNewSupplyDetails}
                      onChange={e => setAsNewSupplyDetails(e.target.value)}
                      className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                )}

                {/* Customer Specific */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer Specific</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setAsCustomerSpecific(false); setAsCustomerGrade("") }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${!asCustomerSpecific ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                      >No</button>
                      <button
                        type="button"
                        onClick={() => setAsCustomerSpecific(true)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${asCustomerSpecific ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                      >Yes</button>
                    </div>
                  </div>
                  {asCustomerSpecific && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grade</Label>
                      <Input
                        placeholder="e.g. Godrej, Hero, Voltas"
                        value={asCustomerGrade}
                        onChange={e => setAsCustomerGrade(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Stage 1 Supplier Fields */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                    <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Supplier Details</h3>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Proposed Supplier Name <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. ABC Components Ltd."
                      value={asSupplierName}
                      onChange={e => setAsSupplierName(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason for Alternative <span className="text-red-500">*</span></Label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Current supplier lead time too high, cost reduction opportunity…"
                      value={asReason}
                      onChange={e => setAsReason(e.target.value)}
                      className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Supporting Documents Link</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="https://drive.google.com/…"
                        type="url"
                        value={asDocsLink}
                        onChange={e => setAsDocsLink(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(internal\)/npd/new/page.tsx src/lib/mockData.ts
git commit -m "feat(as): full Stage 1 form in wizard — objective sub-fields, customer specific, supplier details"
```

---

### Task 7: Update Step 3 review for ALT_SUPPLIER

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` (~lines 1277–1302 in `renderStep3`)

- [ ] **Step 1: Add changeObjective + supplier to the non-ECN tiles**

The tiles array already conditionally swaps Category/SPOC for ALT_SUPPLIER with Change Objective. No change needed there.

Find in the email preview body (the `else` branch, non-ECN):
```tsx
                {typeOfWork === "ALT_SUPPLIER" && existingPartNumber && <p><strong>Existing Part No.:</strong> {existingPartNumber}</p>}
                {typeOfWork === "ALT_SUPPLIER" && changeObjective && <p><strong>Change Objective:</strong> {changeObjective}</p>}
```

Add two lines directly after:
```tsx
                {typeOfWork === "ALT_SUPPLIER" && asSupplierName && <p><strong>Proposed Supplier:</strong> {asSupplierName}</p>}
                {typeOfWork === "ALT_SUPPLIER" && asReason && <p><strong>Reason:</strong> {asReason}</p>}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 8: Update `[id]/page.tsx` — extend asStage1Data type and Stage 1 display

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

- [ ] **Step 1: Import ASStage1Data in detail page**

Find the import line that includes `AS_STAGE1_KEY` (~line 22):
```ts
  AS_STAGE1_KEY, AS_RND_APPROVAL_KEY,
```
Change to:
```ts
  AS_STAGE1_KEY, AS_RND_APPROVAL_KEY, type ASStage1Data,
```

- [ ] **Step 2: Update asStage1Data state type**

Find (~line 370):
```ts
  const [asStage1Data,    setAsStage1Data]    = useState<null | { supplierName: string; reason: string; docsLink?: string; submittedBy: string; submittedAt: number }>(null)
```
Replace with:
```ts
  const [asStage1Data,    setAsStage1Data]    = useState<ASStage1Data | null>(null)
```

- [ ] **Step 3: Update the Stage 1 "done" display in the sourcing card (~line 5454)**

Find:
```tsx
        {(isDone || asStage1Data) && asStage1Data && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Proposed Supplier</span><span className="font-semibold text-slate-800">{asStage1Data.supplierName}</span></div>
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Reason</span><span className="font-semibold text-slate-800 max-w-[200px] text-right">{asStage1Data.reason}</span></div>
            {asStage1Data.docsLink && <div className="flex justify-between text-xs"><span className="text-slate-400">Docs</span><span className="font-semibold text-blue-700">{asStage1Data.docsLink}</span></div>}
            <p className="text-[10px] text-slate-400 mt-1">Submitted by {asStage1Data.submittedBy} · {new Date(asStage1Data.submittedAt).toLocaleString("en-IN")}</p>
```
Replace with:
```tsx
        {(isDone || asStage1Data) && asStage1Data && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Proposed Supplier</span><span className="font-semibold text-slate-800">{asStage1Data.supplierName}</span></div>
            <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Reason</span><span className="font-semibold text-slate-800 max-w-[200px] text-right">{asStage1Data.reason}</span></div>
            {asStage1Data.changeObjective && <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Objective</span><span className="font-semibold text-slate-800">{asStage1Data.changeObjective}</span></div>}
            {asStage1Data.customerSpecific?.enabled && <div className="flex justify-between text-xs border-b border-slate-100 pb-1"><span className="text-slate-400">Customer Grade</span><span className="font-semibold text-slate-800">{asStage1Data.customerSpecific.grade || "—"}</span></div>}
            {asStage1Data.docsLink && <div className="flex justify-between text-xs"><span className="text-slate-400">Docs</span><span className="font-semibold text-blue-700">{asStage1Data.docsLink}</span></div>}
            <p className="text-[10px] text-slate-400 mt-1">Submitted by {asStage1Data.submittedBy} · {new Date(asStage1Data.submittedAt).toLocaleString("en-IN")}</p>
```

- [ ] **Step 4: Update the R&D card AS Stage 1 read-only summary (~line 2095)**

Find:
```tsx
        {isDone && asStage1Data && (
```
(This is the R&D read-only card. Find the block below it that shows supplier/reason/docs.)

After the existing supplier/reason/docs rows, add (before the closing `</div>`):
```tsx
              {asStage1Data.changeObjective && (
                <div className="flex justify-between text-xs"><span className="text-slate-400">Objective</span><span className="font-semibold text-slate-800">{asStage1Data.changeObjective}</span></div>
              )}
```

- [ ] **Step 5: Remove Stage 1 inline form from detail page (it's now in the wizard)**

Find the inline form block that starts:
```tsx
        {isActive && !asStage1Data && isSpocOrSourcing && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
```
and ends at the closing `</div>` after the Submit button (around line 5452). Delete this entire block — the wizard now writes Stage 1 data before navigation, so the inline form is never needed.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx src/app/\(internal\)/npd/new/page.tsx
git commit -m "feat(as): extend Stage 1 display in detail page, remove redundant inline form"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Two-column layout (left common fields, right: drawing link + existing part no + remarks) — existing layout, AS uses the same grid
- ✅ Change Objective card picker (4 cards) — Task 6
- ✅ Cost Innovation checklist table with % change (green/red) — Task 6
- ✅ Capacity Expansion sub-fields — Task 6
- ✅ Compliance & Regulatory sub-fields — Task 6
- ✅ New Supply details — Task 6
- ✅ Customer Specific toggle + Grade — Task 6
- ✅ Supplier Name / Reason / Docs fields — Task 6
- ✅ Validation (supplier name + reason required) — Task 5
- ✅ AS_STAGE1_KEY written at submit with full shape — Task 4
- ✅ NPD created at stage 2 — Task 4
- ✅ Navigate to `/npd/[newId]` — Task 4
- ✅ Type added to mockData.ts — Task 1
- ✅ Detail page type + display updated — Task 8

**Placeholder scan:** None found.

**Type consistency:** `ASStage1Data` defined in Task 1, imported in Tasks 3 and 8. `CostRow` is UI-only local state, never persisted. `objectiveDetails` built in Task 4 matches the `ASStage1Data.objectiveDetails` shape exactly.
