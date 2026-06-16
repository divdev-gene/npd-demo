# Plant Evaluation & Testing — ECN/AS Stage 7 Redesign

**Date:** 2026-06-08
**Files:** `src/lib/mockData.ts`, `src/app/(internal)/npd/[id]/page.tsx`
**Scope:** Stage 7 for ECN and Alternative Supplier flows only.

---

## Problem

ECN Stage 7 and AS Stage 7 are currently "PP Pricing" — sourcing submits pricing data, then R&D Head confirms plant testing is done. This mixes pricing and testing concerns, and the user wants the stage to be a proper R&D plant evaluation with a test grid matching the stage 4 R&D testing pattern.

## Goal

Replace Stage 7 for ECN and AS with "Plant Evaluation & Testing" — R&D fills out a standard test grid, submits, and the record advances to stage 8 (summary). PP pricing logic is retired from these two flows.

---

## Storage

### New keys (add to `mockData.ts`)

```ts
export const ECN_PLANT_EVAL_KEY = "ecn_plant_eval_v1"
export const AS_PLANT_EVAL_KEY  = "as_plant_eval_v1"
```

**Shape** (same as `ECN_PRICE_ESTIMATION_KEY`):
```ts
Record<npdId, {
  results:     TestResult[]
  submittedAt: number
  submittedBy: string
}>
```

### Existing PP pricing keys

`ECN_PP_PRICING_KEY`, `ECN_PP_RND_APPROVAL_KEY`, `AS_PP_PRICING_KEY`, `AS_PP_SOURCING_APPROVED_KEY`, `AS_PP_RND_APPROVAL_KEY` remain in `mockData.ts` but are **no longer imported or used** in the ECN/AS Stage 7 flow. `NCD_PP_PRICING_KEY` is untouched (NCD Stage 7 is unchanged).

---

## Stage name

In `getStageName()` in `mockData.ts`:

| Flow | Stage | Old name | New name |
|------|-------|----------|----------|
| ECN  | 7     | `"PP Pricing"` | `"Plant Evaluation & Testing"` |
| AS   | 7     | `"PP Pricing"` | `"Plant Evaluation & Testing"` |

---

## State changes (`npd/[id]/page.tsx`)

### Remove

All PP pricing state for ECN and AS:
- ECN: `ecnPpPrice`, `ecnPpCurrency`, `ecnPpMoq`, `ecnPpLeadTime`, `ecnPpPricing`, `ecnPpRndApproval`, `ecnPpRndRemarks`, `ecnPpNegotiation`
- AS: `asPpPrice`, `asPpCurrency`, `asPpMoq`, `asPpLeadTime`, `asPpPricing`, `asPpSourcingApproved`, `asPpRndApproval`, `asPpRndRemarks`

### Add

```ts
const [ecnPlantEval, setEcnPlantEval] = useState<{ results: TestResult[], submittedAt: number, submittedBy: string } | null>(null)
const [asPlantEval,  setAsPlantEval]  = useState<{ results: TestResult[], submittedAt: number, submittedBy: string } | null>(null)
const [ecnPlantTestResults, setEcnPlantTestResults] = useState<TestResult[]>([])
const [asPlantTestResults,  setAsPlantTestResults]  = useState<TestResult[]>([])
```

---

## Data loading

In the `loadData` function, replace PP pricing reads with:

```ts
// ECN Plant Eval
const rawEcnPE = localStorage.getItem(ECN_PLANT_EVAL_KEY)
if (rawEcnPE) { const all = JSON.parse(rawEcnPE); if (all[npdId]) setEcnPlantEval(all[npdId]) }

// AS Plant Eval
const rawAsPE = localStorage.getItem(AS_PLANT_EVAL_KEY)
if (rawAsPE) { const all = JSON.parse(rawAsPE); if (all[npdId]) setAsPlantEval(all[npdId]) }
```

No cross-tab polling needed — plant eval is submitted by the same session's R&D user.

### Remove polling

Remove the `useEffect` that polls `ECN_PP_NEGOTIATION_KEY`, `ECN_PP_RND_APPROVAL_KEY`, `AS_PP_PRICING_KEY`, `AS_PP_SOURCING_APPROVED_KEY`, `AS_PP_RND_APPROVAL_KEY` every 3s (lines ~935–978).

---

## Stage 7 UI — R&D view (ECN and AS)

### Card structure

Identical pattern to ECN Stage 4 R&D testing card. Pushed when `activeStage >= 6` (upcoming at stage 6, active at stage 7, done at stage 8+).

**Header:** `Stage 7 — Plant Evaluation & Testing`

**Upcoming state** (`activeStage === 6`): `opacity-50`, `Circle` icon, "Upcoming" badge. No content.

**Active state** (`activeStage === 7`):

- If `!ecnPlantEval` and `isRnd`: render test grid using `getTestsByCategory(npd.itemCategory)`. Each test row: test name, pass/fail toggle buttons, notes input — same markup pattern as the Stage 4 test grid. "Submit Plant Evaluation" button (disabled until at least one test has a result).
- On submit: write to `ECN_PLANT_EVAL_KEY` (or `AS_PLANT_EVAL_KEY`), call `updateNPD(npdId, { stage: 8, stageName: getStageName(8, npd.typeOfWork) })`, `setActiveStage(8)`.
- If `!ecnPlantEval` and `!isRnd`: "Awaiting R&D plant evaluation" note.

**Done state** (`activeStage > 7`): Emerald collapsed strip — overall pass/fail count, submitted by, timestamp.

### Actor

`isRnd` (any R&D role) can submit. No separate approval gate — submission directly advances to stage 8.

---

## Stage 7 UI — Sourcing view (ECN and AS)

Single read-only card:

- Upcoming / active: "Awaiting R&D Plant Evaluation" amber badge.
- Done: "Complete" emerald badge + submitted by + timestamp from the plant eval record.

No action required from sourcing at this stage.

---

## Rollback cleanup

In the existing revert-stage handlers:

- **ECN rollback from stage 7 or beyond:** clear `ECN_PLANT_EVAL_KEY[npdId]`, reset `ecnPlantEval` and `ecnPlantTestResults`.
- **AS rollback from stage 7 or beyond:** clear `AS_PLANT_EVAL_KEY[npdId]`, reset `asPlantEval` and `asPlantTestResults`.

---

## What does NOT change

- NCD Stage 7 (PP Pricing) — untouched.
- ECN Stages 1–6 — untouched.
- AS Stages 1–6 — untouched.
- Stage 8 summary cards for ECN and AS — untouched (they don't reference PP pricing fields in a breaking way; any PP pricing display lines are simply removed since the state vars are gone).
- All PP key constants in `mockData.ts` — kept, just unused in this flow.
- `ECN_PP_NEGOTIATION_KEY` and `ECN_PP_NEGOTIATION_KEY` (Stage 2 negotiation) — untouched, still used at Stage 2.
