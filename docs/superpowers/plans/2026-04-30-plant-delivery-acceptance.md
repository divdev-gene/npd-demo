# Plant Delivery Acceptance (Stage 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build out Stage 8 "Plant Delivery Acceptance" — part number assignment by RND Head, supplier delivery response, plant_user acceptance + testing verdict.

**Architecture:** Single-file additions to `mockData.ts` (4 keys), `TopNav.tsx` (new role), and `page.tsx` (state + 4-step Stage 8 UI). localStorage-backed, no server changes.

**Tech Stack:** Next.js App Router, React useState/useEffect, Tailwind CSS, shadcn/ui Card/Button/Input

---

### Task 1: Data constants + plant_user role

**Files:**
- Modify: `src/lib/mockData.ts`
- Modify: `src/components/TopNav.tsx`

- [ ] **Step 1: Add 4 localStorage key constants to `mockData.ts`**

In `src/lib/mockData.ts`, after the existing `DELIVERY_ACCEPTANCE_KEY` line, add:

```ts
export const PART_ASSIGNMENT_KEY     = "part_assignment_v1"
export const PLANT_SUPPLIER_RESP_KEY = "plant_supplier_response_v1"
export const PLANT_ACCEPTANCE_KEY    = "plant_acceptance_v1"
export const REJECTED_PARTS_KEY      = "rejected_parts_v1"
```

- [ ] **Step 2: Add plant_user to ROLE_GROUPS in `TopNav.tsx`**

In `src/components/TopNav.tsx`, after the Leadership group object (before the Administration group), add:

```ts
{
  label: "Plant",
  roles: [
    { value: "plant_user", name: "Plant User", area: "Delivery & Testing" }
  ]
},
```

- [ ] **Step 3: Add plant_user background color in `getRoleBg`**

In `getRoleBg`, add before the final `return`:

```ts
if (value === "plant_user") return "bg-orange-600"
```

- [ ] **Step 4: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/mockData.ts src/components/TopNav.tsx
git commit -m "feat: add plant_user role and stage-8 localStorage key constants"
```

---

### Task 2: Stage 8 state + useEffect in `page.tsx`

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

- [ ] **Step 1: Import the 4 new keys at the top of page.tsx**

Find the import line that references `DELIVERY_ACCEPTANCE_KEY` and add the 4 new keys to the same import:

```ts
import {
  // ... existing imports ...
  PART_ASSIGNMENT_KEY,
  PLANT_SUPPLIER_RESP_KEY,
  PLANT_ACCEPTANCE_KEY,
  REJECTED_PARTS_KEY,
} from "@/lib/mockData"
```

- [ ] **Step 2: Add state variables after the existing delivery acceptance state block**

After the `deliveryHeadApproved` state, add:

```ts
// Stage 8 — part assignment
const [partNumberInput,      setPartNumberInput]      = useState("")
const [partAssigned,         setPartAssigned]         = useState(false)
const [assignedPartNumber,   setAssignedPartNumber]   = useState("")

// Stage 8 — supplier delivery response
const [plantDeliveryDate,    setPlantDeliveryDate]    = useState("")
const [plantDeliveryQty,     setPlantDeliveryQty]     = useState("")
const [plantSupplierSubmitted, setPlantSupplierSubmitted] = useState(false)

// Stage 8 — plant acceptance + verdict
const [plantDeliveryDoc,     setPlantDeliveryDoc]     = useState("")
const [plantDeliveryAccepted, setPlantDeliveryAccepted] = useState(false)
const [plantVerdict,         setPlantVerdict]         = useState<"accepted" | "not_good" | null>(null)
const [plantRemarks,         setPlantRemarks]         = useState("")
```

- [ ] **Step 3: Add role check for plant_user**

After the existing `isRnd` / `isSpocOrSourcing` computed booleans, add:

```ts
const isPlantUser = currentRole === "plant_user" || currentRole === "super_admin"
```

- [ ] **Step 4: Load stage-8 state in useEffect**

In the main `useEffect` (the one that loads from localStorage), add after the delivery acceptance block:

```ts
// Load part assignment
const rawPartAssign = localStorage.getItem(PART_ASSIGNMENT_KEY)
const allPartAssign = rawPartAssign ? JSON.parse(rawPartAssign) : {}
if (allPartAssign[npdId]) {
  setPartAssigned(true)
  setAssignedPartNumber(allPartAssign[npdId].partNumber)
}

// Load plant supplier response
const rawPlantSupp = localStorage.getItem(PLANT_SUPPLIER_RESP_KEY)
const allPlantSupp = rawPlantSupp ? JSON.parse(rawPlantSupp) : {}
if (allPlantSupp[npdId]) {
  setPlantDeliveryDate(allPlantSupp[npdId].deliveryDate)
  setPlantDeliveryQty(String(allPlantSupp[npdId].sampleQty))
  setPlantSupplierSubmitted(true)
}

// Load plant acceptance + verdict
const rawPlantAcc = localStorage.getItem(PLANT_ACCEPTANCE_KEY)
const allPlantAcc = rawPlantAcc ? JSON.parse(rawPlantAcc) : {}
if (allPlantAcc[npdId]) {
  setPlantDeliveryDoc(allPlantAcc[npdId].docName)
  setPlantDeliveryAccepted(true)
  if (allPlantAcc[npdId].verdict) {
    setPlantVerdict(allPlantAcc[npdId].verdict)
    setPlantRemarks(allPlantAcc[npdId].remarks ?? "")
  }
}
```

- [ ] **Step 5: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat: add stage-8 state vars and useEffect loading for plant delivery acceptance"
```

---

### Task 3: Stage 8 handlers in `page.tsx`

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

Add three handlers after the existing `approveDelivery` handler.

- [ ] **Step 1: Add `assignPartNumber` handler**

```ts
const assignPartNumber = () => {
  if (!partNumberInput.trim()) return
  const all = JSON.parse(localStorage.getItem(PART_ASSIGNMENT_KEY) ?? "{}")
  all[npdId] = { partNumber: partNumberInput.trim(), assignedAt: new Date().toLocaleString("en-IN") }
  localStorage.setItem(PART_ASSIGNMENT_KEY, JSON.stringify(all))
  setPartAssigned(true)
  setAssignedPartNumber(partNumberInput.trim())
}
```

- [ ] **Step 2: Add `submitPlantSupplierResponse` handler**

```ts
const submitPlantSupplierResponse = () => {
  if (!plantDeliveryDate || !plantDeliveryQty) return
  const all = JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
  all[npdId] = {
    deliveryDate: plantDeliveryDate,
    sampleQty:   parseInt(plantDeliveryQty),
    submittedAt: new Date().toLocaleString("en-IN"),
  }
  localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(all))
  setPlantSupplierSubmitted(true)
}
```

- [ ] **Step 3: Add `submitPlantVerdict` handler**

```ts
const submitPlantVerdict = (verdict: "accepted" | "not_good") => {
  const docName = plantDeliveryDoc || "delivery_receipt.jpg"
  const now = new Date().toLocaleString("en-IN")
  const all = JSON.parse(localStorage.getItem(PLANT_ACCEPTANCE_KEY) ?? "{}")
  all[npdId] = {
    docName:     docName,
    acceptedAt:  all[npdId]?.acceptedAt ?? now,
    verdict,
    remarks:     plantRemarks,
  }
  localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(all))
  setPlantVerdict(verdict)

  if (verdict === "not_good" && assignedPartNumber) {
    const rejected = JSON.parse(localStorage.getItem(REJECTED_PARTS_KEY) ?? "[]") as Array<{
      npdId: string; partNumber: string; itemName: string; rejectedAt: string
    }>
    // Avoid duplicates
    if (!rejected.some(r => r.npdId === npdId)) {
      rejected.push({ npdId, partNumber: assignedPartNumber, itemName: npd.itemName, rejectedAt: now })
      localStorage.setItem(REJECTED_PARTS_KEY, JSON.stringify(rejected))
    }
  }
}
```

- [ ] **Step 4: Add `confirmPlantDelivery` handler (for receipt confirmation, before verdict)**

```ts
const confirmPlantDelivery = () => {
  if (!plantDeliveryDoc) return
  const now = new Date().toLocaleString("en-IN")
  const all = JSON.parse(localStorage.getItem(PLANT_ACCEPTANCE_KEY) ?? "{}")
  all[npdId] = { docName: plantDeliveryDoc, acceptedAt: now }
  localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(all))
  setPlantDeliveryAccepted(true)
}
```

- [ ] **Step 5: Update `demoAdvanceStage` for stage 8**

Find the `demoAdvanceStage` function. In the block that checks `activeStage` values before advancing, add:

```ts
if (activeStage === 8) {
  // Auto-satisfy stage 8: assign part number + supplier response + plant acceptance + verdict
  const dummyPart = `AMB-PT-2026-${npdId.slice(-4)}`
  const now = new Date().toLocaleString("en-IN")
  const partAll = JSON.parse(localStorage.getItem(PART_ASSIGNMENT_KEY) ?? "{}")
  partAll[npdId] = { partNumber: dummyPart, assignedAt: now }
  localStorage.setItem(PART_ASSIGNMENT_KEY, JSON.stringify(partAll))
  setPartAssigned(true)
  setAssignedPartNumber(dummyPart)

  const suppAll = JSON.parse(localStorage.getItem(PLANT_SUPPLIER_RESP_KEY) ?? "{}")
  suppAll[npdId] = { deliveryDate: "30 May 2026", sampleQty: 5, submittedAt: now }
  localStorage.setItem(PLANT_SUPPLIER_RESP_KEY, JSON.stringify(suppAll))
  setPlantSupplierSubmitted(true)

  const accAll = JSON.parse(localStorage.getItem(PLANT_ACCEPTANCE_KEY) ?? "{}")
  accAll[npdId] = { docName: "demo_plant_receipt.jpg", acceptedAt: now, verdict: "accepted", remarks: "" }
  localStorage.setItem(PLANT_ACCEPTANCE_KEY, JSON.stringify(accAll))
  setPlantDeliveryDoc("demo_plant_receipt.jpg")
  setPlantDeliveryAccepted(true)
  setPlantVerdict("accepted")
  return  // don't advance stage further — stage 8 is final
}
```

- [ ] **Step 6: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat: add stage-8 handlers — part assignment, supplier response, plant verdict"
```

---

### Task 4: Stage 8 UI card in `page.tsx`

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

This task adds the Stage 8 UI panel inside the "My Actions" section. Find the block `{activeStage === 7 && ...}` (or the existing stage action cards) and add a sibling block for `activeStage === 8`.

- [ ] **Step 1: Locate the stage 7 action card**

Search for the string `activeStage === 7` in page.tsx to find where stage 7's My Actions card lives.

- [ ] **Step 2: Add the Stage 8 card immediately after the stage 7 block**

The stage 8 card renders a 4-step ladder. Add the following JSX block:

```tsx
{activeStage === 8 && (
  <div className="space-y-4">

    {/* Step A — Part number assignment */}
    {!partAssigned ? (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-800 mb-1">Assign New Part Number</p>
        <p className="text-xs text-slate-500 mb-3">Assign the official part number for this approved component and notify the supplier to confirm delivery details.</p>
        {(currentRole === "rnd_head" || currentRole === "super_admin") ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={partNumberInput}
              onChange={e => setPartNumberInput(e.target.value)}
              placeholder="e.g. AMB-PT-2026-0012"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button size="sm" disabled={!partNumberInput.trim()} onClick={assignPartNumber}>
              Assign & Notify Supplier
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Awaiting RND Head to assign part number.</p>
        )}
      </div>
    ) : (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Part Number Assigned</p>
            <p className="text-xs text-emerald-700 mt-0.5">Part No: <strong>{assignedPartNumber}</strong></p>
          </div>
        </div>
      </div>
    )}

    {/* Step B — Supplier delivery response (once part assigned) */}
    {partAssigned && !plantSupplierSubmitted && (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-800 mb-1">Record Supplier Delivery Details</p>
        <p className="text-xs text-slate-500 mb-3">Enter the delivery date and sample quantity confirmed by the supplier.</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delivery Date</label>
            <input
              type="date"
              value={plantDeliveryDate}
              onChange={e => setPlantDeliveryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sample Qty (pcs)</label>
            <input
              type="number"
              value={plantDeliveryQty}
              onChange={e => setPlantDeliveryQty(e.target.value)}
              placeholder="e.g. 5"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <Button size="sm" disabled={!plantDeliveryDate || !plantDeliveryQty} onClick={submitPlantSupplierResponse}>
          Submit Supplier Response
        </Button>
      </div>
    )}

    {partAssigned && plantSupplierSubmitted && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs font-bold text-blue-800 mb-1">Supplier Delivery Details</p>
        <div className="flex gap-4 text-xs text-blue-700">
          <span>Delivery Date: <strong>{plantDeliveryDate}</strong></span>
          <span>Sample Qty: <strong>{plantDeliveryQty} pcs</strong></span>
        </div>
      </div>
    )}

    {/* Step C — Plant user delivery acceptance */}
    {plantSupplierSubmitted && !plantDeliveryAccepted && (
      isPlantUser ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-800 mb-1">Accept Delivery</p>
          <p className="text-xs text-slate-500 mb-3">Upload a delivery receipt or photo as proof of receipt.</p>
          {plantDeliveryDoc ? (
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-700">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium">{plantDeliveryDoc}</span>
              <button onClick={() => setPlantDeliveryDoc("")} className="text-xs text-red-400 hover:text-red-600 ml-auto">Remove</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors mb-3">
              <span className="text-xs text-slate-400">PDF, PNG or JPG</span>
              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg"
                onChange={e => { if (e.target.files?.[0]) setPlantDeliveryDoc(e.target.files[0].name) }} />
              <span className="text-xs font-semibold text-blue-600">Click to upload</span>
            </label>
          )}
          <Button size="sm" disabled={!plantDeliveryDoc} onClick={confirmPlantDelivery}>
            Confirm Receipt
          </Button>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-400 italic">Awaiting plant user to confirm delivery receipt.</p>
        </div>
      )
    )}

    {/* Step D — Plant testing verdict */}
    {plantDeliveryAccepted && plantVerdict === null && isPlantUser && (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-800 mb-0.5">Testing Verdict</p>
        <p className="text-xs text-slate-500 mb-3">
          <span className="text-emerald-600 font-semibold">✓ Delivery accepted</span> — {plantDeliveryDoc}. Submit testing result.
        </p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setPlantVerdict("accepted")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
              plantVerdict === "accepted"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40"
            }`}
          >
            ✓ Accepted
          </button>
          <button
            onClick={() => setPlantVerdict("not_good")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
              plantVerdict === "not_good"
                ? "border-red-400 bg-red-50 text-red-800"
                : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/40"
            }`}
          >
            ✗ Not Good
          </button>
        </div>
        <textarea
          value={plantRemarks}
          onChange={e => setPlantRemarks(e.target.value)}
          placeholder="Remarks (optional)"
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
        />
        <Button size="sm" disabled={plantVerdict === null} onClick={() => plantVerdict && submitPlantVerdict(plantVerdict)}>
          Submit Verdict
        </Button>
      </div>
    )}

    {/* Completed state */}
    {plantVerdict !== null && (
      plantVerdict === "accepted" ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-base font-bold text-emerald-800">Part Accepted — NPD Complete</p>
          <p className="text-sm text-emerald-700 mt-1">Part No. {assignedPartNumber} has been approved for production.</p>
          {plantRemarks && <p className="text-xs text-emerald-600 mt-2 italic">&ldquo;{plantRemarks}&rdquo;</p>}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-base font-bold text-red-800">Part Not Good — Returned for Revision</p>
          <p className="text-sm text-red-700 mt-1">Part No. {assignedPartNumber} failed plant testing. Previous part number recorded for future revision requests.</p>
          {plantRemarks && <p className="text-xs text-red-600 mt-2 italic">&ldquo;{plantRemarks}&rdquo;</p>}
        </div>
      )
    )}

  </div>
)}
```

- [ ] **Step 3: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat: stage 8 plant delivery acceptance UI — part assignment, supplier response, plant verdict"
```

---

### Task 5: Fix verdict toggle bug (plantVerdict used before submitPlantVerdict)

The Step D UI above uses `plantVerdict` both as a local toggle selection AND as the final submitted state. This creates a bug: clicking a verdict button immediately shows the "completed" state before hitting Submit.

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

- [ ] **Step 1: Add a separate `verdictSelection` state for the button toggle**

After the `plantVerdict` state line, add:

```ts
const [verdictSelection, setVerdictSelection] = useState<"accepted" | "not_good" | null>(null)
```

- [ ] **Step 2: Update the Step D JSX to use `verdictSelection` for the toggle and `plantVerdict` for the committed state**

Replace the two `onClick={() => setPlantVerdict(...)}` in the verdict buttons with `onClick={() => setVerdictSelection(...)}`.

Replace the `className` ternary that checks `plantVerdict === "accepted"` with `verdictSelection === "accepted"` (and similarly for "not_good").

Replace the Submit button's `disabled` check: `disabled={verdictSelection === null}`.

Replace the Submit handler: `onClick={() => verdictSelection && submitPlantVerdict(verdictSelection)}`.

The "Completed state" block condition `{plantVerdict !== null && ...}` stays checking `plantVerdict` (committed state).

Also update `submitPlantVerdict` to accept the verdict parameter (not read from state):

The handler already accepts `verdict: "accepted" | "not_good"` as a parameter — no change needed there.

- [ ] **Step 3: Verify TypeScript is clean**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "fix: separate verdictSelection toggle state from committed plantVerdict"
```
