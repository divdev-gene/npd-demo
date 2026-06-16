# Plant Evaluation & Testing — ECN/AS Stage 7 Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ECN Stage 7 and AS Stage 7 "PP Pricing" with a "Plant Evaluation & Testing" stage where R&D fills a standard test grid and submits to advance to stage 8.

**Architecture:** Pure UI + state change. Two files: `mockData.ts` (new keys + stage name rename) and `npd/[id]/page.tsx` (remove PP pricing state/UI, add plant eval test grid). NCD Stage 7 (PP Pricing) is untouched. Old PP key constants stay in `mockData.ts` but are no longer imported or used in ECN/AS Stage 7.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, lucide-react. No backend — localStorage only. No test suite — verify with `npx tsc --noEmit`.

---

### Task 1: Update `mockData.ts` — add new keys, rename stage 7

**Files:**
- Modify: `src/lib/mockData.ts`

- [ ] **Step 1: Add `ECN_PLANT_EVAL_KEY` and `AS_PLANT_EVAL_KEY` constants**

After the last `export const` key block (near `AS_PP_RND_APPROVAL_KEY`), add:

```ts
export const ECN_PLANT_EVAL_KEY = "ecn_plant_eval_v1"
export const AS_PLANT_EVAL_KEY  = "as_plant_eval_v1"
```

These store `Record<npdId, { results: Record<string, string>; submittedAt: number; submittedBy: string }>`.

- [ ] **Step 2: Rename ECN stage 7 in `getStageName()`**

In the `ecnStages` array (around line 668), change:
```ts
      "PP Pricing",
```
to:
```ts
      "Plant Evaluation & Testing",
```

- [ ] **Step 3: Rename AS stage 7 in `getStageName()`**

In the `altStages` array (around line 654), change:
```ts
      "PP Pricing",
```
to:
```ts
      "Plant Evaluation & Testing",
```

- [ ] **Step 4: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: no errors.

---

### Task 2: Update imports, state, and loadData in `npd/[id]/page.tsx`

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

This task is entirely within the top portion of the file (lines 1–800).

- [ ] **Step 1: Update imports (lines 19–21)**

Replace the current import lines:
```ts
  ECN_PRICE_ESTIMATION_KEY, ECN_DQA_TESTS_KEY, ECN_HEAD_APPROVAL_KEY, ECN_PP_PRICING_KEY, ECN_PP_RND_APPROVAL_KEY, NCD_PP_PRICING_KEY,
  ECN_NEGOTIATION_KEY, ECN_PP_NEGOTIATION_KEY, ECN_INITIAL_QUOTE_KEY,
  AS_STAGE1_KEY, AS_RND_APPROVAL_KEY, AS_PP_PRICING_KEY, AS_PP_SOURCING_APPROVED_KEY, AS_PP_RND_APPROVAL_KEY,
```
with:
```ts
  ECN_PRICE_ESTIMATION_KEY, ECN_DQA_TESTS_KEY, ECN_HEAD_APPROVAL_KEY, NCD_PP_PRICING_KEY,
  ECN_NEGOTIATION_KEY, ECN_INITIAL_QUOTE_KEY,
  ECN_PLANT_EVAL_KEY, AS_PLANT_EVAL_KEY,
  AS_STAGE1_KEY, AS_RND_APPROVAL_KEY,
```

- [ ] **Step 2: Remove ECN PP pricing state vars (around lines 351–357, 364–366)**

Remove these lines entirely:
```ts
  const [ecnPpPricing,          setEcnPpPricing]           = useState<null | { ppPrice: string; currency: string; moq: string; leadTime: string; submittedBy: string; submittedAt: number }>(null)
  const [ecnPpRndApproval,      setEcnPpRndApproval]       = useState<null | { approvedBy: string; approvedAt: number; remarks?: string }>(null)
  const [ecnPpRndRemarks,       setEcnPpRndRemarks]        = useState("")
  const [ecnPpPrice,            setEcnPpPrice]             = useState("")
  const [ecnPpCurrency,         setEcnPpCurrency]          = useState<"INR" | "USD" | "EUR">("INR")
  const [ecnPpMoq,              setEcnPpMoq]               = useState("")
  const [ecnPpLeadTime,         setEcnPpLeadTime]          = useState("")
```
and:
```ts
  // ECN PP Negotiation (Stage 7)
  const [ecnPpNegotiation,   setEcnPpNegotiation]   = useState<NegotiationRecord | null>(null)
  const [ppNegTargetPrice,   setPpNegTargetPrice]    = useState("")
  const [ppNegCurrency,      setPpNegCurrency]       = useState<"INR" | "USD" | "EUR">("INR")
```

- [ ] **Step 3: Remove AS PP pricing state vars (around lines 380–387)**

Remove these lines entirely:
```ts
  const [asPpPricing,           setAsPpPricing]           = useState<null | { ppPrice: string; currency: string; moq: string; leadTime: string; submittedBy: string; submittedAt: number }>(null)
  const [asPpSourcingApproved,  setAsPpSourcingApproved]  = useState<null | { approvedBy: string; approvedAt: number }>(null)
  const [asPpRndApproval,       setAsPpRndApproval]       = useState<null | { approvedBy: string; approvedAt: number; remarks?: string }>(null)
  const [asPpRndRemarks,        setAsPpRndRemarks]        = useState("")
  const [asPpPrice,       setAsPpPrice]       = useState("")
  const [asPpCurrency,    setAsPpCurrency]    = useState<"INR" | "USD" | "EUR">("INR")
  const [asPpMoq,         setAsPpMoq]         = useState("")
  const [asPpLeadTime,    setAsPpLeadTime]    = useState("")
```

- [ ] **Step 4: Add plant eval state vars — place them after the `ecnHeadRemarks` line**

After the line:
```ts
  const [ecnHeadRemarks,        setEcnHeadRemarks]         = useState("")
```
insert:
```ts
  // Plant Evaluation & Testing (ECN + AS Stage 7)
  const [ecnPlantEval,     setEcnPlantEval]     = useState<{ results: Record<string, string>; submittedAt: number; submittedBy: string } | null>(null)
  const [asPlantEval,      setAsPlantEval]      = useState<{ results: Record<string, string>; submittedAt: number; submittedBy: string } | null>(null)
  const [ecnPlantTestResults, setEcnPlantTestResults] = useState<Record<string, string>>({})
  const [asPlantTestResults,  setAsPlantTestResults]  = useState<Record<string, string>>({})
```

- [ ] **Step 5: Replace PP pricing reads in `loadData` with plant eval reads**

Remove these lines from `loadData` (around lines 716–788, leaving the NCD_PP_PRICING block and ECN_NEGOTIATION block intact):

**Remove ECN PP Pricing block (lines ~716–727):**
```ts
    // ECN — PP Pricing
    const rawEcnPP = localStorage.getItem(ECN_PP_PRICING_KEY)
    if (rawEcnPP) {
      const allEcnPP = JSON.parse(rawEcnPP)
      if (allEcnPP[npdId]) setEcnPpPricing(allEcnPP[npdId])
    }
    // ECN — PP Pricing R&D Approval
    const rawPpRnd = localStorage.getItem(ECN_PP_RND_APPROVAL_KEY)
    if (rawPpRnd) {
      const allPpRnd = JSON.parse(rawPpRnd)
      if (allPpRnd[npdId]) setEcnPpRndApproval(allPpRnd[npdId])
    }
```

**Remove ECN PP Negotiation load block (lines ~746–751):**
```ts
    // ECN — PP Negotiation
    const rawEcnPpNeg = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
    if (rawEcnPpNeg) {
      const allPpNeg = JSON.parse(rawEcnPpNeg)
      if (allPpNeg[npdId]) setEcnPpNegotiation(allPpNeg[npdId])
    }
```

**Remove AS PP Pricing blocks (lines ~771–788):**
```ts
    // Alt Supplier — PP Pricing (stage 7)
    const rawAsPp = localStorage.getItem(AS_PP_PRICING_KEY)
    if (rawAsPp) {
      const allAsPp = JSON.parse(rawAsPp)
      if (allAsPp[npdId]) setAsPpPricing(allAsPp[npdId])
    }
    // Alt Supplier — PP Sourcing Approval (stage 7 — sourcing explicit approval)
    const rawAsPpSrc = localStorage.getItem(AS_PP_SOURCING_APPROVED_KEY)
    if (rawAsPpSrc) {
      const allAsPpSrc = JSON.parse(rawAsPpSrc)
      if (allAsPpSrc[npdId]) setAsPpSourcingApproved(allAsPpSrc[npdId])
    }
    // Alt Supplier — PP R&D Approval (stage 7 → 8)
    const rawAsPpRnd = localStorage.getItem(AS_PP_RND_APPROVAL_KEY)
    if (rawAsPpRnd) {
      const allAsPpRnd = JSON.parse(rawAsPpRnd)
      if (allAsPpRnd[npdId]) setAsPpRndApproval(allAsPpRnd[npdId])
    }
```

**Add plant eval reads** — place them just before the `// Refresh live data when supplier submits` comment:
```ts
    // ECN — Plant Evaluation (Stage 7)
    const rawEcnPE = localStorage.getItem(ECN_PLANT_EVAL_KEY)
    if (rawEcnPE) {
      const allEcnPE = JSON.parse(rawEcnPE)
      if (allEcnPE[npdId]) { setEcnPlantEval(allEcnPE[npdId]); setEcnPlantTestResults(allEcnPE[npdId].results) }
    }
    // AS — Plant Evaluation (Stage 7)
    const rawAsPE = localStorage.getItem(AS_PLANT_EVAL_KEY)
    if (rawAsPE) {
      const allAsPE = JSON.parse(rawAsPE)
      if (allAsPE[npdId]) { setAsPlantEval(allAsPE[npdId]); setAsPlantTestResults(allAsPE[npdId].results) }
    }
```

- [ ] **Step 6: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: no errors (removed state vars are no longer referenced — the PP pricing UI will be replaced in later tasks, so if there are errors about stale references to the removed state vars, that is expected and will be resolved in later tasks).

---

### Task 3: Remove PP polling useEffects (lines 935–983)

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

- [ ] **Step 1: Remove the ECN stage 7 polling block**

Find and remove this entire block (lines ~935–956):
```ts
  // ECN: poll ECN_PP_NEGOTIATION_KEY + ECN_PP_RND_APPROVAL_KEY every 3s while stage 7 is active
  useEffect(() => {
    if (!isECN || activeStage !== 7) return
    const interval = setInterval(() => {
      const rawNeg = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
      if (rawNeg) {
        const all: Record<string, NegotiationRecord> = JSON.parse(rawNeg)
        if (all[npdId]) setEcnPpNegotiation(all[npdId])
      }
      const rawRnd = localStorage.getItem(ECN_PP_RND_APPROVAL_KEY)
      if (rawRnd) {
        const all: Record<string, { approvedBy: string; approvedAt: number; remarks?: string }> = JSON.parse(rawRnd)
        if (all[npdId]) {
          setEcnPpRndApproval(all[npdId])
          // advance stage as soon as R&D approval is detected
          updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })
          setActiveStage(8)
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, activeStage, npdId])
```

- [ ] **Step 2: Remove the AS stage 7 polling block**

Find and remove this entire block (lines ~958–983):
```ts
  // AS stage 7: poll PP pricing submission, sourcing approval, and R&D approval every 3s
  useEffect(() => {
    if (!isAltSupplier || activeStage !== 7) return
    const interval = setInterval(() => {
      const rawPp = localStorage.getItem(AS_PP_PRICING_KEY)
      if (rawPp) {
        const all = JSON.parse(rawPp)
        if (all[npdId]) setAsPpPricing(all[npdId])
      }
      const rawSrc = localStorage.getItem(AS_PP_SOURCING_APPROVED_KEY)
      if (rawSrc) {
        const all = JSON.parse(rawSrc)
        if (all[npdId]) setAsPpSourcingApproved(all[npdId])
      }
      const rawRnd = localStorage.getItem(AS_PP_RND_APPROVAL_KEY)
      if (rawRnd) {
        const all: Record<string, { approvedBy: string; approvedAt: number; remarks?: string }> = JSON.parse(rawRnd)
        if (all[npdId]) {
          setAsPpRndApproval(all[npdId])
          updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })
          setActiveStage(8)
        }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isAltSupplier, activeStage, npdId])
```

- [ ] **Step 3: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

---

### Task 4: Update demo advance handlers and rollback handlers

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

- [ ] **Step 1: Replace ECN stage 7 demo advance (lines ~1400–1410)**

Find this block inside the ECN-specific demo advance section:
```ts
      // Stage 7→8: sourcing submits PP Pricing
      if (activeStage === 7) {
        const pp = { ppPrice: "275", currency: "INR", moq: "500", leadTime: "30", submittedBy: currentRole, submittedAt: Date.now() }
        const allPP: Record<string, typeof pp> = JSON.parse(localStorage.getItem(ECN_PP_PRICING_KEY) ?? "{}")
        allPP[npdId] = pp
        localStorage.setItem(ECN_PP_PRICING_KEY, JSON.stringify(allPP))
        setEcnPpPricing(pp)
      }
```

Replace with:
```ts
      // Stage 7→8: R&D submits plant evaluation
      if (activeStage === 7) {
        const tests = getTestsByCategory(npd.itemCategory).length > 0 ? getTestsByCategory(npd.itemCategory) : getTestsByCategory("Others")
        const autoResults = Object.fromEntries(tests.map(t => [t.testName, t.unit === "Pass/Fail" ? "Pass" : "OK"]))
        const entry = { results: autoResults, submittedAt: Date.now(), submittedBy: currentRole }
        const allPE: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_PLANT_EVAL_KEY) ?? "{}")
        allPE[npdId] = entry
        localStorage.setItem(ECN_PLANT_EVAL_KEY, JSON.stringify(allPE))
        setEcnPlantEval(entry)
        setEcnPlantTestResults(autoResults)
      }
```

- [ ] **Step 2: Replace AS stage 7 demo advance (lines ~1415–1431)**

Find this block inside the AS-specific demo advance section:
```ts
      // Stage 7→8: sourcing submits PP pricing + sourcing approves
      if (activeStage === 7) {
        const pp = { ppPrice: "275", currency: "INR", moq: "500", leadTime: "30", submittedBy: currentRole, submittedAt: Date.now() }
        const allPP: Record<string, typeof pp> = JSON.parse(localStorage.getItem(AS_PP_PRICING_KEY) ?? "{}")
        allPP[npdId] = pp
        localStorage.setItem(AS_PP_PRICING_KEY, JSON.stringify(allPP))
        setAsPpPricing(pp)
        const srcApproval = { approvedBy: currentRole, approvedAt: Date.now() }
        const allSrc: Record<string, typeof srcApproval> = JSON.parse(localStorage.getItem(AS_PP_SOURCING_APPROVED_KEY) ?? "{}")
        allSrc[npdId] = srcApproval
        localStorage.setItem(AS_PP_SOURCING_APPROVED_KEY, JSON.stringify(allSrc))
        setAsPpSourcingApproved(srcApproval)
      }
```

Replace with:
```ts
      // Stage 7→8: R&D submits plant evaluation
      if (activeStage === 7) {
        const tests = getTestsByCategory(npd.itemCategory).length > 0 ? getTestsByCategory(npd.itemCategory) : getTestsByCategory("Others")
        const autoResults = Object.fromEntries(tests.map(t => [t.testName, t.unit === "Pass/Fail" ? "Pass" : "OK"]))
        const entry = { results: autoResults, submittedAt: Date.now(), submittedBy: currentRole }
        const allPE: Record<string, typeof entry> = JSON.parse(localStorage.getItem(AS_PLANT_EVAL_KEY) ?? "{}")
        allPE[npdId] = entry
        localStorage.setItem(AS_PLANT_EVAL_KEY, JSON.stringify(allPE))
        setAsPlantEval(entry)
        setAsPlantTestResults(autoResults)
      }
```

- [ ] **Step 3: Replace ECN rollback for stage 7/8 (lines ~1538–1554)**

Find this block in the ECN-specific revert section:
```ts
      if (activeStage === 8) {
        setEcnPpPricing(null); setEcnPpPrice(""); setEcnPpMoq(""); setEcnPpLeadTime("")
        const rawPP = localStorage.getItem(ECN_PP_PRICING_KEY)
        if (rawPP) { const all = JSON.parse(rawPP); delete all[npdId]; localStorage.setItem(ECN_PP_PRICING_KEY, JSON.stringify(all)) }
      }
      // Clear negotiation key when rolling back from stage 2 or beyond
      if (activeStage >= 2) {
        const rawNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg) { const all = JSON.parse(rawNeg); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
      }
      // Clear PP negotiation key when rolling back from stage 7 or beyond
      if (activeStage >= 7) {
        const rawPpNeg = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
        if (rawPpNeg) { const all = JSON.parse(rawPpNeg); delete all[npdId]; localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnPpNegotiation(null)
      }
```

Replace with:
```ts
      if (activeStage === 8) {
        setEcnPlantEval(null); setEcnPlantTestResults({})
        const rawPE = localStorage.getItem(ECN_PLANT_EVAL_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(ECN_PLANT_EVAL_KEY, JSON.stringify(all)) }
      }
      // Clear negotiation key when rolling back from stage 2 or beyond
      if (activeStage >= 2) {
        const rawNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg) { const all = JSON.parse(rawNeg); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
      }
```

- [ ] **Step 4: Replace AS rollback for stage 7 (lines ~1605–1616)**

Find this block in the AS-specific revert section:
```ts
      if (activeStage === 7) {
        setAsPpPricing(null); setAsPpSourcingApproved(null); setAsPpPrice(""); setAsPpMoq(""); setAsPpLeadTime("")
        const rawPP = localStorage.getItem(AS_PP_PRICING_KEY)
        if (rawPP) { const all = JSON.parse(rawPP); delete all[npdId]; localStorage.setItem(AS_PP_PRICING_KEY, JSON.stringify(all)) }
        const rawPPSrc = localStorage.getItem(AS_PP_SOURCING_APPROVED_KEY)
        if (rawPPSrc) { const all = JSON.parse(rawPPSrc); delete all[npdId]; localStorage.setItem(AS_PP_SOURCING_APPROVED_KEY, JSON.stringify(all)) }
      }
      if (activeStage === 8) {
        setAsPpRndApproval(null); setAsPpRndRemarks("")
        const rawPPRnd = localStorage.getItem(AS_PP_RND_APPROVAL_KEY)
        if (rawPPRnd) { const all = JSON.parse(rawPPRnd); delete all[npdId]; localStorage.setItem(AS_PP_RND_APPROVAL_KEY, JSON.stringify(all)) }
      }
```

Replace with:
```ts
      if (activeStage === 7) {
        setAsPlantEval(null); setAsPlantTestResults({})
        const rawPE = localStorage.getItem(AS_PLANT_EVAL_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(AS_PLANT_EVAL_KEY, JSON.stringify(all)) }
      }
```

- [ ] **Step 5: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

At this point there will still be errors in the stage 7 R&D and sourcing card JSX (referencing removed state vars). Those are resolved in Tasks 5–8.

---

### Task 5: Replace ECN Stage 7 R&D card

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

The current card at line ~3058–3139 renders the PP pricing summary and R&D approval form. Replace the entire `if (activeStage >= 6) { ... ecnCards.push( <div key="ecn-s7" ... } )` block with the plant evaluation test grid.

- [ ] **Step 1: Locate the block boundaries**

Find the comment `// ── Stage 7: PP Pricing — R&D reviews and approves to close ECN ────` (line ~3058) and find the matching closing `}` at line ~3139 (the line containing `ecnCards.push(` closes just after the `</div>` and `)`).

The block to replace starts at:
```ts
  // ── Stage 7: PP Pricing — R&D reviews and approves to close ECN ────────────
  if (activeStage >= 6) {
```
and ends at the closing brace after the card's `sourcingCards.push()` call (line ~3139):
```ts
  }
```
(This is just the R&D card push block — the sourcing card `if (activeStage >= 6) { sourcingCards.push(...)` follows separately.)

- [ ] **Step 2: Replace with plant evaluation test grid**

Replace the block (from the comment line through the closing `}`) with:

```tsx
  // ── Stage 7: Plant Evaluation & Testing (ECN — R&D view) ─────────────────
  if (activeStage >= 6) {
    const isActive   = activeStage === 7
    const isDone     = activeStage > 7
    const isUpcoming = activeStage === 6
    const plantTestsList = getTestsByCategory(npd.itemCategory).length > 0
      ? getTestsByCategory(npd.itemCategory)
      : getTestsByCategory("Others")
    ecnCards.push(
      <div key="ecn-s7" className={`rounded-xl border p-4 space-y-3 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-500 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto flex items-center gap-1.5">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {isUpcoming && <Badge className="bg-slate-100 text-slate-400 border-none text-xs">Upcoming</Badge>}
            {isActive && !ecnPlantEval && isRnd && <Badge className="bg-orange-100 text-orange-700 border-none text-xs">Action Required</Badge>}
            {isActive && !ecnPlantEval && !isRnd && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && ecnPlantEval && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">Submitted</Badge>}
          </div>
        </div>

        {isActive && !ecnPlantEval && isRnd && (
          <div className="space-y-2">
            {plantTestsList.map(t => (
              <div key={t.testName} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                <input
                  type="text"
                  placeholder="Result"
                  value={ecnPlantTestResults[t.testName] ?? ""}
                  onChange={e => setEcnPlantTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
            <button
              disabled={plantTestsList.some(t => !ecnPlantTestResults[t.testName]?.trim())}
              onClick={() => {
                const entry = { results: ecnPlantTestResults, submittedAt: Date.now(), submittedBy: currentRole }
                const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(ECN_PLANT_EVAL_KEY) ?? "{}")
                all[npdId] = entry
                localStorage.setItem(ECN_PLANT_EVAL_KEY, JSON.stringify(all))
                setEcnPlantEval(entry)
                updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })
                setActiveStage(8)
              }}
              className="mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Submit Plant Evaluation</button>
          </div>
        )}

        {isActive && !ecnPlantEval && !isRnd && (
          <p className="text-xs text-slate-400 italic">Awaiting R&D plant evaluation — R&D will run tests and submit results.</p>
        )}

        {(isDone || ecnPlantEval) && ecnPlantEval && (
          <div className="space-y-1 mt-1">
            {Object.entries(ecnPlantEval.results).map(([name, val]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1">Submitted by {ecnPlantEval.submittedBy} · {new Date(ecnPlantEval.submittedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>
    )
  }
```

- [ ] **Step 3: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

---

### Task 6: Replace ECN Stage 7 Sourcing card

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

The current ECN sourcing Stage 7 card (lines ~6405–6675) has the full PP pricing form and negotiation widget. Replace it with a simple read-only status card.

- [ ] **Step 1: Locate the block**

Find the block starting with:
```ts
  if (activeStage >= 6) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    sourcingCards.push(
      <div key="src-s7"
```
which is a separate `if (activeStage >= 6)` block from the one pushing `src-s6`. It ends at:
```ts
    )
  }
  if (activeStage >= 7) {
    const s8Done = activeStage >= 8
    sourcingCards.push(
      <div key="src-s8"
```

- [ ] **Step 2: Replace with read-only status card**

Replace the entire block (from the `if (activeStage >= 6) {` that pushes `key="src-s7"` down to its closing `}`) with:

```tsx
  if (activeStage >= 6) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    sourcingCards.push(
      <div key="src-s7" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-500 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {!isDone && !isActive && <Badge className="bg-slate-100 text-slate-400 border-none text-xs">Upcoming</Badge>}
            {isActive && !ecnPlantEval && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && ecnPlantEval && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
          </div>
        </div>
        {isActive && !ecnPlantEval && (
          <p className="text-xs text-slate-400 italic mt-2">R&D is running plant evaluation tests. No sourcing action required at this stage.</p>
        )}
        {ecnPlantEval && (
          <p className="text-xs text-emerald-700 font-medium mt-2">Plant evaluation submitted by {ecnPlantEval.submittedBy} · {new Date(ecnPlantEval.submittedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }
```

- [ ] **Step 3: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

---

### Task 7: Replace AS Stage 7 R&D card

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

The current AS Stage 7 R&D card (lines ~2564–2617) shows the PP pricing summary and R&D approval form. Replace with a plant evaluation test grid mirroring the ECN Stage 7 R&D card.

- [ ] **Step 1: Locate the block**

Find the comment `// ── AS Stage 7: PP Pricing (R&D view — approval action) ────` (line ~2564) and the block ends at line ~2617 just before `// ── AS Stage 8: AS Summary & Closure`.

The block to replace:
```ts
  // ── AS Stage 7: PP Pricing (R&D view — approval action) ────────────────
  if (activeStage >= 7) {
    ...
    asCards.push(...)
  }
```

- [ ] **Step 2: Replace with plant evaluation test grid**

Replace with:

```tsx
  // ── AS Stage 7: Plant Evaluation & Testing (R&D view) ────────────────────
  if (activeStage >= 7) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    const plantTestsList = getTestsByCategory(npd.itemCategory).length > 0
      ? getTestsByCategory(npd.itemCategory)
      : getTestsByCategory("Others")
    asCards.push(
      <div key="as-s7" className={`rounded-xl border p-4 space-y-3 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2 mb-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto flex items-center gap-1.5">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {isActive && !asPlantEval && isRnd && <Badge className="bg-orange-100 text-orange-700 border-none text-xs">Action Required</Badge>}
            {isActive && !asPlantEval && !isRnd && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && asPlantEval && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">Submitted</Badge>}
          </div>
        </div>

        {isActive && !asPlantEval && isRnd && (
          <div className="space-y-2">
            {plantTestsList.map(t => (
              <div key={t.testName} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-44 shrink-0">{t.testName} ({t.unit})</span>
                <input
                  type="text"
                  placeholder="Result"
                  value={asPlantTestResults[t.testName] ?? ""}
                  onChange={e => setAsPlantTestResults(prev => ({ ...prev, [t.testName]: e.target.value }))}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
            <button
              disabled={plantTestsList.some(t => !asPlantTestResults[t.testName]?.trim())}
              onClick={() => {
                const entry = { results: asPlantTestResults, submittedAt: Date.now(), submittedBy: currentRole }
                const all: Record<string, typeof entry> = JSON.parse(localStorage.getItem(AS_PLANT_EVAL_KEY) ?? "{}")
                all[npdId] = entry
                localStorage.setItem(AS_PLANT_EVAL_KEY, JSON.stringify(all))
                setAsPlantEval(entry)
                updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })
                setActiveStage(8)
              }}
              className="mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg"
            >Submit Plant Evaluation</button>
          </div>
        )}

        {isActive && !asPlantEval && !isRnd && (
          <p className="text-xs text-slate-400 italic">Awaiting R&D plant evaluation — R&D will run tests and submit results.</p>
        )}

        {(isDone || asPlantEval) && asPlantEval && (
          <div className="space-y-1 mt-1">
            {Object.entries(asPlantEval.results).map(([name, val]) => (
              <div key={name} className="flex justify-between text-xs border-b border-slate-100 pb-0.5">
                <span className="text-slate-500">{name}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1">Submitted by {asPlantEval.submittedBy} · {new Date(asPlantEval.submittedAt).toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>
    )
  }
```

- [ ] **Step 3: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

---

### Task 8: Replace AS Stage 7 Sourcing card

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

The current AS sourcing Stage 7 card (lines ~5813–5918) has the full PP pricing form with two-step sourcing approval. Replace with a simple read-only status card.

- [ ] **Step 1: Locate the block**

Find the comment `// ── AS Stage 7: PP Pricing (sourcing primary actor) ───────────────────────` (line ~5813). The block to replace ends just before `// ── AS Stage 8: Closure banner ─────────────────────────────────────────────` (line ~5920).

- [ ] **Step 2: Replace with read-only status card**

Replace the entire block with:

```tsx
  // ── AS Stage 7: Plant Evaluation & Testing (sourcing view — read-only) ──────
  if (activeStage >= 7) {
    const isActive = activeStage === 7
    const isDone   = activeStage > 7
    asSourcingCards.push(
      <div key="as-src-s7" className={`rounded-xl border p-4 ${isDone ? "bg-slate-50 border-slate-200" : isActive ? "border-orange-300 bg-orange-50/30" : "bg-slate-50 border-slate-200 opacity-50"}`}>
        <div className="flex items-center gap-2">
          {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-orange-600 shrink-0" />}
          <h4 className="font-bold text-slate-800 text-sm">Stage 7 — Plant Evaluation &amp; Testing</h4>
          <div className="ml-auto">
            {isDone && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
            {isActive && !asPlantEval && <Badge className="bg-amber-100 text-amber-700 border-none text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Awaiting R&D</Badge>}
            {isActive && asPlantEval && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs">Complete</Badge>}
          </div>
        </div>
        {isActive && !asPlantEval && (
          <p className="text-xs text-slate-400 italic mt-2">R&D is running plant evaluation tests. No sourcing action required at this stage.</p>
        )}
        {asPlantEval && (
          <p className="text-xs text-emerald-700 font-medium mt-2">Plant evaluation submitted by {asPlantEval.submittedBy} · {new Date(asPlantEval.submittedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }
```

- [ ] **Step 3: Final type-check and full pass**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: zero errors across the entire project.

- [ ] **Step 4: Verify no remaining references to removed state vars**

```bash
grep -n "ecnPpPricing\|ecnPpRndApproval\|ecnPpRndRemarks\|ecnPpPrice\|ecnPpCurrency\|ecnPpMoq\|ecnPpLeadTime\|ecnPpNegotiation\|ppNegTargetPrice\|ppNegCurrency\|asPpPricing\|asPpSourcingApproved\|asPpRndApproval\|asPpRndRemarks\|asPpPrice\|asPpCurrency\|asPpMoq\|asPpLeadTime" "src/app/(internal)/npd/[id]/page.tsx"
```

Expected: no output (all references eliminated).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mockData.ts "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat(stage7): replace PP Pricing with Plant Evaluation & Testing for ECN and AS flows"
```
