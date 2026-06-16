## ECN Flow — Detailed Stage Reference

`typeOfWork === "Engineering Change Notice (ECN)"`. Single fixed supplier (set at wizard creation from `VENDOR_CATALOG`). No multi-vendor selection. ECN starts at **stage 1**.

**Stage card rendering:** The NPD detail page builds two arrays — `ecnCards` (R&D view) and `sourcingCards` (sourcing view). Both are rendered with `[...array].reverse()` so the latest stage appears at the top (descending order). Each stage N+1 is added to the array when `activeStage >= N` (one stage ahead) so the "upcoming" card is always visible in the list. When a card is upcoming (`activeStage === N-1`), it renders with `opacity-50`, a `Circle` icon, and an "Upcoming" badge. When active it shows its full action UI. When done (`activeStage > N`) it shows a collapsed summary strip with a `CheckCircle2`.

**Stage advance pattern:**
```ts
updateNPD(npdId, { stage: N, stageName: getStageName(N, npd.typeOfWork) })
setActiveStage(N)
```

**Cross-portal polling:** `useEffect` with `setInterval(..., 3000)` is used wherever the internal page must detect state written by the supplier portal (ECN Stage 3 dispatch) or by another role session (ECN Stage 7 R&D approval). Always clean up with `return () => clearInterval(interval)`.

---

### ECN Stage 1 — ECN Request Initialisation

| | |
|---|---|
| **Actor** | R&D (any `isRnd` role) |
| **Gate** | None — active from creation |
| **Action** | R&D reviews the ECN brief (part number, change description, existing supplier). Clicks "Submit ECN Request" to formally open the workflow. |
| **localStorage written** | `ECN_STAGE1_KEY` → `{ submittedAt: string, submittedBy: string }` keyed by `npdId` |
| **Transition** | On submit: `stage → 2`, `stageName → getStageName(2, typeOfWork)` |
| **UI** | `ecnCards` card; shows ECN part details, change description, supplier name. Submit button only for `isRnd`. After submit: emerald completion strip with timestamp + who submitted. |
| **Sourcing view** | Sourcing card shows this as a read-only "ECN Request" summary. No action required. |

---

### ECN Stage 2 — R&D Review & Approval (with Price Negotiation)

| | |
|---|---|
| **Actor** | R&D Head (`rnd_head` or `super_admin`) for approval. Sourcing for price negotiation with supplier. |
| **Gate** | `activeStage >= 2` |
| **R&D action** | R&D Head reviews the ECN request brief. Optionally adds remarks. Clicks "Approve ECN Request" to green-light proceeding. |
| **localStorage written (R&D)** | `ECN_RND_APPROVAL_KEY` → `{ approvedBy, approvedAt, note? }` keyed by `npdId` |
| **Transition** | On R&D Head approval: `stage → 3`, `stageName → getStageName(3, typeOfWork)` |
| **Price negotiation** | Sourcing can open a multi-round price negotiation with the supplier (via the ECN supplier portal `/supplier/ecn-sourcing/[id]`). Negotiation state stored in `ECN_NEGOTIATION_KEY` → `NegotiationRecord`. Supplier portal polls this key and shows a counter-offer input. The internal sourcing card shows a `NegotiationWidget` with rounds, current target price, and "Accept" / "Counter" actions. |
| **`NegotiationRecord` shape** | `{ status: "pending" \| "accepted" \| "rejected", rounds: NegotiationRound[], supplierName: string, initiatedAt: number }` |
| **`NegotiationRound` shape** | `{ by: "sourcing" \| "supplier", price: number, currency: string, sentAt: number, note?: string }` |
| **Supplier portal** | `/supplier/ecn-sourcing/[id]` — shows the latest round price from sourcing; supplier enters counter-price and submits. Polls `ECN_NEGOTIATION_KEY` every 3s. |
| **Sourcing card** | Shows: current negotiation status, all rounds in timeline, "Start Negotiation" (sends first target price), "Accept Supplier Price" (finalises negotiation), share portal link button. |

---

### ECN Stage 3 — Supplier Sample Dispatch

| | |
|---|---|
| **Actor** | Sourcing (internal) initiates; Supplier (portal) executes dispatch |
| **Gate** | `activeStage >= 3` |
| **Sourcing action** | Sourcing shares the ECN supplier sample dispatch link (`/supplier/ecn-sourcing/[id]`) with the supplier. No form submission required internally — just tracking. |
| **Supplier portal action** | Supplier visits `/supplier/ecn-sourcing/[id]`, uploads proof of dispatch (mock click-to-toggle), sets ETA date, clicks "Confirm Dispatch". |
| **localStorage written (supplier)** | `ECN_SOURCING_DISPATCH_KEY` → `{ dispatchDate, docs: string[], submittedAt }` keyed by `npdId` |
| **Transition** | The internal page polls `ECN_SOURCING_DISPATCH_KEY` every 3s (when `activeStage === 3`). When dispatch detected: `stage → 4`, `setActiveStage(4)`. |
| **UI** | Sourcing card: shows portal link, countdown/awaiting badge. After dispatch detected: emerald "Dispatch Confirmed" strip with ETA and doc. R&D card: read-only dispatch summary. |
| **Supplier portal page** | `src/app/supplier/ecn-sourcing/[id]/page.tsx` — handles both price negotiation (PP price widget) and sample dispatch (file upload + date + confirm button). |

---

### ECN Stage 4 — R&D Testing

| | |
|---|---|
| **Actor** | R&D engineer or R&D Head (`isRnd`) |
| **Gate** | `activeStage >= 4` |
| **Action** | R&D enters test results across multiple test categories (dimensional, material, functional, etc.). Each test has a pass/fail toggle and a notes field. Clicks "Submit R&D Evaluation". |
| **localStorage written** | `ECN_PRICE_ESTIMATION_KEY` → `{ results: TestResult[], submittedAt, startedAt }` keyed by `npdId` (note: key name reflects historical naming; used for stage 4 R&D test data in ECN) |
| **Transition** | On submit: `stage → 5`, `stageName → getStageName(5, typeOfWork)` |
| **UI** | R&D card only (no sourcing action). Test grid with category headers, pass/fail badges. After submit: results summary with overall status. |

---

### ECN Stage 5 — DQA Testing

| | |
|---|---|
| **Actor** | DQA engineer or DQA lead (`dqa_engineer`, `dqa_lead`) |
| **Gate** | `activeStage >= 5` |
| **Action** | DQA runs 4 standard tests: Dimensional Inspection, Visual/Surface Inspection, Hardness Test, Salt Spray/Corrosion. Each has pass/fail + notes. Clicks "Submit DQA Results". |
| **localStorage written** | `ECN_DQA_TESTS_KEY` → `{ results: DQAResult[], submittedAt }` keyed by `npdId` |
| **Transition** | On submit: `stage → 6`, `stageName → getStageName(6, typeOfWork)` |
| **UI** | **Rendered outside the `{isRnd && (...)}` block** so DQA roles can see and edit it. `canEdit = currentRole === "dqa_engineer" || currentRole === "dqa_lead" || currentRole === "super_admin"`. After submit: results grid with pass/fail color badges. |
| **Sourcing view** | Read-only DQA result summary appears in sourcing cards after stage 5. |

---

### ECN Stage 6 — R&D Head Approval

| | |
|---|---|
| **Actor** | R&D Head (`rnd_head` or `super_admin`) for the approval action |
| **Gate** | `activeStage >= 6` |
| **Action** | R&D Head reviews combined R&D test results + DQA test results in a two-column panel. Optionally adds remarks. Clicks "Approve & Proceed to PP Pricing" or "Reject". |
| **localStorage written** | `ECN_HEAD_APPROVAL_KEY` → `{ approvedBy, approvedAt, note? }` keyed by `npdId` |
| **Transition** | On approve: `stage → 7`, `stageName → getStageName(7, typeOfWork)`, `setActiveStage(7)` |
| **UI design** | Two-column grid: left column (emerald header) = R&D test results, right column (cyan header) = DQA results. Pass/fail values shown as colored pill badges. Violet action box with textarea + Approve/Reject buttons (`canApprove = currentRole === "rnd_head" || currentRole === "super_admin"`). After approval: emerald outcome strip with icon, verdict, remarks, timestamp. |
| **Sourcing view** | Sourcing card shows a read-only "Awaiting R&D Head Approval" banner until `ECN_HEAD_APPROVAL_KEY` is set, then shows "Approved — Proceeding to PP Pricing". |

---

### ECN Stage 7 — Plant Evaluation & Testing

| | |
|---|---|
| **Actor** | R&D (`isRnd`) — any R&D engineer or R&D Head |
| **Gate** | `activeStage >= 6` (card visible from stage 6 as "Upcoming") |
| **Action** | R&D fills out a standard test grid (same categories as Stage 4 R&D testing via `getTestsByCategory`). Each test: pass/fail toggle + notes. Clicks "Submit Plant Evaluation". Submission directly advances to stage 8 — no separate approval gate. |
| **localStorage written** | `ECN_PLANT_EVAL_KEY` → `{ results: TestResult[], submittedAt: number, submittedBy: string }` keyed by `npdId` |
| **Transition** | On submit: `stage → 8`, `stageName → getStageName(8, typeOfWork)`, `setActiveStage(8)`. No polling needed — R&D submits in the same session. |
| **R&D card** | Upcoming (`activeStage === 6`): `opacity-50`, "Upcoming" badge. Active (`activeStage === 7`): test grid + "Submit Plant Evaluation" button. Done: emerald collapsed strip with pass/fail count, submitted by, timestamp. |
| **Sourcing card** | Read-only. Upcoming/active: "Awaiting R&D Plant Evaluation" amber badge. Done: "Complete" emerald badge + submitted by + timestamp. No action required from sourcing. |

---

### ECN Stage 8 — ECN Summary & Closure

| | |
|---|---|
| **Actor** | No action required — auto-complete on stage advance |
| **Gate** | `activeStage >= 7` (visible as "Upcoming" from stage 7) |
| **Content** | Summary of full ECN lifecycle: part details, supplier, all stage timestamps, final PP price, R&D and DQA results overview. |
| **localStorage written** | None — stage 8 is informational only. |
| **Transition** | None — terminal stage. |
| **UI** | Both `ecnCards` and `sourcingCards` show a compact card: emerald background + `CheckCircle2` when done, slate + `Circle` + "Upcoming" badge when stage 7. |

---

## ECN localStorage Keys

| Key constant | Stores |
|---|---|
| `ECN_STAGE1_KEY` | `Record<npdId, {submittedAt, submittedBy}>` — ECN stage 1 submission |
| `ECN_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, note?}>` — ECN R&D Head approval at stage 2 |
| `ECN_SOURCING_DISPATCH_KEY` | `Record<npdId, {dispatchDate, docs, submittedAt}>` — ECN stage 3 supplier sample dispatch |
| `ECN_PRICE_ESTIMATION_KEY` | `Record<npdId, {...}>` — ECN stage 4 R&D test data (historical key name) |
| `ECN_DQA_TESTS_KEY` | `Record<npdId, {results, submittedAt}>` — ECN DQA test results (stage 5) |
| `ECN_HEAD_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, note?}>` — ECN R&D Head final approval |
| `ECN_PLANT_EVAL_KEY` | `Record<npdId, {results: TestResult[], submittedAt, submittedBy}>` — ECN Stage 7 plant evaluation test results |
| `ECN_INITIAL_QUOTE_KEY` | `Record<npdId, {price, currency, submittedAt}>` — supplier's initial price quote (ECN Stage 2 + AS Stage 3) |
| `ECN_NEGOTIATION_KEY` | `Record<npdId, NegotiationRecord>` — ECN Stage 2 and AS Stage 3 multi-round negotiation (shared key) |
| `ECN_PP_PRICING_KEY` | `Record<npdId, {currency, pricePerUnit, moq, leadTime, submittedAt, submittedBy}>` — **Unused** in ECN Stage 7 (replaced by Plant Evaluation & Testing); still exported from `mockData.ts` |
| `ECN_PP_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, remarks?}>` — **Unused** in ECN Stage 7 (replaced); still exported |
| `ECN_PP_NEGOTIATION_KEY` | `Record<npdId, NegotiationRecord>` — **Unused** (was ECN Stage 7 PP price negotiation; Stage 7 replaced by Plant Evaluation & Testing); still exported |

## ECN Role-to-Stage Access

| Stage | Who can act |
|-------|-------------|
| ECN Stage 1 | `isRnd` (any R&D role) — submits ECN request |
| ECN Stage 2 | `rnd_head` / `super_admin` — approves. Sourcing — negotiates price. |
| ECN Stage 3 | Supplier portal — dispatches samples |
| ECN Stage 4 | `isRnd` — submits R&D test results |
| ECN Stage 5 | `dqa_engineer`, `dqa_lead` — submits DQA results |
| ECN Stage 6 | `rnd_head` / `super_admin` — approve/reject |
| ECN Stage 7 | `isRnd` — submits plant evaluation test grid, directly advances to stage 8. No sourcing action. |
| ECN Stage 8 | None — informational |

## Price Negotiation Flow

Used in ECN Stage 2 (`ECN_NEGOTIATION_KEY`) and AS Stage 3 (`ECN_NEGOTIATION_KEY` — shared key). Both use the identical `NegotiationRecord` shape.

```ts
type NegotiationRound = {
  by: "sourcing" | "supplier"
  price: number
  currency: string
  sentAt: number
  note?: string
}

type NegotiationRecord = {
  status: "pending" | "accepted" | "rejected"
  rounds: NegotiationRound[]
  supplierName: string
  initiatedAt: number
}
```

**ECN flow (sourcing initiates):**
1. Sourcing clicks "Start Negotiation" → sends first round (`by: "sourcing"`, target price) → writes to key with `status: "pending"`.
2. Supplier portal polls key every 3s. When a sourcing round exists, shows target price + counter-offer input.
3. Supplier submits counter → appends round (`by: "supplier"`) to `rounds[]`.
4. Internal page polls key every 3s. When supplier round detected, `NegotiationWidget` shows the counter-offer and "Accept" / "Counter" options.
5. Repeat until sourcing clicks "Accept Supplier Price" → sets `status: "accepted"`.
6. When `status === "accepted"`, `negInFlight` becomes false and the PP pricing submission form reappears.

**`negInFlight` gate (ECN Stage 2 sourcing card):** `const negInFlight = ecnNegotiation && ecnNegotiation.status === "pending"`. Stage 2 submission is not blocked by a negotiation — it's a separate optional flow. `ECN_PP_NEGOTIATION_KEY` is retained in `mockData.ts` but no longer used (Stage 7 PP pricing was replaced by Plant Evaluation & Testing).

## "Upcoming" Card Display Rules

Both `ecnCards` and `sourcingCards` are rendered with `[...array].reverse()`. To maintain descending visual order without gaps, each stage N is pushed into the array when `activeStage >= N-1` (one stage early). The card detects its own state:

```ts
const isActive   = activeStage === N
const isDone     = activeStage > N
const isUpcoming = activeStage === N - 1
```

When `isUpcoming`: `opacity-50`, `Circle` icon, "Upcoming" badge, action content hidden.
When `isActive`: full action UI shown, colored border.
When `isDone`: collapsed summary strip, `CheckCircle2` icon, emerald/slate background.

Specifically for ECN:
- Stage 8 card: pushed when `activeStage >= 7`
- Stage 7 card: pushed when `activeStage >= 6`
- All earlier stages: pushed when `activeStage >= N` (no upcoming treatment needed since they're always done before the next)

## ECN Wizard (step 2)

Dedicated two-column form — left "Part Details" (Part Number, Part Name, Existing Supplier from `VENDOR_CATALOG`, Manufacturing Plant, Priority) + right "Change Parameters" (TAT as a single field, Drawing/Spec Sheet Link, Remarks). ECN starts at **stage 1**; `totalTat` is set directly from the single TAT field; `supplier` is set at creation.
