# ECN Flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the ECN 8-stage flow so dispatch happens before testing, stage 1 auto-completes on creation, the detail page renders stages newest-first (descending), the supplier portal collects price estimation, and R&D Head sees a combined RND+DQA approval panel at stage 6.

**Architecture:** All data lives in `localStorage` with no backend. New stage keys (`ECN_DQA_TESTS_KEY`, `ECN_HEAD_APPROVAL_KEY`, `ECN_PRICE_ESTIMATION_KEY`) are added to `mockData.ts` as the single source of truth. The ECN stage card JSX in `npd/[id]/page.tsx` is rebuilt as an array that gets `.reverse()`d before rendering so the active stage is always at the top.

**Tech Stack:** Next.js 15 App Router, React, TypeScript 5, Tailwind CSS v4, localStorage, shadcn/ui, lucide-react.

---

## File Map

| File | Change |
|---|---|
| `src/lib/mockData.ts` | Update `getStageName()` ECN block; add 3 new key constants |
| `src/app/(internal)/npd/new/page.tsx` | Set `stage: 2` at ECN creation; write `ECN_STAGE1_KEY` immediately |
| `src/app/supplier/ecn-sourcing/[id]/page.tsx` | Add price estimation field; write `ECN_PRICE_ESTIMATION_KEY` on submit |
| `src/app/(internal)/npd/[id]/page.tsx` | New state vars; updated loaders; rewritten ECN R&D + Sourcing sections; updated `handleAdvance`/`demoRevertStage`; descending render order; import new keys |

---

## Task 1: Update mockData.ts — stage names + new keys

**Files:**
- Modify: `src/lib/mockData.ts` (lines ~377–379 for keys, ~650–661 for getStageName)

- [ ] **Step 1: Add 3 new localStorage key constants after `ECN_SOURCING_DISPATCH_KEY` (line 379)**

  Find this block:
  ```ts
  export const ECN_STAGE1_KEY = "ecn_stage1_v1"
  export const ECN_RND_APPROVAL_KEY = "ecn_rnd_approval_v1"
  export const ECN_SOURCING_DISPATCH_KEY = "ecn_sourcing_dispatch_v1"
  ```
  Replace with:
  ```ts
  export const ECN_STAGE1_KEY = "ecn_stage1_v1"
  export const ECN_RND_APPROVAL_KEY = "ecn_rnd_approval_v1"
  export const ECN_SOURCING_DISPATCH_KEY = "ecn_sourcing_dispatch_v1"
  export const ECN_PRICE_ESTIMATION_KEY = "ecn_price_estimation_v1"
  export const ECN_DQA_TESTS_KEY = "ecn_dqa_tests_v1"
  export const ECN_HEAD_APPROVAL_KEY = "ecn_head_approval_v1"
  ```

- [ ] **Step 2: Update the ECN branch in `getStageName()` (line ~650–661)**

  Find this block:
  ```ts
  if (type === "Engineering Change Notice (ECN)") {
    const ecnStages = [
      "ECN Request Initialisation",
      "Sourcing Review & Approval",
      "Supplier Sourcing",
      "R&D Testing",
      "DQA Testing",
      "Supplier Sample Dispatch",
      "PP Pricing",
      "ECN Summary & Closure",
    ];
    return ecnStages[stage - 1] || "Unknown";
  }
  ```
  Replace with:
  ```ts
  if (type === "Engineering Change Notice (ECN)") {
    const ecnStages = [
      "ECN Request Initialisation",
      "Sourcing Review & RFQ",
      "Supplier Sample Dispatch",
      "R&D Testing",
      "DQA Testing",
      "R&D Head Approval",
      "PP Pricing",
      "ECN Summary & Closure",
    ];
    return ecnStages[stage - 1] || "Unknown";
  }
  ```

- [ ] **Step 3: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 2: Auto-complete stage 1 on ECN creation (npd/new/page.tsx)

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` (lines ~17, ~131–168)

- [ ] **Step 1: Import new keys and ECN_STAGE1_KEY at the top of the file**

  Find the import line:
  ```ts
  import { getStageName, REJECTED_PARTS_KEY, DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD, VENDOR_CATALOG } from "@/lib/mockData"
  ```
  Replace with:
  ```ts
  import { getStageName, REJECTED_PARTS_KEY, DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD, VENDOR_CATALOG, ECN_STAGE1_KEY } from "@/lib/mockData"
  ```

- [ ] **Step 2: Change startStage and write ECN_STAGE1_KEY on ECN creation**

  Find this block (line ~131–168):
  ```ts
  const isECN = workTypeLabel === "Engineering Change Notice (ECN)"
  const devTat  = Number(tatDevelopment) || 0
  const prodTat = Number(tatProduction)  || 0
  const effectiveTat = devTat + prodTat || Number(customTat)
  const priorityLabel = priority === "P1" ? "Critical" : priority === "P2" ? "High" : "Normal"
  const startStage = isECN ? 1 : workTypeLabel === "Compliance / Regulatory" ? 3 : 2
  addNPD({
    id: newId,
    ...
    stage: startStage,
    stageName: getStageName(startStage, workTypeLabel),
    ...
  })
  router.push('/archive')
  ```
  Replace with:
  ```ts
  const isECN = workTypeLabel === "Engineering Change Notice (ECN)"
  const devTat  = Number(tatDevelopment) || 0
  const prodTat = Number(tatProduction)  || 0
  const effectiveTat = devTat + prodTat || Number(customTat)
  const priorityLabel = priority === "P1" ? "Critical" : priority === "P2" ? "High" : "Normal"
  const startStage = isECN ? 2 : workTypeLabel === "Compliance / Regulatory" ? 3 : 2
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
    supplier: isECN ? ecnSupplier : "Pending Assignment",
    priority: priorityLabel,
    gradeA: false,
    tqrScore: null,
    cost: null,
    raisedBy,
    driveLink: driveLink || undefined,
    sampleQty: sampleQty ? Number(sampleQty) : undefined,
    createdAt: new Date().toISOString(),
    manufacturingLocation: isECN ? undefined : (manufacturingLocation || undefined),
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
  router.push('/archive')
  ```

- [ ] **Step 3: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 3: Add price estimation to supplier ECN portal

**Files:**
- Modify: `src/app/supplier/ecn-sourcing/[id]/page.tsx`

- [ ] **Step 1: Import `ECN_PRICE_ESTIMATION_KEY`**

  Find:
  ```ts
  import { ECN_SOURCING_DISPATCH_KEY } from "@/lib/mockData"
  ```
  Replace with:
  ```ts
  import { ECN_SOURCING_DISPATCH_KEY, ECN_PRICE_ESTIMATION_KEY } from "@/lib/mockData"
  ```

- [ ] **Step 2: Update `SubmissionRecord` type and add price state**

  Find the type + state block at the top of the component:
  ```ts
  type SubmissionRecord = {
    dispatchDate: string
    docs: string[]
    submittedAt: number
  }

  export default function EcnSourcingPage() {
    const params  = useParams()
    const npdId   = params.id as string

    const [submitted,    setSubmitted]    = useState(false)
    const [dispatchDate, setDispatchDate] = useState(() => {
  ```
  Replace with:
  ```ts
  type SubmissionRecord = {
    dispatchDate: string
    docs: string[]
    submittedAt: number
  }

  export default function EcnSourcingPage() {
    const params  = useParams()
    const npdId   = params.id as string

    const [submitted,       setSubmitted]       = useState(false)
    const [dispatchDate,    setDispatchDate]    = useState(() => {
  ```
  Then directly after `const [docNames, setDocNames] = useState<string[]>([])`, add:
  ```ts
    const [pricePerUnit,    setPricePerUnit]    = useState("")
    const [currency,        setCurrency]        = useState<"INR" | "USD" | "EUR">("INR")
  ```

- [ ] **Step 3: Update `handleSubmit` to write `ECN_PRICE_ESTIMATION_KEY`**

  Find the `handleSubmit` function:
  ```ts
  const handleSubmit = () => {
    const submission: SubmissionRecord = {
      dispatchDate,
      docs: docNames,
      submittedAt: Date.now(),
    }
    const raw = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const all: Record<string, { submission: SubmissionRecord }> = raw ? JSON.parse(raw) : {}
    all[npdId] = { submission }
    localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all))
    setSubmitted(true)
  }
  ```
  Replace with:
  ```ts
  const handleSubmit = () => {
    const submission: SubmissionRecord = {
      dispatchDate,
      docs: docNames,
      submittedAt: Date.now(),
    }
    const raw = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const all: Record<string, { submission: SubmissionRecord }> = raw ? JSON.parse(raw) : {}
    all[npdId] = { submission }
    localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all))

    const priceEntry = { pricePerUnit, currency, submittedAt: Date.now() }
    const rawP = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
    const allP: Record<string, typeof priceEntry> = rawP ? JSON.parse(rawP) : {}
    allP[npdId] = priceEntry
    localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(allP))

    setSubmitted(true)
  }
  ```

- [ ] **Step 4: Update `canSubmit` to require price**

  Find:
  ```ts
  const canSubmit = !!dispatchDate && docNames.length > 0
  ```
  Replace with:
  ```ts
  const canSubmit = !!dispatchDate && docNames.length > 0 && !!pricePerUnit && parseFloat(pricePerUnit) > 0
  ```

- [ ] **Step 5: Add Price Estimation UI section between docs and submit button**

  In the JSX, find the section that ends with the docs list and before the submit button. Look for a pattern like `{/* submit */}` or the submit `<button>`. Add the price estimation section immediately before it:

  Find the `canSubmit` submit button (it looks like):
  ```tsx
  <button
    disabled={!canSubmit}
    onClick={handleSubmit}
  ```
  Insert immediately before it:
  ```tsx
  {/* Price Estimation */}
  <div className="space-y-3">
    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">3</span>
      Price Estimation Per Unit
    </h3>
    <div className="flex gap-3">
      <div className="w-28 shrink-0">
        <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value as "INR" | "USD" | "EUR")}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="INR">INR ₹</option>
          <option value="USD">USD $</option>
          <option value="EUR">EUR €</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-xs font-semibold text-slate-600 mb-1">Amount per unit</label>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 125.50"
          value={pricePerUnit}
          onChange={e => setPricePerUnit(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  </div>
  ```

- [ ] **Step 6: Update the confirmation screen to show price**

  In the `if (submitted)` return block, find the success summary section and add a price row. Look for the dispatch date display in the confirmation and add after it:
  ```tsx
  {pricePerUnit && (
    <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
      <span className="text-slate-500">Price Estimate</span>
      <span className="font-semibold text-slate-800">
        {currency === "INR" ? "₹" : currency === "USD" ? "$" : "€"}{parseFloat(pricePerUnit).toLocaleString("en-IN")} per unit
      </span>
    </div>
  )}
  ```

- [ ] **Step 7: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 4: Add new state vars and loaders to npd/[id]/page.tsx

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (imports ~line 18; ECN state ~line 306; load useEffect ~line 608)

- [ ] **Step 1: Add new keys to the import from mockData**

  Find line ~18:
  ```ts
  ECN_STAGE1_KEY, ECN_RND_APPROVAL_KEY, ECN_SOURCING_DISPATCH_KEY,
  ```
  Replace with:
  ```ts
  ECN_STAGE1_KEY, ECN_RND_APPROVAL_KEY, ECN_SOURCING_DISPATCH_KEY,
  ECN_PRICE_ESTIMATION_KEY, ECN_DQA_TESTS_KEY, ECN_HEAD_APPROVAL_KEY,
  ```

- [ ] **Step 2: Add 3 new state variables after the existing ECN DQA state (line ~319)**

  Find:
  ```ts
  // ECN DQA results
  const [ecnDqaResults,         setEcnDqaResults]          = useState<Record<string, { value: string; status: string }>>({})
  const [ecnDqaSubmitted,       setEcnDqaSubmitted]        = useState(false)
  ```
  Replace with:
  ```ts
  // ECN DQA results
  const [ecnDqaResults,         setEcnDqaResults]          = useState<Record<string, { value: string; status: string }>>({})
  const [ecnDqaSubmitted,       setEcnDqaSubmitted]        = useState(false)
  // ECN new keys
  const [ecnPriceEstimation,    setEcnPriceEstimation]     = useState<null | { pricePerUnit: string; currency: string; submittedAt: number }>(null)
  const [ecnDqaTestsData,       setEcnDqaTestsData]        = useState<null | { results: Record<string, { value: string; status: string }>; submittedAt: number; submittedBy: string }>(null)
  const [ecnHeadApproval,       setEcnHeadApproval]        = useState<null | { verdict: "approved" | "rejected"; remarks?: string; approvedBy: string; approvedAt: number }>(null)
  const [ecnHeadRemarks,        setEcnHeadRemarks]         = useState("")
  ```

- [ ] **Step 3: Load new state in the localStorage useEffect (after line ~625)**

  Find the ECN sourcing dispatch loader block (ends around line 625):
  ```ts
  // ECN — Sourcing Dispatch
  const rawEcnSD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
  if (rawEcnSD) {
    const allSD = JSON.parse(rawEcnSD)
    if (allSD[npdId]) setEcnSourcingDispatch(allSD[npdId])
  }
  ```
  After this block, add:
  ```ts
  // ECN — Price Estimation
  const rawEcnPE = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
  if (rawEcnPE) {
    const allPE = JSON.parse(rawEcnPE)
    if (allPE[npdId]) setEcnPriceEstimation(allPE[npdId])
  }
  // ECN — DQA Tests (new key)
  const rawEcnDqa = localStorage.getItem(ECN_DQA_TESTS_KEY)
  if (rawEcnDqa) {
    const allEcnDqa = JSON.parse(rawEcnDqa)
    if (allEcnDqa[npdId]) {
      setEcnDqaTestsData(allEcnDqa[npdId])
      setEcnDqaResults(allEcnDqa[npdId].results)
      setEcnDqaSubmitted(true)
    }
  }
  // ECN — Head Approval
  const rawEcnHA = localStorage.getItem(ECN_HEAD_APPROVAL_KEY)
  if (rawEcnHA) {
    const allEcnHA = JSON.parse(rawEcnHA)
    if (allEcnHA[npdId]) setEcnHeadApproval(allEcnHA[npdId])
  }
  // Backward-compat: old ECN records at stage 1 that already have ECN_STAGE1_KEY entry
  // treat them as stage 2 so the new stage map is correct
  ```

- [ ] **Step 4: Add backward-compat migration in the same useEffect**

  Immediately after the code you just added, add:
  ```ts
  if (npd && npd.typeOfWork === "Engineering Change Notice (ECN)" && npd.stage === 1) {
    const rawS1bc = localStorage.getItem(ECN_STAGE1_KEY)
    if (rawS1bc) {
      const allS1bc = JSON.parse(rawS1bc)
      if (allS1bc[npdId]) {
        updateNPD(npdId, { stage: 2, stageName: getStageName(2, npd.typeOfWork) })
      }
    }
  }
  ```

- [ ] **Step 5: Add auto-advance useEffect for stage 3 → 4 (when supplier submits via portal)**

  Find the section that has existing `useEffect` hooks around line ~683–720. Add a new one:
  ```ts
  // ECN: auto-advance stage 3 → 4 when supplier submits dispatch portal
  useEffect(() => {
    if (!isECN || !npd) return
    if (activeStage !== 3) return
    if (ecnSourcingDispatch?.submission?.submittedAt) {
      updateNPD(npdId, { stage: 4, stageName: getStageName(4, npd.typeOfWork) })
      setActiveStage(4)
    }
  }, [ecnSourcingDispatch, activeStage, isECN])
  ```

- [ ] **Step 6: Poll ECN_SOURCING_DISPATCH_KEY every 3 s while at stage 3**

  Add a new `useEffect`:
  ```ts
  useEffect(() => {
    if (!isECN || activeStage !== 3) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
      if (!raw) return
      const all = JSON.parse(raw)
      if (all[npdId]?.submission?.submittedAt) {
        setEcnSourcingDispatch(all[npdId])
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, activeStage, npdId])
  ```

- [ ] **Step 7: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 5: Update handleAdvance and demoRevertStage ECN blocks

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (handleAdvance ~line 1079–1141; demoRevertStage ~line 1207–1247)

- [ ] **Step 1: Replace the ECN branch inside `handleAdvance` (lines ~1079–1141)**

  Find:
  ```ts
  // ECN-specific demo advance
  if (isECN) {
    // Stage 1→2: R&D submits → auto-advances to stage 2 for sourcing review
    if (activeStage === 1) {
  ```
  And replace the entire ECN block (from `if (isECN) {` down through the `return` before the NCD block) with:
  ```ts
  // ECN-specific demo advance
  if (isECN) {
    // Stage 1 no longer reachable via advance (auto-completed at creation)
    // Stage 2→3: sourcing sends RFQ → write ECN_RND_APPROVAL_KEY
    if (activeStage === 2) {
      const entry = { verdict: "approved" as const, approvedBy: currentRole, approvedAt: Date.now() }
      const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_RND_APPROVAL_KEY) ?? "{}")
      all[npdId] = entry
      localStorage.setItem(ECN_RND_APPROVAL_KEY, JSON.stringify(all))
      setEcnRndApproval(entry)
    }
    // Stage 3→4: supplier submitted (demo: write dispatch + received)
    if (activeStage === 3) {
      const entry = {
        portalSentAt: Date.now() - 3600000,
        sentBy: currentRole,
        submission: { dispatchDate: new Date().toLocaleDateString("en-IN"), docs: ["demo_docs.pdf"], submittedAt: Date.now() - 1800000 },
        received: { markedBy: currentRole, markedAt: Date.now() }
      }
      const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_SOURCING_DISPATCH_KEY) ?? "{}")
      all[npdId] = entry
      localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all))
      setEcnSourcingDispatch(entry)
      // Also write demo price estimation
      const pe = { pricePerUnit: "250", currency: "INR", submittedAt: Date.now() }
      const allPe: Record<string, typeof pe> = JSON.parse(localStorage.getItem(ECN_PRICE_ESTIMATION_KEY) ?? "{}")
      allPe[npdId] = pe
      localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(allPe))
      setEcnPriceEstimation(pe)
    }
    // Stage 4→5: auto-fill R&D test results
    if (activeStage === 4) {
      const supplier = npd.supplier
      const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
      const allVT: Record<string, Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>> = rawVT ? JSON.parse(rawVT) : {}
      if (!allVT[npdId]) allVT[npdId] = {}
      allVT[npdId][supplier] = { results: { "Visual Inspection": "Pass", "Dimensional Check": "Pass", "Material Verification": "99.8%" }, status: "submitted", submittedAt: new Date().toLocaleString("en-IN") }
      localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(allVT))
      setEcnRndTestResults({ "Visual Inspection": "Pass", "Dimensional Check": "Pass", "Material Verification": "99.8%" })
      setEcnRndTestSubmitted(true)
    }
    // Stage 5→6: auto-fill DQA results using ECN_DQA_TESTS_KEY
    if (activeStage === 5) {
      const autoDqa = Object.fromEntries(DQA_TESTS.map(t => [t.testName, { value: t.unit === "Pass/Fail" ? "Pass" : "100", status: "pass" }]))
      setEcnDqaResults(autoDqa)
      setEcnDqaSubmitted(true)
      const dqaEntry = { results: autoDqa, submittedAt: Date.now(), submittedBy: currentRole }
      const allEcnDqa: Record<string, typeof dqaEntry> = JSON.parse(localStorage.getItem(ECN_DQA_TESTS_KEY) ?? "{}")
      allEcnDqa[npdId] = dqaEntry
      localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(allEcnDqa))
      setEcnDqaTestsData(dqaEntry)
    }
    // Stage 6→7: R&D Head approves combined results → write ECN_HEAD_APPROVAL_KEY
    if (activeStage === 6) {
      const entry = { verdict: "approved" as const, remarks: "Demo approval", approvedBy: currentRole, approvedAt: Date.now() }
      const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
      all[npdId] = entry
      localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
      setEcnHeadApproval(entry)
    }
    setActiveStage(next)
    updateNPD(npdId, { stage: next, stageName: getStageName(next, npd.typeOfWork) })
    return
  }
  ```

- [ ] **Step 2: Replace the ECN branch inside `demoRevertStage` (lines ~1207–1247)**

  Find the entire ECN block:
  ```ts
  // ECN-specific revert
  if (isECN) {
    // Stage 2→1: clear ECN_STAGE1_KEY
    if (activeStage === 2) {
  ```
  Replace everything from `if (isECN) {` down through the closing `return` with:
  ```ts
  // ECN-specific revert
  if (isECN) {
    if (activeStage === 2) {
      setEcnRndApproval(null)
      const rawRnd = localStorage.getItem(ECN_RND_APPROVAL_KEY)
      if (rawRnd) { const all = JSON.parse(rawRnd); delete all[npdId]; localStorage.setItem(ECN_RND_APPROVAL_KEY, JSON.stringify(all)) }
    }
    if (activeStage === 3) {
      setEcnSourcingDispatch(null)
      setEcnPriceEstimation(null)
      const rawSD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
      if (rawSD) { const all = JSON.parse(rawSD); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
      const rawPE = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
      if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(all)) }
    }
    if (activeStage === 4) {
      setEcnRndTestResults({}); setEcnRndTestSubmitted(false)
      const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
      if (rawVT) { const all = JSON.parse(rawVT); if (all[npdId]) { delete all[npdId][npd.supplier]; localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(all)) } }
    }
    if (activeStage === 5) {
      setEcnDqaResults({}); setEcnDqaSubmitted(false); setEcnDqaTestsData(null)
      const rawEcnDqa = localStorage.getItem(ECN_DQA_TESTS_KEY)
      if (rawEcnDqa) { const all = JSON.parse(rawEcnDqa); delete all[npdId]; localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(all)) }
    }
    if (activeStage === 6) {
      setEcnHeadApproval(null); setEcnHeadRemarks("")
      const rawHA = localStorage.getItem(ECN_HEAD_APPROVAL_KEY)
      if (rawHA) { const all = JSON.parse(rawHA); delete all[npdId]; localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all)) }
    }
    setActiveStage(prev)
    updateNPD(npdId, { stage: prev, stageName: getStageName(prev, npd.typeOfWork) })
    return
  }
  ```

- [ ] **Step 3: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 6: Rewrite ECN R&D section with descending render order

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (ECN R&D block ~lines 1635–2015)

This task replaces the entire `{/* ═══ ECN FLOW — R&D stages 1, 2, 4, 5 ═══ */}` block. The new block builds an array `ecnCards` and renders it in reverse.

- [ ] **Step 1: Find the R&D ECN block start and end markers**

  The block starts with:
  ```tsx
  {/* ═══ ECN FLOW — R&D stages 1, 2, 4, 5 ═══ */}
  {isECN && (() => {
  ```
  And ends just before:
  ```tsx
  {!isECN && <Card className="transition-shadow duration-200 hover:shadow-md">
  ```
  Replace the entire block with the following:

  ```tsx
  {/* ═══ ECN FLOW — R&D view (all 8 stages, newest first) ═══ */}
  {isECN && (() => {
    const ecnSummaryRows: [string, string][] = [
      ["Part Number",      npd.ecnPartNumber ?? "—"],
      ["Part Name",        npd.ecnPartName ?? npd.itemName],
      ["Existing Supplier", npd.supplier],
      ["Change Description", npd.ecnChangeDescription ?? "—"],
      ["Priority",         npd.priority],
      ["Total TAT",        npd.totalTat ? `${npd.totalTat} days` : "—"],
    ]
    if (npd.driveLink) ecnSummaryRows.push(["Drawing Link", npd.driveLink])
    if (npd.remarks)   ecnSummaryRows.push(["Remarks", npd.remarks])

    const supplier = npd.supplier
    const vendorTestEntry = vendorTests[supplier] ?? null
    const ecnRndTestsList = getTestsByCategory(npd.itemCategory).length > 0
      ? getTestsByCategory(npd.itemCategory)
      : getTestsByCategory("Others")

    const ecnCards: React.ReactNode[] = []

    // ── Stage 1: ECN Request Initialisation (always completed) ──────────────
    ecnCards.push(
      <div key="ecn-s1" className="rounded-xl border bg-slate-50 border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <h4 className="font-bold text-slate-800 text-sm">Stage 1 — ECN Request Initialisation</h4>
          <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {ecnSummaryRows.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
            </div>
          ))}
        </div>
        {ecnStage1Data && (
          <p className="text-[10px] text-slate-400 mt-2">Submitted by {ecnStage1Data.submittedBy} · {new Date(ecnStage1Data.submittedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )

    // ── Stage 2: Sourcing Review & RFQ (R&D sees read-only status) ──────────
    if (activeStage >= 2) {
      const isActive = activeStage === 2
      const isDone   = activeStage > 2
      const approved = ecnRndApproval?.verdict === "approved"
      ecnCards.push(
        <div key="ecn-s2" className={`rounded-xl border p-4 ${isDone || approved ? "bg-slate-50 border-slate-200" : isActive ? "border-teal-300 bg-teal-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            {isDone || approved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-teal-700 shrink-0" />}
            <h4 className="font-bold text-slate-800 text-sm">Stage 2 — Sourcing Review &amp; RFQ</h4>
            {(isDone || approved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">RFQ Sent</Badge>}
            {isActive && !approved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting Sourcing</Badge>}
          </div>
          {isActive && !approved && (
            <p className="text-xs text-slate-400 italic">Sourcing team is reviewing this ECN request and will send an RFQ to {supplier}.</p>
          )}
          {(isDone || approved) && ecnRndApproval && (
            <p className="text-[10px] text-slate-400">RFQ sent by {ecnRndApproval.approvedBy} · {new Date(ecnRndApproval.approvedAt).toLocaleString("en-IN")}</p>
          )}
        </div>
      )
    }

    // ── Stage 3: Supplier Sample Dispatch (R&D sees portal status) ──────────
    if (activeStage >= 3) {
      const isActive = activeStage === 3
      const isDone   = activeStage > 3
      const sd = ecnSourcingDispatch
      const portalUrl = `${baseUrl}/supplier/ecn-sourcing/${npdId}`
      ecnCards.push(
        <div key="ecn-s3" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Truck className="w-4 h-4 text-indigo-700 shrink-0" />}
            <h4 className="font-bold text-slate-800 text-sm">Stage 3 — Supplier Sample Dispatch</h4>
            <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{supplier}</strong></span>
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Dispatched</Badge>}
            {isActive && !sd?.submission && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting Supplier</Badge>}
          </div>
          {isActive && !sd && (
            <p className="text-xs text-slate-400 italic">Sourcing will send the supplier portal link to {supplier}.</p>
          )}
          {isActive && sd && !sd.submission && (
            <div className="space-y-2">
              <Badge className="bg-blue-100 text-blue-700 border-none text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Portal Link Sent</Badge>
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Portal URL</p>
                <span className="text-xs font-mono text-blue-700 break-all">{portalUrl}</span>
              </div>
              <p className="text-xs text-slate-400 italic">Waiting for supplier to submit dispatch documents…</p>
            </div>
          )}
          {(isDone || sd?.submission) && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{sd?.submission?.dispatchDate ?? "—"}</p>
                </div>
                {ecnPriceEstimation && (
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Price Estimate</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {ecnPriceEstimation.currency === "INR" ? "₹" : ecnPriceEstimation.currency === "USD" ? "$" : "€"}{parseFloat(ecnPriceEstimation.pricePerUnit).toLocaleString("en-IN")} / unit
                    </p>
                  </div>
                )}
              </div>
              {sd?.submission?.docs && sd.submission.docs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sd.submission.docs.map((doc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200">
                      <FileText className="w-3 h-3 text-slate-400" />{doc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    // ── Stage 4: R&D Testing ─────────────────────────────────────────────────
    if (activeStage >= 4 && (currentRole === "rnd_user" || currentRole === "rnd_head" || currentRole === "super_admin")) {
      const isActive = activeStage === 4
      const isDone   = activeStage > 4
      const savedTests = vendorTestEntry
      ecnCards.push(
        <div key="ecn-s4" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-emerald-300 bg-emerald-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-emerald-700 shrink-0" />}
            <h4 className="font-bold text-slate-800 text-sm">Stage 4 — R&D Testing</h4>
            <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{supplier}</strong></span>
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Submitted</Badge>}
            {isActive && (savedTests?.status === "submitted" || ecnRndTestSubmitted) && <Badge className="bg-blue-100 text-blue-700 border-none text-xs ml-auto">Results Submitted</Badge>}
          </div>
          {isActive && currentRole === "rnd_user" && !(savedTests?.status === "submitted" || ecnRndTestSubmitted) && (
            <div className="space-y-2">
              {ecnRndTestsList.map(t => (
                <div key={t.testName} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                  <input
                    type="text" placeholder="Result"
                    value={ecnRndTestResults[t.testName] ?? ""}
                    onChange={e => setEcnRndTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              ))}
              <button
                disabled={ecnRndTestsList.some(t => !ecnRndTestResults[t.testName]?.trim())}
                onClick={() => {
                  const rawVT = localStorage.getItem(VENDOR_TESTS_KEY)
                  const allVT: Record<string, Record<string, { results: Record<string, string>; status: string; submittedAt?: string }>> = rawVT ? JSON.parse(rawVT) : {}
                  if (!allVT[npdId]) allVT[npdId] = {}
                  allVT[npdId][supplier] = { results: ecnRndTestResults, status: "submitted", submittedAt: new Date().toLocaleString("en-IN") }
                  localStorage.setItem(VENDOR_TESTS_KEY, JSON.stringify(allVT))
                  setVendorTests(allVT[npdId])
                  setEcnRndTestSubmitted(true)
                }}
                className="mt-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >Submit R&D Test Results</button>
            </div>
          )}
          {(savedTests?.status === "submitted" || ecnRndTestSubmitted) && (
            <div className="space-y-1 mt-1">
              {Object.entries(savedTests?.results ?? ecnRndTestResults).map(([name, val]) => (
                <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                  <span className="text-slate-500">{name}</span>
                  <span className="font-semibold text-slate-800">{val}</span>
                </div>
              ))}
              {isActive && currentRole === "rnd_head" && (
                <button
                  onClick={() => {
                    updateNPD(npdId, { stage: 5, stageName: getStageName(5, npd.typeOfWork) })
                    setActiveStage(5)
                  }}
                  className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >Approve R&D Results — Proceed to DQA →</button>
              )}
            </div>
          )}
        </div>
      )
    }

    // ── Stage 5: DQA Testing (read-only status for R&D) ──────────────────────
    if (activeStage >= 5) {
      const isActive = activeStage === 5
      const isDone   = activeStage > 5
      ecnCards.push(
        <div key="ecn-s5" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-cyan-300 bg-cyan-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-cyan-700 shrink-0" />}
            <h4 className="font-bold text-slate-800 text-sm">Stage 5 — DQA Testing</h4>
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
            {isActive && ecnDqaSubmitted && <Badge className="bg-cyan-100 text-cyan-700 border-none text-xs ml-auto">Results Submitted</Badge>}
          </div>
          {ecnDqaSubmitted || isDone ? (
            <div className="space-y-1">
              {Object.entries(ecnDqaResults).map(([name, r]) => (
                <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                  <span className="text-slate-500">{name}</span>
                  <span className={`font-semibold ${r.status === "pass" ? "text-emerald-700" : "text-red-600"}`}>{r.value}</span>
                </div>
              ))}
              {ecnDqaTestsData && <p className="text-[10px] text-slate-400 mt-1">Submitted by {ecnDqaTestsData.submittedBy} · {new Date(ecnDqaTestsData.submittedAt).toLocaleString("en-IN")}</p>}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Awaiting DQA team to submit results.</p>
          )}
        </div>
      )
    }

    // ── Stage 6: R&D Head Approval (combined RND + DQA view) ─────────────────
    if (activeStage >= 6) {
      const isActive = activeStage === 6
      const isDone   = activeStage > 6
      const canApprove = currentRole === "rnd_head" || currentRole === "super_admin"
      ecnCards.push(
        <div key="ecn-s6" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-violet-300 bg-violet-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-violet-700 shrink-0" />}
            <h4 className="font-bold text-slate-800 text-sm">Stage 6 — R&D Head Approval</h4>
            {isDone && ecnHeadApproval?.verdict === "approved" && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
            {isActive && !ecnHeadApproval && canApprove && <Badge className="bg-violet-100 text-violet-700 border-none text-xs ml-auto">Action Required</Badge>}
            {isActive && !ecnHeadApproval && !canApprove && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting R&D Head</Badge>}
            {ecnHeadApproval?.verdict === "rejected" && <Badge className="bg-red-100 text-red-700 border-none text-xs ml-auto">Rejected</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* R&D Results panel */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">R&D Test Results</p>
              {vendorTestEntry?.results ? (
                <div className="space-y-0.5">
                  {Object.entries(vendorTestEntry.results).map(([name, val]) => (
                    <div key={name} className="flex justify-between text-xs">
                      <span className="text-slate-500">{name}</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">No R&D results yet</p>}
            </div>
            {/* DQA Results panel */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">DQA Test Results</p>
              {ecnDqaSubmitted ? (
                <div className="space-y-0.5">
                  {Object.entries(ecnDqaResults).map(([name, r]) => (
                    <div key={name} className="flex justify-between text-xs">
                      <span className="text-slate-500">{name}</span>
                      <span className={`font-semibold ${r.status === "pass" ? "text-emerald-700" : "text-red-600"}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">No DQA results yet</p>}
            </div>
          </div>
          {isActive && !ecnHeadApproval && canApprove && (
            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="Remarks (optional)..."
                value={ecnHeadRemarks}
                onChange={e => setEcnHeadRemarks(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const entry = { verdict: "approved" as const, remarks: ecnHeadRemarks || undefined, approvedBy: currentRole, approvedAt: Date.now() }
                    const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
                    all[npdId] = entry
                    localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
                    setEcnHeadApproval(entry)
                    updateNPD(npdId, { stage: 7, stageName: getStageName(7, npd.typeOfWork) })
                    setActiveStage(7)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >Approve &amp; Proceed to PP Pricing →</button>
                <button
                  onClick={() => {
                    const entry = { verdict: "rejected" as const, remarks: ecnHeadRemarks || undefined, approvedBy: currentRole, approvedAt: Date.now() }
                    const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_HEAD_APPROVAL_KEY) ?? "{}")
                    all[npdId] = entry
                    localStorage.setItem(ECN_HEAD_APPROVAL_KEY, JSON.stringify(all))
                    setEcnHeadApproval(entry)
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >Reject</button>
              </div>
            </div>
          )}
          {ecnHeadApproval && (
            <p className="text-[10px] text-slate-400">{ecnHeadApproval.verdict === "approved" ? "Approved" : "Rejected"} by {ecnHeadApproval.approvedBy} · {new Date(ecnHeadApproval.approvedAt).toLocaleString("en-IN")}{ecnHeadApproval.remarks ? ` · "${ecnHeadApproval.remarks}"` : ""}</p>
          )}
        </div>
      )
    }

    // ── Stage 7: PP Pricing status ────────────────────────────────────────────
    if (activeStage >= 7) {
      const isDone = activeStage > 7
      ecnCards.push(
        <div key="ecn-s7" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : "border-orange-300 bg-orange-50/30"}`}>
          <div className="flex items-center gap-2">
            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Clock className="w-4 h-4 text-orange-500 shrink-0" />}
            <h4 className="font-bold text-slate-800 text-sm">Stage 7 — PP Pricing</h4>
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
            {!isDone && <Badge className="bg-orange-100 text-orange-700 border-none text-xs ml-auto">In Progress</Badge>}
          </div>
        </div>
      )
    }

    // ── Stage 8: ECN Summary & Closure ────────────────────────────────────────
    if (activeStage >= 8) {
      ecnCards.push(
        <div key="ecn-s8" className="rounded-xl border border-emerald-300 bg-emerald-50/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <h4 className="font-bold text-slate-800 text-sm">Stage 8 — ECN Summary &amp; Closure</h4>
            <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
            {([
              ["Part Number",      npd.ecnPartNumber ?? "—"],
              ["Part Name",        npd.ecnPartName ?? npd.itemName],
              ["Fixed Supplier",   npd.supplier],
              ["Change Desc",      npd.ecnChangeDescription ?? "—"],
              ["Total TAT",        `${npd.totalTat} days`],
              ["Priority",         npd.priority],
              ...(ecnSourcingDispatch?.submission?.dispatchDate
                ? [["Dispatch Date", ecnSourcingDispatch.submission.dispatchDate] as [string, string]]
                : []),
              ...(ecnPriceEstimation
                ? [["Price / Unit", `${ecnPriceEstimation.currency === "INR" ? "₹" : ecnPriceEstimation.currency === "USD" ? "$" : "€"}${parseFloat(ecnPriceEstimation.pricePerUnit).toLocaleString("en-IN")}`] as [string, string]]
                : []),
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-400 text-xs">{label}</span>
                <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">ECN process complete. All stages signed off.</span>
          </div>
        </div>
      )
    }

    // Render newest stage first (descending)
    return (
      <div className="space-y-4">
        {[...ecnCards].reverse()}
      </div>
    )
  })()}
  ```

- [ ] **Step 2: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 7: Rewrite ECN Sourcing section with mail compose panel

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (ECN sourcing block ~lines 4249–4593)

This task replaces the entire `{/* ═══ ECN SOURCING STAGES ═══ */}` block. Sourcing is the primary actor at stage 2 (mail compose + send RFQ button) and stage 3 (send portal link, show submission status). Stages 4–6 are read-only status panels for sourcing visibility.

- [ ] **Step 1: Find the sourcing ECN block start and end**

  The block starts with:
  ```tsx
  {/* ═══ ECN SOURCING STAGES (Stage 3 TAT Extension + Stage 6 Dispatch) ═══ */}
  {isECN && (() => {
  ```
  And ends just before:
  ```tsx
  {/* ── Section 1: Supplier Sourcing & Quotations (NCD/NPD only) ── */}
  ```
  Replace the entire block with:

  ```tsx
  {/* ═══ ECN SOURCING STAGES (sourcing primary actor) ═══ */}
  {isECN && (() => {
    const portalUrl = `${baseUrl}/supplier/ecn-sourcing/${npdId}`
    const sd = ecnSourcingDispatch
    const rfqApproved = ecnRndApproval?.verdict === "approved"

    // Build NCD-style RFQ email body for the single fixed supplier
    const buildEcnRfqEmail = () => {
      const template = localStorage.getItem(VENDOR_RFQ_TEMPLATE_KEY) || DEFAULT_RFQ_TEMPLATE
      const portalLink = portalUrl
      const filled = template
        .replace(/{npd_id}/g,       npdId)
        .replace(/{item_name}/g,    npd.ecnPartName ?? npd.itemName)
        .replace(/{commodity}/g,    "Engineering Change")
        .replace(/{vendor_name}/g,  npd.supplier)
        .replace(/{vendor_spoc}/g,  npd.supplier)
        .replace(/{spoc_name}/g,    npd.spoc)
        .replace(/{portal_link}/g,  portalLink)
        .replace(/{valid_until}/g,  enquiryValidUntil)
        .replace(/{drawing_link}/g, npd.driveLink || "Not attached")
        .replace(/Amber Sourcing Operations/g, npd.spoc)
      const lines = filled.split("\n")
      const subject = lines[0].replace(/^Subject:\s*/i, "").trim() || `[RFQ] ECN - ${npd.ecnPartName ?? npd.itemName} - ${npdId}`
      const bodyLines = lines.slice(1)
      const buttonHtml = `<div style="margin:16px 0;"><a href="${portalLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1e3a5f;color:#fff;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;">Click here to submit dispatch documents →</a></div>`
      const renderLine = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      const body = bodyLines.map(line => {
        const trimmed = line.trim()
        if (trimmed === "") return `<div style="height:8px"></div>`
        if (trimmed === portalLink || trimmed === "{portal_link}") return buttonHtml
        return `<p style="margin:0 0 4px 0;">${renderLine(trimmed)}</p>`
      }).join("")
      return { subject, body }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ECN Sourcing Actions</span>
          <Badge className="bg-slate-100 text-slate-500 border-none text-xs">{getStageName(activeStage, npd.typeOfWork)}</Badge>
        </div>

        {/* Stage 2 — Sourcing Review & RFQ (sourcing primary actor) */}
        {activeStage >= 2 && (() => {
          const isActive = activeStage === 2
          const isDone   = activeStage > 2
          return (
            <div className={`rounded-xl border p-4 ${isDone || rfqApproved ? "bg-slate-50 border-slate-200" : isActive ? "border-teal-300 bg-teal-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
              <div className="flex items-center gap-2 mb-3">
                {isDone || rfqApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-teal-700 shrink-0" />}
                <h4 className="font-bold text-slate-800 text-sm">Stage 2 — Sourcing Review &amp; RFQ</h4>
                {(isDone || rfqApproved) && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">RFQ Sent</Badge>}
                {isActive && !rfqApproved && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Action Required</Badge>}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                {[["Part Number", npd.ecnPartNumber ?? "—"], ["Part Name", npd.ecnPartName ?? npd.itemName], ["Supplier", npd.supplier], ["Priority", npd.priority]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 text-xs">{label}</span>
                    <span className="text-slate-800 font-medium text-xs text-right max-w-[160px] truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Mail compose panel — only shown when active and no RFQ sent yet */}
              {isActive && !rfqApproved && (() => {
                const { subject, body } = buildEcnRfqEmail()
                return (
                  <div className="space-y-3">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-400 shrink-0">To: {npd.supplier} ·</span>
                          <span className="text-xs font-semibold text-white truncate">{subject}</span>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)}
                          className="shrink-0 ml-3 text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />Copy
                        </button>
                      </div>
                      <div
                        className="p-5 text-sm text-slate-700 leading-relaxed bg-white [&_p]:mb-3 [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: body }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const entry = { verdict: "approved" as const, approvedBy: currentRole, approvedAt: Date.now() }
                        const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_RND_APPROVAL_KEY) ?? "{}")
                        all[npdId] = entry
                        localStorage.setItem(ECN_RND_APPROVAL_KEY, JSON.stringify(all))
                        setEcnRndApproval(entry)
                        updateNPD(npdId, { stage: 3, stageName: getStageName(3, npd.typeOfWork) })
                        setActiveStage(3)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Mail className="w-3.5 h-3.5" />Send RFQ &amp; Proceed to Supplier Dispatch →
                    </button>
                  </div>
                )
              })()}

              {/* Done state */}
              {(isDone || rfqApproved) && ecnRndApproval && (
                <p className="text-[10px] text-slate-400">RFQ sent by {ecnRndApproval.approvedBy} · {new Date(ecnRndApproval.approvedAt).toLocaleString("en-IN")}</p>
              )}
            </div>
          )
        })()}

        {/* Stage 3 — Supplier Sample Dispatch (sourcing sends link, reads submission) */}
        {activeStage >= 3 && (() => {
          const isActive = activeStage === 3
          const isDone   = activeStage > 3
          return (
            <div className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-indigo-300 bg-indigo-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
              <div className="flex items-center gap-2 mb-3">
                {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Send className="w-4 h-4 text-indigo-700 shrink-0" />}
                <h4 className="font-bold text-slate-800 text-sm">Stage 3 — Supplier Sample Dispatch</h4>
                <span className="text-xs text-slate-500 ml-1">Supplier: <strong>{npd.supplier}</strong></span>
                {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
                {isActive && sd && !sd.submission && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting Supplier</Badge>}
              </div>

              {isActive && !sd && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Send the dispatch portal link to <strong>{npd.supplier}</strong> to collect dispatch documents and price estimate.</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Portal URL</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-700 break-all flex-1">{portalUrl}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(portalUrl)}
                        className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"
                      ><Copy className="w-3 h-3" />Copy</button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const entry = { portalSentAt: Date.now(), sentBy: currentRole }
                      const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_SOURCING_DISPATCH_KEY) ?? "{}")
                      all[npdId] = entry
                      localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all))
                      setEcnSourcingDispatch(entry)
                    }}
                    className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
                  >Send Dispatch Portal to Supplier</button>
                </div>
              )}

              {isActive && sd && !sd.submission && (
                <div className="space-y-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Portal Link Sent</Badge>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Portal URL</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-700 break-all flex-1">{portalUrl}</span>
                      <button onClick={() => navigator.clipboard.writeText(portalUrl)} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 italic">Waiting for {npd.supplier} to submit via portal…</p>
                </div>
              )}

              {(isDone || sd?.submission) && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{sd?.submission?.dispatchDate ?? "—"}</p>
                    </div>
                    {ecnPriceEstimation && (
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Price / Unit</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {ecnPriceEstimation.currency === "INR" ? "₹" : ecnPriceEstimation.currency === "USD" ? "$" : "€"}{parseFloat(ecnPriceEstimation.pricePerUnit).toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                  </div>
                  {sd?.submission?.docs && sd.submission.docs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sd.submission.docs.map((doc, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200">
                          <FileText className="w-3 h-3 text-slate-400" />{doc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* Stages 4–6: read-only sourcing status panels */}
        {activeStage >= 4 && (
          <div className={`rounded-xl border p-3 ${activeStage > 4 ? "bg-slate-50 border-slate-200" : "border-emerald-300 bg-emerald-50/30"}`}>
            <div className="flex items-center gap-2">
              {activeStage > 4 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-emerald-700 shrink-0" />}
              <h4 className="font-bold text-slate-800 text-sm">Stage 4 — R&D Testing</h4>
              {activeStage > 4 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
              {activeStage === 4 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">In Progress</Badge>}
            </div>
          </div>
        )}
        {activeStage >= 5 && (
          <div className={`rounded-xl border p-3 ${activeStage > 5 ? "bg-slate-50 border-slate-200" : "border-cyan-300 bg-cyan-50/30"}`}>
            <div className="flex items-center gap-2">
              {activeStage > 5 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-cyan-700 shrink-0" />}
              <h4 className="font-bold text-slate-800 text-sm">Stage 5 — DQA Testing</h4>
              {activeStage > 5 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Complete</Badge>}
              {activeStage === 5 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">In Progress</Badge>}
            </div>
          </div>
        )}
        {activeStage >= 6 && (
          <div className={`rounded-xl border p-3 ${activeStage > 6 ? "bg-slate-50 border-slate-200" : "border-violet-300 bg-violet-50/30"}`}>
            <div className="flex items-center gap-2">
              {activeStage > 6 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-violet-700 shrink-0" />}
              <h4 className="font-bold text-slate-800 text-sm">Stage 6 — R&D Head Approval</h4>
              {activeStage > 6 && ecnHeadApproval?.verdict === "approved" && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
              {activeStage === 6 && <Badge className="bg-amber-100 text-amber-700 border-none text-xs ml-auto">Awaiting R&D Head</Badge>}
            </div>
          </div>
        )}

        {/* PP Pricing + Closure banners */}
        {activeStage >= 7 && activeStage < 8 && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <Clock className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-semibold text-orange-800">PP Pricing in progress (Stage 7)</p>
          </div>
        )}
        {activeStage >= 8 && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">ECN Complete — All stages signed off</p>
          </div>
        )}
      </div>
    )
  })()}
  ```

- [ ] **Step 2: Type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

- [ ] **Step 3: Also add `ECN_DQA_TESTS_KEY` DQA card outside isRnd block**

  The existing ECN DQA card (stage 5, written outside the `{isRnd && ...}` block around line ~3879) currently gates on `activeStage >= 5`. It uses `DQA_TESTS_KEY` but should now write to `ECN_DQA_TESTS_KEY` for ECN records. Find:
  ```tsx
  {isECN && activeStage >= 5 && (() => {
  ```
  Confirm this block still exists after the R&D section rewrite. Inside it, find the submit handler that writes to `DQA_TESTS_KEY` and update it to also write to `ECN_DQA_TESTS_KEY`:

  Find in the DQA submit handler (inside the `isECN && activeStage >= 5` block):
  ```ts
  const all: Record<string, { results: typeof dqaResults; submittedAt: string }> = JSON.parse(localStorage.getItem(DQA_TESTS_KEY) ?? "{}")
  all[npdId] = { results: dqaResults, submittedAt: new Date().toLocaleString("en-IN") }
  localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(all))
  ```
  Replace with:
  ```ts
  const all: Record<string, { results: typeof dqaResults; submittedAt: string }> = JSON.parse(localStorage.getItem(DQA_TESTS_KEY) ?? "{}")
  all[npdId] = { results: dqaResults, submittedAt: new Date().toLocaleString("en-IN") }
  localStorage.setItem(DQA_TESTS_KEY, JSON.stringify(all))
  // Also write to ECN-specific key so R&D Head approval can read it
  const dqaEntry = { results: dqaResults as Record<string, { value: string; status: string }>, submittedAt: Date.now(), submittedBy: currentRole }
  const allEcnDqa: Record<string, typeof dqaEntry> = JSON.parse(localStorage.getItem(ECN_DQA_TESTS_KEY) ?? "{}")
  allEcnDqa[npdId] = dqaEntry
  localStorage.setItem(ECN_DQA_TESTS_KEY, JSON.stringify(allEcnDqa))
  setEcnDqaTestsData(dqaEntry)
  ```
  Also add a "Submit DQA Results →" button in this card that advances stage 5→6 after DQA submits:
  Find the existing rnd_head approve button in this DQA card (if it exists) — look for a button after `setEcnDqaSubmitted(true)` or `dqaSubmitted`. After the DQA result submission, add an advance button visible to `dqa_lead`:
  ```tsx
  {isActive && (currentRole === "dqa_lead" || currentRole === "super_admin") && ecnDqaSubmitted && (
    <button
      onClick={() => {
        updateNPD(npdId, { stage: 6, stageName: getStageName(6, npd.typeOfWork) })
        setActiveStage(6)
      }}
      className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
    >Submit DQA Results — Proceed to R&D Head Approval →</button>
  )}
  ```

- [ ] **Step 4: Final type-check**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errors.

---

## Task 8: Verify the full flow in browser

- [ ] **Step 1: Start dev server**
  ```bash
  npm run dev
  ```

- [ ] **Step 2: Create a new ECN request**
  - Go to `http://localhost:5001`
  - Login, navigate to `/npd/new`
  - Select "Engineering Change Notice"
  - Fill in Part Number, Part Name, select an existing supplier, add change description, set TAT
  - Submit on step 3
  - Verify: redirected to `/archive`, new ECN record shows "Sourcing Review & RFQ" (stage 2) not stage 1

- [ ] **Step 3: Open the ECN detail page**
  - Click the ECN in the archive
  - Verify: stage cards render newest-first (stage 2 "Sourcing Review & RFQ" card appears at **top**)
  - Verify: stage 1 card appears at **bottom**, showing "Submitted" badge

- [ ] **Step 4: Walk through as sourcing role**
  - Switch to a sourcing role (Settings)
  - Open the ECN, scroll to sourcing panel
  - Stage 2: verify NCD-style email compose panel is visible with pre-filled To/Subject/Body
  - Click "Send RFQ & Proceed" — verify stage advances to 3
  - Stage 3: click "Send Dispatch Portal to Supplier" — copy the portal URL

- [ ] **Step 5: Supplier submits via portal**
  - Open `http://localhost:5001/supplier/ecn-sourcing/<id>` in a new tab
  - Verify: "Price Estimation Per Unit" section is visible
  - Fill in dispatch date, add a demo file, enter a price amount
  - Submit — verify confirmation screen shows the price estimate
  - Return to internal tab — stage 3 should auto-advance to stage 4 within 3 s

- [ ] **Step 6: Walk through R&D testing (stage 4)**
  - Switch to `rnd_user`
  - Fill in test results, submit
  - Switch to `rnd_head`, click "Approve R&D Results — Proceed to DQA"

- [ ] **Step 7: Walk through DQA testing (stage 5)**
  - Switch to `dqa_engineer`
  - Fill in DQA results, submit
  - Click "Submit DQA Results — Proceed to R&D Head Approval"

- [ ] **Step 8: R&D Head combined approval (stage 6)**
  - Switch to `rnd_head`
  - Verify stage 6 shows two side-by-side panels — R&D results (left) and DQA results (right)
  - Enter optional remarks, click "Approve & Proceed to PP Pricing"
  - Verify stage advances to 7

- [ ] **Step 9: Use demo advance to reach stage 8 and verify closure**
  - Click demo advance button to reach stage 8
  - Verify ECN Summary & Closure card shows dispatch date and price estimate

- [ ] **Step 10: Verify demo revert works**
  - Use demo revert (⬅ button) from stage 8 back to stage 2
  - Verify each stage clears correctly and the sourcing mail compose panel re-appears at stage 2
