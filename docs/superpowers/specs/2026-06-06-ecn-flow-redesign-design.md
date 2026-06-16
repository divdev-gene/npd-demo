# ECN Flow Redesign — Design Spec
**Date:** 2026-06-06  
**Branch:** divyansh-NPD-demo  
**Status:** Approved

---

## Problem

The current ECN stage order is wrong for the real workflow:
- Stage 1 requires a manual "Submit" click even though the request was already submitted at creation
- Supplier Dispatch sits at stage 6, *after* testing — but samples must be dispatched *before* R&D can test them
- R&D Head approval and DQA approval are separate actions with no combined view
- Stage cards render in ascending order; the active/latest stage is buried at the bottom
- The supplier dispatch portal has no price estimation field

---

## Approved Stage Map

| # | Stage Name | Primary Actor | Completion Trigger |
|---|---|---|---|
| 1 | ECN Request Initialisation | R&D | Auto-completed on NPD creation (no manual step) |
| 2 | Sourcing Review & RFQ | Sourcing | Sourcing clicks "Send RFQ & Proceed" after reviewing brief + composing mail |
| 3 | Supplier Sample Dispatch | Supplier (open URL) | Supplier submits dispatch date, docs, and price estimation via `/supplier/ecn-sourcing/[id]` |
| 4 | R&D Testing | R&D User | R&D marks samples received, runs test suite, submits results |
| 5 | DQA Testing | DQA Engineer / DQA Lead | DQA runs test suite, submits results |
| 6 | R&D Head Approval | R&D Head | Reviews both R&D + DQA results side-by-side; single Approve/Reject action |
| 7 | PP Pricing | Sourcing / PP team | Existing PP pricing card; sourcing confirms pricing |
| 8 | ECN Summary & Closure | R&D / Sourcing | ECN report generated; closure sign-off |

---

## Data Layer Changes

### `src/lib/mockData.ts`

1. **Update `getStageName()` ECN block** to use the 8 stage names above.

2. **Add new localStorage key constant:**
   ```ts
   export const ECN_PRICE_ESTIMATION_KEY = "ecn_price_estimation_v1"
   ```
   Shape: `Record<npdId, { pricePerUnit: string; currency: "INR" | "USD" | "EUR"; submittedAt: number }>`

### Existing keys that remain unchanged
- `ECN_STAGE1_KEY` — still records who/when created the request (written at creation, not on a separate submit)
- `ECN_RND_APPROVAL_KEY` — repurposed to store Sourcing RFQ sign-off at stage 2 (key name stays, shape stays: `{ verdict, approvedBy, approvedAt }`)
- `ECN_SOURCING_DISPATCH_KEY` — supplier dispatch submission (stage 3), shape unchanged
- `VENDOR_TESTS_KEY[npdId][supplier]` — R&D test results (stage 4)
- `VENDOR_VERDICTS_KEY` — not used for ECN; DQA results go into a new key below

3. **Add DQA test results key for ECN:**
   ```ts
   export const ECN_DQA_TESTS_KEY = "ecn_dqa_tests_v1"
   ```
   Shape: `Record<npdId, { results: TestResult[]; submittedAt: number; submittedBy: string }>`

4. **Add RND Head combined approval key:**
   ```ts
   export const ECN_HEAD_APPROVAL_KEY = "ecn_head_approval_v1"
   ```
   Shape: `Record<npdId, { verdict: "approved" | "rejected"; remarks?: string; approvedBy: string; approvedAt: number }>`

---

## File-by-File Changes

### 1. `src/app/(internal)/npd/new/page.tsx`

On ECN form submission (Step 3 confirm → `addNPD`):
- Write `ECN_STAGE1_KEY[newId] = { submittedBy: currentRole, submittedAt: Date.now() }` immediately after creating the NPD record
- Set `stage: 2` on the created `NPDRecord` (not stage 1)
- This makes stage 1 appear as "Completed" the moment the detail page loads

### 2. `src/lib/mockData.ts`

- Update `getStageName()` ECN array (8 entries, as above)
- Add `ECN_PRICE_ESTIMATION_KEY`, `ECN_DQA_TESTS_KEY`, `ECN_HEAD_APPROVAL_KEY` exports

### 3. `src/app/(internal)/npd/[id]/page.tsx` — ECN section

#### Render order: descending
Build the ECN stage cards as an array `ecnStageCards`, then render `[...ecnStageCards].reverse()`. The active/latest stage appears at the top; completed stages stack below it.

#### State additions
```ts
const [ecnPriceEstimation, setEcnPriceEstimation] = useState<null | { pricePerUnit: string; currency: string; submittedAt: number }>(null)
const [ecnDqaTests,        setEcnDqaTests]        = useState<null | { results: ...; submittedAt: number; submittedBy: string }>(null)
const [ecnHeadApproval,    setEcnHeadApproval]    = useState<null | { verdict: string; remarks?: string; approvedBy: string; approvedAt: number }>(null)
```
Load these in the same `useEffect` that loads `ecnStage1Data` and `ecnRndApproval`.

#### Stage card specs

**Stage 1 — ECN Request Initialisation**
- Always rendered as `isDone = true` (stage is always ≥ 2 when this page loads for ECN)
- Shows: submitted by, submitted at, ECN brief summary grid (part number, part name, supplier, change description, priority, TAT, drawing link, remarks)
- No action buttons — read-only

**Stage 2 — Sourcing Review & RFQ**
- Active when `activeStage === 2`
- Shows ECN brief summary (part number, part name, existing supplier, change description)
- When active and no RFQ sent yet: show NCD-style mail compose panel
  - Pre-filled "To" with supplier name, subject line `[RFQ] ECN - {ecnPartName} - {npdId}`
  - Body from `VENDOR_RFQ_TEMPLATE_KEY` / `DEFAULT_RFQ_TEMPLATE` (same template NCD uses)
  - Styled email preview box (same visual as NCD sourcing stage 2 RFQ compose block)
  - "Send RFQ & Proceed →" button → writes `ECN_RND_APPROVAL_KEY[npdId]`, advances to stage 3
- When done: shows "RFQ Sent" badge, sent-at timestamp, email preview collapsed

**Stage 3 — Supplier Sample Dispatch**
- Active when `activeStage === 3`
- Shows: supplier portal link `{baseUrl}/supplier/ecn-sourcing/{npdId}` with copy button
- Shows submission status from `ECN_SOURCING_DISPATCH_KEY`
- Auto-advances to stage 4 when `ecnSourcingDispatch?.submittedAt` is detected (same polling pattern as NCD `useEffect` on dispatch)
- When done: shows dispatch date, docs list, price estimation per unit

**Stage 4 — R&D Testing**
- Active when `activeStage === 4`
- Sub-step A: "Mark samples received" toggle (writes a flag to `ECN_SOURCING_DISPATCH_KEY[npdId].samplesReceived`)
- Sub-step B (unlocked after samples received): test suite from `getTestsByCategory(npd.itemCategory)`, same UI as existing NCD RND testing card, writes to `VENDOR_TESTS_KEY[npdId][npd.supplier]`
- "Submit R&D Results →" button advances to stage 5

**Stage 5 — DQA Testing**
- Active when `activeStage === 5`
- Same test form UI as existing DQA card (already rendered outside `isRnd` block)
- Writes to `ECN_DQA_TESTS_KEY[npdId]`
- "Submit DQA Results →" button advances to stage 6

**Stage 6 — R&D Head Approval**
- Active when `activeStage === 6`
- Two read-only panels side-by-side:
  - Left: R&D test results summary from `VENDOR_TESTS_KEY[npdId][npd.supplier]`
  - Right: DQA test results summary from `ECN_DQA_TESTS_KEY[npdId]`
- Optional remarks textarea
- "Approve →" and "Reject" buttons (only visible to `rnd_head` or `super_admin`)
- On approve: writes `ECN_HEAD_APPROVAL_KEY[npdId]`, advances to stage 7
- On reject: writes verdict "rejected", stage stays at 6, a "Rejected" badge is shown — no automatic rollback. Sourcing team must contact R&D to re-engage; out of scope for this demo.

**Stages 7–8** — existing PP Pricing and ECN Summary & Closure cards, unchanged except label updates

#### Sourcing card section
The sourcing-team ECN block (currently at line ~4249) mirrors the R&D card structure:
- Stage 2: sourcing is the primary actor (same mail compose panel, same button)
- Stage 3: shows portal link + dispatch status read-only view
- Stages 4–6: read-only status panels for sourcing visibility

### 4. `src/app/supplier/ecn-sourcing/[id]/page.tsx`

Add "Price Estimation" section between the docs section and the submit button:

```
┌─────────────────────────────────┐
│ Price Estimation Per Unit       │
│ Currency  [INR ▾]  Amount [___] │
└─────────────────────────────────┘
```

- Currency: select with options INR / USD / EUR, defaults to INR
- Amount: numeric text input, required
- On submit: write `ECN_PRICE_ESTIMATION_KEY[npdId] = { pricePerUnit, currency, submittedAt }` alongside existing `ECN_SOURCING_DISPATCH_KEY` write
- `canSubmit` condition: add `!!pricePerUnit && parseFloat(pricePerUnit) > 0`
- Confirmation screen: add "Price Estimate: ₹/$/€ {amount} per unit" to the success summary

---

## Auto-Advance: Stage 3 → 4

In `npd/[id]/page.tsx`, add a `useEffect` watching `ecnSourcingDispatch`:
```ts
useEffect(() => {
  if (!isECN || activeStage !== 3) return
  if (ecnSourcingDispatch?.submittedAt) {
    updateNPD(npdId, { stage: 4, stageName: getStageName(4, npd.typeOfWork) })
    setActiveStage(4)
  }
}, [ecnSourcingDispatch, activeStage, isECN])
```
Also poll via an interval (3 s) to pick up supplier portal submission while the tab is open, same as NCD dispatch auto-advance.

---

## Backward Compatibility

- Existing ECN NPD records in `localStorage` will have `stage: 1` or `stage: 2` using old numbering. On load, if `isECN && npd.stage === 1 && ecnStage1Data`, treat as stage 2 (one-time migration in the load `useEffect`).
- Old `ECN_SOURCING_DISPATCH_KEY` records without `samplesReceived` field are treated as `samplesReceived: false`.

---

## Out of Scope

- TAT Extension flow (kept as-is in stage 2, sourcing can still request it before approving)
- Report content changes (ECN Summary & Closure card and `reportGenerator.ts` are unchanged)
- NCD / Compliance flows (zero changes)
