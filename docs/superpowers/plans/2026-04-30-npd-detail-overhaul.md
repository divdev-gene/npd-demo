# NPD Detail Page Overhaul (Sub-projects 1 & 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tab-heavy 10-stage NPD detail page with a clean role-based 8-stage vertical layout.

**Architecture:** `mockData.ts` gains `NPD_STAGES` (8-stage array) + `TOTAL_NPD_STAGES`, and mock records are remapped. `page.tsx` drops `<Tabs>`, the Prev/Next header buttons, and the 10-node stepper; replaces them with a read-only 8-node progress bar, a new header info card, and two role-gated vertical sections (RND and Sourcing). Super Admin sees both sections simultaneously.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react

---

## File Map

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add `NPD_STAGES`, `TOTAL_NPD_STAGES`; update `getStageName` NTD fallback; remap 5 mock NPD records |
| `src/app/(internal)/npd/[id]/page.tsx` | Remove `NTD_STAGES`/`TOTAL_STAGES` locals, mail state, `deadvanceStage`; import new constants; replace full JSX return with progress bar + header card + RND section + Sourcing section |

---

## Task 1 — Add `NPD_STAGES` to `mockData.ts` and remap mock records

**Files:**
- Modify: `src/lib/mockData.ts`

### Steps

- [ ] **Step 1: Add `NPD_STAGES` and `TOTAL_NPD_STAGES` constants**

After line 227 (after the `DEFAULT_RND_CONTACT` block), insert:

```ts
export const NPD_STAGES = [
  "Request Initialisation",        // 1
  "RND Internal Review",           // 2
  "Supplier Sourcing & Quotation", // 3
  "Supplier Dispatch",             // 4
  "RND Evaluation",                // 5
  "RND Testing & TQR",             // 6
  "RND Approval",                  // 7
  "Re-Sampling",                   // 8
] as const
export const TOTAL_NPD_STAGES = 8
```

- [ ] **Step 2: Update `getStageName` to use `NPD_STAGES` for the NTD fallback**

In `getStageName` (line ~446), replace the entire `const ntdStages = [...]` block and its return with:

```ts
  return NPD_STAGES[stage - 1] ?? "Unknown"
```

The ECN and Compliance branches above it are unchanged.

- [ ] **Step 3: Remap NCD/PP mock NPD stage values and stageNames**

Apply these changes to `mockNPDs`. Only NCD and PP type records are remapped (ECN and Compliance use their own stage arrays and are unchanged):

| NPD ID | type | old stage | new stage | old stageName | new stageName |
|--------|------|-----------|-----------|---------------|---------------|
| NPD-FY-2026-0012 | NCD | 5 | 4 | "Sample Submission" | "Supplier Dispatch" |
| NPD-FY-2026-0014 | NCD | 8 | 6 | "FPA (First Part Approval)" | "RND Testing & TQR" |
| NPD-FY-2026-0005 | NCD | 10 | 7 | "PP Lot Pricing" | "RND Approval" |
| NPD-FY-2026-0008 | PP  | 2 | 2 | "R&D Internal Review" | "RND Internal Review" |
| NPD-FY-2026-0027 | NCD | 5 | 4 | "Sample Submission" | "Supplier Dispatch" |

- [ ] **Step 4: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat: add NPD_STAGES (8 stages), remap mock NPD records"
```

---

## Task 2 — Update constants, state, and helpers in `page.tsx`

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

### Steps

- [ ] **Step 1: Import `NPD_STAGES` and `TOTAL_NPD_STAGES` from mockData; remove unused import**

In the import from `@/lib/mockData` (line 6), add `NPD_STAGES, TOTAL_NPD_STAGES` to the list.

Also add `FolderOpen, UploadCloud` to the lucide imports if not already present (they are already imported at line 21).

Remove `Inbox, Pencil, CornerUpLeft, Bot, RefreshCw` from the lucide import block — these were only used in the mail inbox tab which is being removed.

- [ ] **Step 2: Remove the local `NTD_STAGES` and `TOTAL_STAGES` constants**

Delete lines 25–31:
```ts
const NTD_STAGES = [
  "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation",
  "Supplier Defense", "Sample Submission", "Sample Receipt / MRN",
  "R&D Evaluation", "FPA (First Part Approval)", "Sample Cost Finalization",
  "PP Lot Pricing"
]
const TOTAL_STAGES = NTD_STAGES.length // 10
```

- [ ] **Step 3: Remove mail-related state variables**

Delete the five mail state vars (lines 71–74):
```ts
  const [mailFolder,   setMailFolder]   = useState<"inbox" | "sent" | "system">("inbox")
  const [selectedMail, setSelectedMail] = useState<number | null>(0)
  const [replyText,    setReplyText]    = useState("")
  const [replySent,    setReplySent]    = useState<Record<number, boolean>>({})
```

Also delete the `costSaved`/`setCostSaved` state (line 93) and its `useEffect` loader (lines 201–207) — the Sample Cost tab is being removed.

- [ ] **Step 4: Add `isRnd` helper after `isSpocOrSourcing`**

After line 249:
```ts
  const isSpocOrSourcing = SPOC_NAMES.includes(currentRole) ||
    currentRole === "sourcing_head" || currentRole === "super_admin"
```

Insert:
```ts
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
```

- [ ] **Step 5: Remove `deadvanceStage` function**

Delete lines 240–246:
```ts
  const deadvanceStage = () => {
    if (activeStage > 1) {
      const prev = activeStage - 1
      setActiveStage(prev)
      updateNPD(npdId, { stage: prev, stageName: getStageName(prev, npd.typeOfWork) })
    }
  }
```

- [ ] **Step 6: Update `advanceStage` to use `TOTAL_NPD_STAGES` and `NPD_STAGES`**

Replace lines 232–238:
```ts
  const advanceStage = () => {
    if (activeStage < TOTAL_STAGES) {
      const next = activeStage + 1
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: getStageName(next, npd.typeOfWork) })
    }
  }
```

With:
```ts
  const advanceStage = () => {
    if (activeStage < TOTAL_NPD_STAGES) {
      const next = activeStage + 1
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: NPD_STAGES[next - 1] ?? getStageName(next, npd.typeOfWork) })
    }
  }
```

- [ ] **Step 7: Update `stageProgress` to use `NPD_STAGES`**

Replace lines 226–231:
```ts
  const stageProgress = NTD_STAGES.map((name, idx) => ({
    step: idx + 1,
    name,
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))
```

With:
```ts
  const stageProgress = NPD_STAGES.map((name, idx) => ({
    step: idx + 1,
    name,
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))
```

- [ ] **Step 8: Update `dispatchEnquiry` to advance to stage 3**

In `dispatchEnquiry` (line ~292), change the stage advance from 4 to 3:
```ts
    if (activeStage < 3) {
      setActiveStage(3)
      updateNPD(npdId, { stage: 3, stageName: NPD_STAGES[2] })
    }
```

- [ ] **Step 9: Update `setVendorApproval` to advance to stage 4**

In `setVendorApproval` (line ~367), change the approval advance from stage 5 to stage 4:
```ts
      const updates: Partial<typeof npd> = { supplier: vendorName }
      if (activeStage < 4) {
        setActiveStage(4)
        updates.stage = 4
        updates.stageName = NPD_STAGES[3]
      }
      updateNPD(npdId, updates)
```

- [ ] **Step 10: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only errors in the JSX return which we haven't changed yet).

---

## Task 3 — Replace old header + stepper with new progress bar and header card

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

This task replaces the `return (...)` JSX starting at line ~416 through line ~499 (end of the progress stepper). Keep all content from line 500 onwards (the `<Tabs>` block) — that will be removed in Task 4.

### Steps

- [ ] **Step 1: Replace the old header card (lines ~420–465) with the new NPD header card**

Remove this block (lines ~420–465):
```tsx
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        ...
        {/* includes Prev/Next buttons */}
      </div>
```

Replace with:
```tsx
      {/* NPD Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          {/* Left column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{npd.id}</span>
              {npd.gradeA && (
                <Badge className="bg-purple-100 text-purple-900 border-none flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3" /> Grade A
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{npd.itemName}</h1>
            <p className="text-slate-500 text-sm">{npd.itemCategory} · {npd.productLine}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-slate-100 text-slate-700 border-none text-xs">{npd.typeOfWork}</Badge>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor}`}>{npd.priority}</span>
            </div>
          </div>
          {/* Right column: 2×2 info chips */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned SPOC</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{npd.spoc}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locked Supplier</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {npd.supplier && npd.supplier !== "Pending Assignment"
                  ? npd.supplier
                  : <span className="text-slate-400 italic font-normal text-xs">Pending Assignment</span>}
              </p>
            </div>
            <div className={`border rounded-lg px-4 py-2.5 min-w-[140px] ${
              npd.tatHealth === "black" ? "bg-red-50 border-red-200" :
              npd.tatHealth === "red"   ? "bg-red-50 border-red-200" :
              npd.tatHealth === "amber" ? "bg-amber-50 border-amber-200" :
              "bg-emerald-50 border-emerald-200"
            }`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TAT Health</p>
              <p className={`text-sm font-bold mt-0.5 ${tatColor}`}>{tatLabel}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-sm font-semibold text-blue-900 mt-0.5 leading-tight">
                {activeStage}. {NPD_STAGES[activeStage - 1] ?? getStageName(activeStage, npd.typeOfWork)}
              </p>
            </div>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Replace the 10-node progress stepper with a read-only 8-node progress bar**

Remove lines ~467–499 (the old `{/* Progress Stepper */}` block) and replace with:

```tsx
      {/* 8-Stage Progress Bar — read-only */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <ul className="flex items-center justify-between min-w-[700px]">
          {stageProgress.map((stage, idx) => (
            <li key={stage.step} className="relative flex-1 text-center">
              {idx !== 0 && (
                <div className={`absolute top-4 left-[-10%] right-[50%] h-0.5 w-[120%] -z-10 ${
                  stage.status === "complete" || stage.status === "current" ? "bg-blue-900" : "bg-slate-200"
                }`} />
              )}
              <div className="flex flex-col items-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${
                  stage.status === "complete" ? "border-blue-900 bg-blue-900 text-white" :
                  stage.status === "current"  ? "border-blue-900 bg-blue-50 text-blue-900 ring-4 ring-blue-100" :
                  "border-slate-300 text-slate-300"
                }`}>
                  {stage.status === "complete"
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <span className="text-xs font-bold">{stage.step}</span>}
                </div>
                <div className="absolute top-10 w-20 text-center pointer-events-none">
                  <span className={`text-[9px] leading-tight font-medium ${
                    stage.status === "current"  ? "text-blue-900 font-bold" :
                    stage.status === "complete" ? "text-slate-600" :
                    "text-slate-400"
                  }`}>
                    {stage.name}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="h-10" />
      </div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only inside the old `<Tabs>` block (not yet modified). No errors in the new header/progress bar code.

---

## Task 4 — RND vertical section

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

This task replaces the opening `<Tabs>` wrapper and inserts the RND vertical section. The `<TabsList>` and `<TabsTrigger>` elements (lines ~502–528) are deleted. The Overview `<TabsContent>` (lines ~531–944) is replaced by role-based section cards.

### Steps

- [ ] **Step 1: Delete the `<Tabs>` opening and `<TabsList>` block**

Delete lines ~501–528:
```tsx
      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList ...>
          <TabsTrigger value="overview" ...>...</TabsTrigger>
          ...all TabsTrigger elements...
        </TabsList>
```

Also remove the `Tabs, TabsContent, TabsList, TabsTrigger` import from `@/components/ui/tabs`.

- [ ] **Step 2: Delete the Overview `<TabsContent>` wrapper tags**

Remove:
```tsx
        {/* ── Overview ──────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
```
And its closing `</TabsContent>` tag (line ~944).

- [ ] **Step 3: Insert the RND vertical section wrapper around the existing overview content**

Wrap the surviving overview content (Initiation Details card, Activity Log card, and the stage-specific action cards) in:

```tsx
      {/* ═══════════════════════════════ RND SECTION ═══════════════════════════════ */}
      {isRnd && (
        <div className="space-y-6">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-blue-900 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">R&D Team</span>
            </div>
          )}

          {/* ── Section 1: My Actions ─────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-base">My Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">

              {/* Stage 1 — Request Initialisation (read-only summary) */}
              <div className={`rounded-xl border p-4 ${activeStage > 1 ? "bg-slate-50 border-slate-200" : "border-blue-300 bg-blue-50/30"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {activeStage > 1
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-blue-700 shrink-0" />}
                  <h4 className="font-bold text-slate-800 text-sm">Stage 1 — Request Initialisation</h4>
                  {activeStage > 1 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {([
                    ["Item", npd.itemName],
                    ["Category", npd.itemCategory],
                    ["Type of Work", npd.typeOfWork],
                    ["Product Line", npd.productLine],
                    ["R&D Division", npd.rAndDDivision || "—"],
                    ["Raised By", npd.raisedBy === "rnd_head" ? "R&D Head" : "R&D User"],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-400 text-xs">{label}</span>
                      <span className="text-slate-800 font-medium text-xs text-right max-w-[140px] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 2 — RND Internal Review */}
              {activeStage >= 2 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 2  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 2 ? "border-blue-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 2
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-blue-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700">2</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 2 — RND Internal Review</h4>
                    {activeStage > 2 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Released to Sourcing</Badge>}
                  </div>
                  {activeStage === 2 && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Drawing / Spec Folder</p>
                        {npd.driveLink ? (
                          <a
                            href={npd.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2"
                          >
                            <ExternalLink className="w-4 h-4" /> Open Drive Folder
                          </a>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No drawing link attached.</p>
                        )}
                      </div>
                      {currentRole === "rnd_head" ? (
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => {
                            setActiveStage(3)
                            updateNPD(npdId, { stage: 3, stageName: NPD_STAGES[2] })
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve & Release to Sourcing
                        </Button>
                      ) : (
                        <p className="text-sm text-slate-400 italic flex items-center gap-1.5">
                          <Clock className="w-4 h-4 shrink-0" /> Awaiting R&D Head sign-off to release to Sourcing.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 5 — RND Evaluation (proof of delivery) */}
              {activeStage >= 5 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 5  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 5 ? "border-blue-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 5
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-blue-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700">5</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 5 — RND Evaluation</h4>
                    {activeStage > 5 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 5 && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">Samples received from supplier. Upload proof of delivery to confirm receipt and advance to testing.</p>
                      <div
                        onClick={() => setFpaImageUploaded(v => !v)}
                        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                          fpaImageUploaded ? "border-emerald-400 bg-emerald-50" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white"
                        }`}
                      >
                        {fpaImageUploaded ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-emerald-700">delivery_confirmation.jpg</p>
                            <p className="text-xs text-emerald-600">Click to remove</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <UploadCloud className="w-8 h-8 text-blue-400 mb-1" />
                            <p className="text-sm font-semibold text-slate-700">Upload proof of delivery</p>
                            <p className="text-xs text-slate-400">PDF, PNG, JPG accepted</p>
                          </div>
                        )}
                      </div>
                      {fpaImageUploaded && (
                        <Button
                          className="bg-blue-900 hover:bg-blue-800 text-white"
                          onClick={() => {
                            setActiveStage(6)
                            updateNPD(npdId, { stage: 6, stageName: NPD_STAGES[5] })
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Confirm Receipt & Advance to Testing
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 6 — RND Testing & TQR */}
              {activeStage >= 6 && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 6  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 6 ? "border-emerald-400 bg-white shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 6
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-600">6</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 6 — RND Testing & TQR</h4>
                    {activeStage > 6 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Completed</Badge>}
                  </div>
                  {activeStage === 6 && (
                    <div className="space-y-4">
                      {tqrStatus === "rejecting" ? (
                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                          <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                            <h3 className="text-red-800 font-bold mb-2">Initiate Sample Rejection</h3>
                            <div className="space-y-4 mt-4">
                              <div>
                                <label className="text-sm font-medium text-slate-700">Reason for Rejection <span className="text-red-500">*</span></label>
                                <textarea
                                  className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-red-500 focus:border-red-500"
                                  rows={3}
                                  placeholder="Describe dimensional failures, performance gaps, etc."
                                  onChange={e => setRejectReason(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-slate-700">Upload Revised Drawing (if any)</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center mt-1 bg-white hover:bg-slate-50 cursor-pointer">
                                  <p className="text-sm text-slate-500">Click or drag updated Teamcenter PDF here</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                              <Button variant="outline" onClick={() => setTqrStatus("pending")}>Cancel</Button>
                              <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={!rejectReason}
                                onClick={() => {
                                  alert("SAMPLE REJECTED.\n\nAutomated email dispatched to Supplier & Sourcing.")
                                  setTqrStatus("rejected")
                                }}
                              >
                                Confirm Rejection & Notify Supplier
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : tqrStatus === "rejected" ? (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-lg text-center">
                          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                          <h3 className="text-base font-bold">Sample Rejected by R&D</h3>
                          <p className="text-sm mt-1">Supplier has been notified to provide an updated sample submission timeline.</p>
                        </div>
                      ) : tqrStatus === "fully_approved" ? (
                        <div className="space-y-3">
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-lg text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                            <h3 className="text-base font-bold">TQR Fully Approved</h3>
                            <p className="text-sm mt-1">Both R&D User and R&D Head have approved. Auto-mail dispatched.</p>
                          </div>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              setActiveStage(7)
                              updateNPD(npdId, { stage: 7, stageName: NPD_STAGES[6] })
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Advance to RND Approval
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 p-5 rounded-lg border border-blue-100 gap-4">
                          <div>
                            <p className="text-sm font-bold text-blue-900">Sample Evaluation Actions</p>
                            <p className="text-xs text-blue-700 mt-1">Review the physical sample and documentation before rendering a decision.</p>
                          </div>
                          {tqrStatus === "pending" ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                                <XCircle className="w-4 h-4 mr-2" /> Reject Sample
                              </Button>
                              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTqrStatus("approved_by_user")}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve (Route to R&D Head)
                              </Button>
                            </div>
                          ) : tqrStatus === "approved_by_user" && (currentRole === "rnd_head" || currentRole === "super_admin") ? (
                            <div className="text-right">
                              <p className="text-emerald-700 font-bold mb-2 text-sm">✓ R&D User Approved. Awaiting Your Sign-off.</p>
                              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus("rejecting")}>
                                  <XCircle className="w-4 h-4 mr-2" /> Override & Reject
                                </Button>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                                  alert("APPROVAL COMPLETE.\n\nAuto-mail dispatched to Supplier & Sourcing.")
                                  setTqrStatus("fully_approved")
                                }}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" /> Final R&D Head Approval
                                </Button>
                              </div>
                            </div>
                          ) : tqrStatus === "approved_by_user" ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-sm font-medium">
                              <Clock className="w-4 h-4 mr-1" /> Pending R&D Head Approval
                            </Badge>
                          ) : (
                            <div className="text-slate-500 italic text-sm">Action locked for your current role.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stage 7 — RND Approval (rnd_head only) */}
              {activeStage >= 7 && (currentRole === "rnd_head" || currentRole === "super_admin") && (
                <div className={`rounded-xl border p-4 ${
                  activeStage > 7  ? "bg-slate-50 border-slate-200 opacity-80" :
                  activeStage === 7 ? "border-purple-400 bg-purple-50/30 shadow-sm" :
                  "border-slate-200 bg-slate-50 opacity-50"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {activeStage > 7
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-purple-700 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-purple-700">7</span>
                        </div>}
                    <h4 className="font-bold text-slate-800 text-sm">Stage 7 — RND Approval</h4>
                    {activeStage > 7 && <Badge className="bg-emerald-100 text-emerald-700 border-none text-xs ml-auto">Approved</Badge>}
                  </div>
                  {activeStage === 7 && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">All testing complete and TQR approved. Final R&D Head sign-off required before PP lot.</p>
                      <Button
                        className="bg-purple-700 hover:bg-purple-800 text-white"
                        onClick={() => {
                          setActiveStage(8)
                          updateNPD(npdId, { stage: 8, stageName: NPD_STAGES[7] })
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Final Approval — Advance to Re-Sampling
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* ── Section 2: Sourcing Info (read-only) ─────────────── */}
          {activeStage >= 3 && (
            <Card>
              <CardHeader className="pb-3 border-b bg-slate-50">
                <CardTitle className="text-base">Sourcing Status</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Read-only summary of sourcing progress</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendors Contacted</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{sentVendors.length > 0 ? `${sentVendors.length} vendor${sentVendors.length !== 1 ? "s" : ""}` : "—"}</p>
                    {sentVendors.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sentVendors.slice(0,2).join(", ")}{sentVendors.length > 2 ? ` +${sentVendors.length - 2}` : ""}</p>}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locked Supplier</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : <span className="text-slate-400 italic font-normal text-xs">Not yet locked</span>}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Date</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {(() => {
                        const live = npd.supplier && liveQuotes[npd.supplier]
                        return (live?.formValues.supplyDate || live?.formValues.q1) ?? "—"
                      })()}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing Stage</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {activeStage < 3 ? "Awaiting Release" :
                       activeStage === 3 ? "Awaiting Quotations" :
                       activeStage === 4 ? "Awaiting Dispatch" :
                       activeStage >= 5 ? "Supplier Dispatched" : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Section 3: Document Library ──────────────────────── */}
          {/* KEEP the existing Documents Library tab content here (lines ~2264–2357 of the original file) — copy it in, wrapped in a <Card> with a "Document Library" CardTitle, removing the TabsContent wrapper */}

        </div>
      )}
```

- [ ] **Step 4: Move the Document Library content**

Take the Documents Library `<TabsContent value="docs" ...>` block (lines ~2264–2357) and paste its inner content (the two Card elements for "Design & Drawing Folder" and "Supplier Submitted Documents") inside the Document Library section placeholder from Step 3, wrapped as follows:

```tsx
          {/* ── Section 3: Document Library ──────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b bg-slate-50">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-700" /> Document Library
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Design & Drawing Folder card — paste existing content here */}
              {/* Supplier Submitted Documents card — paste existing content here */}
            </CardContent>
          </Card>
```

Delete the old `<TabsContent value="docs" ...>` wrapper and its closing tag.

- [ ] **Step 5: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in remaining old TabsContent blocks (supplier, quotes, testing, costing, tracking, mail) — not in the new RND section.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat: replace Tabs + header with progress bar, header card, RND vertical section"
```

---

## Task 5 — Sourcing vertical section and final cleanup

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

### Steps

- [ ] **Step 1: Insert Sourcing vertical section after the closing `})}` of the RND section**

After the `{isRnd && (...)}` block, insert:

```tsx
      {/* ═══════════════════════════════ SOURCING SECTION ═══════════════════════════════ */}
      {isSpocOrSourcing && (
        <div className="space-y-6">
          {currentRole === "super_admin" && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">Sourcing Team</span>
            </div>
          )}

          {/* ── Section 1: Supplier Sourcing & Quotations ─── */}
          {activeStage < 3 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Waiting for R&D to release to Sourcing</p>
                <p className="text-xs mt-1">Once R&D Head approves Stage 2, this section will unlock.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* PASTE the existing Supplier Sourcing Workflow TabsContent inner content here (lines ~949–1200 approx) */}
              {/* PASTE the existing Vendor Quotations TabsContent inner content here (lines ~1200–1671 approx) */}
            </div>
          )}

          {/* ── Section 2: Supplier Dispatch ──────────────── */}
          {activeStage >= 4 && (
            <div className="space-y-4">
              {/* PASTE the existing Supplier Defence card from the Overview TabsContent (lines ~616–668) here.
                  Rename the card title from "Supplier Defence — Awaiting Dispatch" to "Supplier Dispatch"
                  and remove the stage 4 guard (the section header already gates it). */}
            </div>
          )}

          {/* ── Section 3: Parts & Supplier Tracking ──────── */}
          {/* PASTE the Parts & Supplier Tracking TabsContent inner content here (lines ~2050–2262 approx) */}

          {/* ── Section 4: Re-Sampling (stage 8 only) ─────── */}
          {activeStage === 8 && (
            <Card>
              <CardHeader className="pb-3 border-b bg-slate-50">
                <CardTitle className="text-base">Re-Sampling</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Define new sample quantity and expected supply date for the next round</p>
              </CardHeader>
              <CardContent className="pt-5">
                <ReSamplingForm npdId={npdId} baseUrl={baseUrl} npd={npd} sentVendors={sentVendors} />
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* close outer div */}
    </div>
  )
```

- [ ] **Step 2: Add the `ReSamplingForm` inline component (above the `NpdDetailView` export)**

Add this before `export default function NpdDetailView()`:

```tsx
function ReSamplingForm({ npdId, baseUrl, npd, sentVendors }: {
  npdId: string
  baseUrl: string
  npd: { itemName: string; spoc: string; supplier: string }
  sentVendors: string[]
}) {
  const [reSampleQty, setReSampleQty] = useState("")
  const [reSampleDate, setReSampleDate] = useState("")
  const [generated, setGenerated] = useState(false)

  const vendor = npd.supplier && npd.supplier !== "Pending Assignment"
    ? npd.supplier
    : sentVendors[0] ?? ""

  const portalUrl = vendor
    ? `${baseUrl}/supplier/quote/${npdId}?vendor=${encodeURIComponent(vendor)}&resample=1&qty=${reSampleQty}&date=${reSampleDate}`
    : ""

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">New Sample Quantity</label>
          <input
            type="number"
            value={reSampleQty}
            onChange={e => setReSampleQty(e.target.value)}
            placeholder="e.g. 5"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Expected Supply Date</label>
          <input
            type="date"
            value={reSampleDate}
            onChange={e => setReSampleDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      {!generated ? (
        <Button
          className="bg-blue-900 hover:bg-blue-800 text-white"
          disabled={!reSampleQty || !reSampleDate || !vendor}
          onClick={() => setGenerated(true)}
        >
          <Send className="w-4 h-4 mr-2" /> Generate Re-Sample Quote URL
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2.5">
            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-blue-700 font-mono truncate flex-1">{portalUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(portalUrl) }}
              className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-blue-700">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-xs text-slate-400 italic">Share this link with {vendor} for re-sampling.</p>
        </div>
      )}
    </div>
  )
}
```

`Link2` and `Copy` are already imported from lucide. If `Send` is not in scope at this point, add it to the lucide import.

- [ ] **Step 3: Paste Supplier Sourcing Workflow content**

From the existing file, the `<TabsContent value="supplier" ...>` block (approximately lines 947–1200) contains:
- A vendor requirement brief
- The vendor registration table with checkboxes
- The dispatch RFQ panel

Copy this content (everything inside the `<TabsContent>` tags) into the Sourcing section's stage ≥ 3 block, replacing the `{/* PASTE the existing Supplier Sourcing Workflow TabsContent inner content here */}` placeholder.

Remove the outer `{isSpocOrSourcing ? (` guard inside it (the role gate is now at the section level).

- [ ] **Step 4: Paste Vendor Quotations content**

From the existing file, the `<TabsContent value="quotes" ...>` block (approximately lines 1200–1671) contains the quotation cards for each vendor.

Copy this content into the Sourcing section, right below the supplier workflow content.

Remove the outer `TabsContent` tags.

- [ ] **Step 5: Paste Supplier Dispatch content**

From the existing Overview section, the Supplier Defence card (approximately lines 616–668) is the dispatch link card. Copy this into the `{activeStage >= 4 && (...)}` block in Section 2 of the Sourcing section.

Rename the card title from "Supplier Defence — Awaiting Dispatch" to "Supplier Dispatch" and remove the `{activeStage === 4 && (` outer guard (the parent already gates on `activeStage >= 4`).

- [ ] **Step 6: Paste Parts & Supplier Tracking content**

From the existing file, the `<TabsContent value="tracking" ...>` block (approximately lines 2050–2262) contains the tracking table.

Copy the inner content into Section 3 of the Sourcing section, removing the `TabsContent` wrapper.

- [ ] **Step 7: Remove all remaining old `<TabsContent>` blocks**

Delete the following now-orphaned `<TabsContent>` blocks (they have been either moved or removed):
- `<TabsContent value="supplier" ...>` — moved to Sourcing Section 1
- `<TabsContent value="quotes" ...>` — moved to Sourcing Section 1
- `<TabsContent value="testing" ...>` — moved to RND Section 1 Stage 6
- `<TabsContent value="costing" ...>` — **removed** per spec
- `<TabsContent value="tracking" ...>` — moved to Sourcing Section 3
- `<TabsContent value="docs" ...>` — moved to RND Section 3
- `<TabsContent value="mail" ...>` — **removed** per spec

Also delete the closing `</Tabs>` tag.

- [ ] **Step 8: Remove unused state variables**

Remove these state vars that were only used in the removed tabs:
- `costSaved` / `setCostSaved` (Sample Cost tab removed)
- All five mail state vars if not already removed in Task 2

- [ ] **Step 9: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 10: Start the dev server and visually verify**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npm run dev &
```

Check the following:
1. `/npd/NPD-FY-2026-0012` (stage 4 NCD, Rahul Sharma SPOC) — progress bar shows stage 4 highlighted; RND section shows stages 1–5 cards; Sourcing section shows vendor table + dispatch section
2. Switch role to `rnd_head` — My Actions stage 2 shows "Approve & Release to Sourcing"; stage 7 shows final approval button
3. Switch role to `sourcing_head` — only Sourcing section visible (no RND section)
4. Switch role to `super_admin` — both sections visible with role group header badges

- [ ] **Step 11: Commit**

```bash
git add "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat: add Sourcing vertical section, Re-Sampling form, remove tabs + mail + cost tabs"
```
