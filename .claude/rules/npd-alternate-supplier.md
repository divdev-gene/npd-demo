## Alternative Supplier (AS) Flow — Detailed Stage Reference

`typeOfWork === "Alternative Supplier (AS)"`. Starts at **stage 1**. Single supplier proposed at stage 1 by sourcing; no multi-vendor flow. No commodity selection in the creation wizard. Shares localStorage keys with ECN for stages 4–6 (R&D testing, DQA testing, R&D Head approval). Stage 3 is a price negotiation stage unique to AS.

**Visibility rule:** AS NPDs are hidden from most users. Allowed viewers: requester (`raisedBy`), R&D roles, DQA roles, and `super_admin`. Check applied in `archive/page.tsx`, `dashboard/lead/page.tsx`, and as a hard gate in `npd/[id]/page.tsx`:
```ts
const isDqaRole = currentRole === "dqa_engineer" || currentRole === "dqa_lead"
currentRole.startsWith("rnd") || currentRole === "super_admin" || isDqaRole || n.raisedBy === currentRole
```

**Stage rendering:** `asCards` array (R&D view) + `asSourcingCards` array (sourcing view), both rendered newest-first with `[...array].reverse()`. Pattern matches ECN upcoming/active/done logic.

---

### AS Stage 1 — Sourcing Request Initiation

| | |
|---|---|
| **Actor** | Sourcing SPOC (`isSpocOrSourcing`) fills the form; R&D sees a read-only summary |
| **Gate** | Active from creation |
| **Action** | Sourcing enters proposed supplier name, reason for qualification, and optional docs link. Clicks "Submit Request". |
| **localStorage written** | `AS_STAGE1_KEY` → `{ supplierName, reason, docsLink?, submittedAt, submittedBy }` keyed by `npdId` |
| **Transition** | On submit: `stage → 2` |

---

### AS Stage 2 — R&D Review & Approval

| | |
|---|---|
| **Actor** | R&D Head (`rnd_head` or `super_admin`) |
| **Gate** | `activeStage >= 2` |
| **Action** | R&D Head reviews the sourcing request. Optionally adds remarks. Clicks "Approve" to green-light the qualification. |
| **localStorage written** | `AS_RND_APPROVAL_KEY` → `{ approvedBy, approvedAt, note? }` keyed by `npdId` |
| **Transition** | On approve: `stage → 3` |

---

### AS Stage 3 — Price Negotiation & Supplier Sample Dispatch

| | |
|---|---|
| **Actor** | Supplier submits initial quote via `/supplier/ecn-sourcing/[id]`; sourcing negotiates and approves |
| **Gate** | `activeStage >= 3` — triggered when AS stage 2 R&D approval is detected |
| **Flow** | Supplier visits the ECN sourcing portal and submits their price quote first (stored in `ECN_INITIAL_QUOTE_KEY`). Sourcing then either accepts or counter-offers via `ECN_NEGOTIATION_KEY` (same `NegotiationRecord` shape as ECN Stage 2). When sourcing approves the negotiated price (`approvedAt` set on the record), stage auto-advances to 4. |
| **localStorage written** | `ECN_INITIAL_QUOTE_KEY` (supplier's first quote), `ECN_NEGOTIATION_KEY` (negotiation rounds + final approval) |
| **Transition** | Auto-advance when `ecnNegotiation.approvedAt` is detected (polling every 3s) |
| **Supplier portal** | `/supplier/ecn-sourcing/[id]` — same page as ECN. At stage 3, shows supplier's price input form; after rounds, shows Accept/Reject buttons |

**AS Stage 3 difference from ECN (supplier initiates):** Supplier submits their price first via `ECN_INITIAL_QUOTE_KEY`. Sourcing then counters or accepts via `ECN_NEGOTIATION_KEY`. When sourcing accepts (`approvedAt` written), the stage auto-advances to 4. The supplier portal shows Accept/Reject buttons after each sourcing counter-offer round.

---

### AS Stages 4–6 — Shared ECN localStorage Keys

Stages 4–6 reuse ECN localStorage keys:

| AS Stage | Equivalent ECN Stage | localStorage key used |
|---|---|---|
| 4 — R&D Testing | ECN Stage 4 | `ECN_PRICE_ESTIMATION_KEY` |
| 5 — DQA Testing | ECN Stage 5 | `ECN_DQA_TESTS_KEY` |
| 6 — R&D Head Approval | ECN Stage 6 | `ECN_HEAD_APPROVAL_KEY` |

Dispatch polling for AS runs at **stage 4** (not stage 3 like ECN) — because stage 3 is the price negotiation step. Both keys are cleared together when reverting.

---

### AS Stage 7 — Plant Evaluation & Testing

| | |
|---|---|
| **Actor** | R&D (`isRnd`) |
| **Gate** | `activeStage >= 7` |
| **Action** | R&D fills out a standard test grid (same as ECN Stage 7 pattern). Each test: pass/fail + notes. Clicks "Submit Plant Evaluation". Submission directly advances to stage 8. |
| **localStorage written** | `AS_PLANT_EVAL_KEY` → `{ results: TestResult[], submittedAt: number, submittedBy: string }` keyed by `npdId` |
| **Transition** | On submit: `stage → 8`. No polling needed. |
| **Sourcing card** | Read-only. "Awaiting R&D Plant Evaluation" → "Complete" after submission. |

---

### AS Stage 8 — AS Summary & Closure

Terminal stage. Informational summary of the full qualification lifecycle. No actions required.

---

## AS localStorage Keys

| Key constant | Stores |
|---|---|
| `AS_STAGE1_KEY` | `Record<npdId, {supplierName, reason, docsLink?, submittedAt, submittedBy}>` — AS Stage 1 sourcing request |
| `AS_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, note?}>` — AS Stage 2 R&D Head approval |
| `AS_PLANT_EVAL_KEY` | `Record<npdId, {results: TestResult[], submittedAt, submittedBy}>` — AS Stage 7 plant evaluation test results |
| `AS_PP_PRICING_KEY` | `Record<npdId, {currency, ppPrice, moq, leadTime, submittedBy, submittedAt}>` — **Unused** in AS Stage 7 (replaced by Plant Evaluation & Testing); still exported from `mockData.ts` |
| `AS_PP_SOURCING_APPROVED_KEY` | `Record<npdId, {approvedBy, approvedAt}>` — **Unused** in AS Stage 7 (replaced); still exported |
| `AS_PP_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, remarks?}>` — **Unused** in AS Stage 7 (replaced); still exported |

AS Stage 3 also uses `ECN_INITIAL_QUOTE_KEY` and `ECN_NEGOTIATION_KEY` (shared with ECN Stage 2).

## AS Role-to-Stage Access

| Stage | Who can act |
|-------|-------------|
| AS Stage 1 | Sourcing — fills supplier qualification request |
| AS Stage 2 | `rnd_head` / `super_admin` — approves request |
| AS Stage 3 | Supplier portal — submits initial quote; sourcing negotiates and approves |
| AS Stage 4 | `isRnd` — submits R&D test results |
| AS Stage 5 | `dqa_engineer`, `dqa_lead` — submits DQA results |
| AS Stage 6 | `rnd_head` / `super_admin` — approves combined R&D + DQA results |
| AS Stage 7 | `isRnd` — submits plant evaluation test grid, directly advances to stage 8. No sourcing action. |
| AS Stage 8 | None — informational summary |

## AS Wizard (step 2)

Left column has Product Line, Item Name, Manufacturing Location, Priority, TAT fields — **no commodity selection**. Right column has Drawing link, Remarks, and an Existing Part Number field. Starts at **stage 1**.
