# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Next.js version note:** This project uses Next.js **16** with React 19 (app router). Verify API signatures in `node_modules/next/dist/` before writing Next.js-specific code — training data may reflect older versions.

## Commands

```bash
npm run dev      # Start dev server on http://localhost:5001
npx tsc --noEmit # Type-check (use this, NOT npm run build)
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

### Route Groups

- **`(internal)/`** — Staff-facing app. Wrapped in `NPDProvider` + `LoginGate` (checks `localStorage.has_visited`). Renders `<Sidebar>` + `<TopNav>`.
  - `/dashboard/lead` — Lead dashboard (default landing after login)
  - `/dashboard/rnd` — R&D dashboard
  - `/npd/[id]` — NPD detail/workflow page (4300+ lines; drives all stage progression)
  - `/npd/new` — Multi-step NPD creation wizard
  - `/pipeline`, `/approvals`, `/archive`, `/mdm`, `/report/[id]`, `/report/all`, `/settings`
- **`(public)/`** — Supplier-facing portal (no auth).
- **`/supplier/*`** — Supplier pages outside the public group: `/quote/[id]`, `/nda/[id]`, `/dispatch/[id]`, `/status/[id]`, `/plant-delivery/[id]`, `/update/[id]`, `/ecn-sourcing/[id]` (ECN supplier sample dispatch portal).
- **`/login`** — Sets `localStorage.has_visited` and redirects into `(internal)/`.

### Data Layer

**No backend.** All persistence is `localStorage` + in-memory React state.

- `src/lib/mockData.ts` — Single source of truth: all types, seed data (`mockNPDs`), `VENDOR_CATALOG`, stage definitions, every `localStorage` key constant, and helpers (`getStageName`, `getTestsByCategory`). **Always add new localStorage keys here, never inline.**
- `src/lib/npdContext.tsx` — `NPDProvider` / `useNPDs` hook (`addNPD`, `updateNPD`). Reads/writes NPD records under key `npd_records_v1`. Only core `NPDRecord` fields go here.
- Supplier-portal interactions each have their own key in `mockData.ts`.

### NPD Lifecycle & Stage Flow

Each `NPDRecord` has `stage: number` and `tatHealth: "green" | "amber" | "red" | "black"`. Stage sequences differ by `typeOfWork`:

- **NCD (default):** 9 stages — Request Initialisation → Supplier Sourcing → Supplier Dispatch → Design & Feasibility → RND Testing & TQR → DQA Testing → RND Approval → PP Pricing → NPD Summary & Closure. Starts at **stage 2** (wizard skips stage 1).
- **ECN:** 8 stages — ECN Request Initialisation → R&D Review & Approval → Supplier Sample Dispatch → R&D Testing → DQA Testing → R&D Head Approval → PP Pricing → ECN Summary & Closure. Starts at **stage 1**. Single fixed supplier set at creation — no multi-vendor flow.
- **Alternative Supplier (AS):** 8 stages — Sourcing Request Initiation → R&D Review & Approval → Price Negotiation → R&D Testing → DQA Testing → R&D Head Approval → PP Pricing → AS Summary & Closure. Starts at **stage 1**. Single supplier proposed at stage 1. Reuses ECN localStorage keys for stages 4–6. No commodity selection in wizard. **Visibility-restricted:** only the requester (`raisedBy`), R&D roles, and DQA roles can view AS records.
- **Compliance / Regulatory:** 6 stages. Starts at stage 3.

**Multi-vendor flow (stages 2–6):**

Stage 2 (Sourcing): Sourcing signs off on the R&D request brief → selects multiple vendors → dispatches RFQ (NDA required only for non-NCD types, or if a new/requested vendor is selected). Stage 3: Each selected vendor gets a unique dispatch portal link; dispatch status tracked per vendor in `MULTI_DISPATCH_KEY`. Stage 4: R&D marks samples received per vendor (`VENDOR_SAMPLES_KEY`). Stage 5: R&D runs tests per vendor with a tab switcher; results saved to `VENDOR_TESTS_KEY`. Stage 6: R&D Head gives Accept/Reject verdict per vendor (`VENDOR_VERDICTS_KEY`); sourcing picks the final supplier ("Select as Supplier" button) which writes to `FINAL_VENDOR_KEY`, calls `updateNPD({ supplier: vendor })`, and triggers part number assignment. Stages 7–8 operate on the single selected winner.

**Sourcing gate:** Vendor selection and RFQ are locked behind `SOURCING_APPROVAL_KEY` — sourcing must sign off (and optionally request a TAT extension via `TAT_EXTENSION_REQ_KEY`, which R&D must approve) before vendors are visible.

---

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

### ECN Stage 7 — PP Pricing & R&D Approval

Two separate sub-flows happen at this stage: sourcing submits the PP price, then R&D Head confirms plant testing is complete.

| | |
|---|---|
| **Actor** | Sourcing (price submission) + R&D Head (final approval) |
| **Gate** | `activeStage >= 6` (card visible from stage 6 as "Upcoming") |
| **Sourcing action** | Sourcing submits PP pricing: one price field (currency select + price/unit), MOQ (units), lead time (days). Optionally starts a multi-round PP price negotiation with the supplier before final submission. |
| **localStorage written (sourcing)** | `ECN_PP_PRICING_KEY` → `{ currency, pricePerUnit, moq, leadTime, submittedAt, submittedBy }` keyed by `npdId` |
| **PP price negotiation** | Sourcing can send a PP target price to the supplier via `ECN_PP_NEGOTIATION_KEY` → `NegotiationRecord` (same shape as Stage 2). Supplier responds via the ECN portal. `negInFlight = negotiation exists && negotiation not accepted` gates the submission form: when a negotiation round is in-flight, the submission form is hidden; only the negotiation widget shows. When no negotiation or negotiation accepted, submission form is shown first (primary). |
| **Supplier portal** | Same `/supplier/ecn-sourcing/[id]` page. When `activeStage >= 7` and `ECN_PP_NEGOTIATION_KEY[npdId]` exists, the portal shows a PP price negotiation widget (target price + counter-offer input). Stage 2 negotiation and Stage 7 PP negotiation are keyed separately. |
| **R&D Head approval** | After sourcing submits PP pricing (`ECN_PP_PRICING_KEY` exists), an orange "Confirm Plant Testing Complete" action box appears for `canApprove` users (R&D Head / super_admin). R&D Head adds optional remarks and clicks "Approve & Close to Stage 8". |
| **localStorage written (R&D)** | `ECN_PP_RND_APPROVAL_KEY` → `{ approvedBy, approvedAt, remarks? }` keyed by `npdId` |
| **Transition** | On R&D Head approval: `stage → 8`, `stageName → getStageName(8, typeOfWork)`, `setActiveStage(8)`. **Sourcing submit does NOT advance the stage** — only R&D Head approval does. |
| **Polling** | A `useEffect` (when `isECN && activeStage === 7`) polls both `ECN_PP_NEGOTIATION_KEY` and `ECN_PP_RND_APPROVAL_KEY` every 3s. On detecting the R&D approval record, it advances the stage automatically. |
| **Sourcing card badges** | "Upcoming" (stage < 7) → "Action Required" (stage 7, not submitted) → "Awaiting R&D Approval" (submitted, pending) → "Approved" (R&D approved) |
| **R&D card badges** | "Upcoming" (stage < 7) → "Awaiting Sourcing" (stage 7, PP pricing not submitted) → "Action Required" (PP submitted, awaiting R&D Head) → done strip (approved) |

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

### AS Stages 4–6

Stages 4–6 reuse ECN localStorage keys:

| AS Stage | Equivalent ECN Stage | localStorage key used |
|---|---|---|
| 4 — R&D Testing | ECN Stage 4 | `ECN_PRICE_ESTIMATION_KEY` |
| 5 — DQA Testing | ECN Stage 5 | `ECN_DQA_TESTS_KEY` |
| 6 — R&D Head Approval | ECN Stage 6 | `ECN_HEAD_APPROVAL_KEY` |

Dispatch polling for AS runs at **stage 4** (not stage 3 like ECN) — because stage 3 is the price negotiation step. Both keys are cleared together when reverting.

### AS Stage 7 — PP Pricing

| | |
|---|---|
| **Actor** | Sourcing (two-step: submit then approve); R&D Head (final approval) |
| **Gate** | `activeStage >= 7` |
| **Step 1 (sourcing)** | Sourcing fills currency/price/MOQ/lead-time form → "Submit PP Pricing" saves to `AS_PP_PRICING_KEY` |
| **Step 2 (sourcing)** | "Approve & Send to R&D" button appears → writes `AS_PP_SOURCING_APPROVED_KEY` |
| **R&D Head action** | After sourcing approves, R&D Head sees the pricing + "Approve PP Pricing" action → writes `AS_PP_RND_APPROVAL_KEY` → `stage → 8` |
| **Polling** | Stage 7 polls all three keys every 3s for cross-tab sync |

### AS Stage 8 — AS Summary & Closure

Terminal stage. Informational summary of the full qualification lifecycle. No actions required.

---

## NCD Flow — Detailed Stage Reference

`typeOfWork === "New Component Development (NCD)"` or `"NPD"`. Multi-vendor flow through stages 2–6. NCD starts at **stage 2** (wizard skips stage 1). Supplier is not known at creation — determined at end of stage 6.

`isNCD = npd.typeOfWork === "NCD" || npd.typeOfWork === "NPD"` — **ECN is explicitly excluded from this group.**

---

### NCD Stage 1 — (Not used)

NCD records skip stage 1. Wizard sets `stage: 2` on creation for NCD/NPD types.

---

### NCD Stage 2 — Supplier Sourcing

| | |
|---|---|
| **Actor** | Sourcing SPOC (`isSpocOrSourcing`) |
| **Gate** | `activeStage >= 2` |
| **Step 1: Sourcing sign-off** | Sourcing reviews the R&D brief. Optionally requests a TAT extension (`TAT_EXTENSION_REQ_KEY` → `{ days, reason, requestedAt }`). R&D must approve/reject the TAT extension (`TAT_EXTENSION_REQ_KEY.decision`). Sourcing then clicks "Sign Off on Brief" — writes `SOURCING_APPROVAL_KEY` → `{ approved: true, approvedBy, approvedAt, note? }`. This unlocks vendor selection. |
| **Step 2: Vendor selection** | Sourcing sees `VENDOR_CATALOG` grouped by commodity. Can select multiple vendors. "Add New Vendor" button adds a custom entry to `REQUESTED_VENDORS_KEY`. Non-catalog vendors require NDA (see NDA Logic). |
| **Step 3: NDA** | For non-NCD types or non-catalog vendors: NDA portal link is shared, supplier signs via `/supplier/nda/[id]?vendor=X`. `NDA_STATUS_KEY` tracks signed status per vendor. Catalog-only NCD: skip NDA, direct "Dispatch Bulk Enquiry". |
| **Step 4: RFQ dispatch** | Sourcing clicks "Dispatch Bulk Enquiry" → writes `ENQUIRY_SENT_KEY` → `{ [npdId]: vendorName[] }` and `LIVE_QUOTATIONS_KEY` seeds empty records. |
| **Transition** | After RFQ dispatch: `stage → 3`. |

---

### NCD Stage 3 — Supplier Dispatch

| | |
|---|---|
| **Actor** | Each selected supplier (via portal) |
| **Gate** | `activeStage >= 3` |
| **Action** | Each selected vendor gets a unique link `/supplier/dispatch/[id]?vendor=VendorName`. They upload proof of dispatch and set ETA. |
| **localStorage written (supplier)** | `MULTI_DISPATCH_KEY` → `{ [npdId]: { [vendorName]: { dispatchDate, docs, submittedAt } } }`. Also writes legacy `supplier_dispatch_submitted_v1` for backward compat. |
| **Transition** | Sourcing manually marks "All samples dispatched" or R&D proceeds when dispatch records exist. `stage → 4`. |
| **UI** | Internal page shows per-vendor dispatch status table (dispatched / awaiting). Each vendor row has a copy-link button. |

---

### NCD Stage 4 — Design & Feasibility (Samples Received)

| | |
|---|---|
| **Actor** | R&D engineer (`isRnd`) |
| **Gate** | `activeStage >= 4` |
| **Action** | R&D marks each vendor's samples as received (`VENDOR_SAMPLES_KEY` → `{ [npdId]: { [vendorName]: boolean } }`). Also reviews quotations from suppliers (stored in `LIVE_QUOTATIONS_KEY`). |
| **Transition** | When all samples received (or R&D proceeds): `stage → 5`. |
| **UI** | Vendor tab switcher. Per-vendor: "Mark as Received" toggle, quotation details panel. |

---

### NCD Stage 5 — RND Testing & TQR

| | |
|---|---|
| **Actor** | R&D engineer (`isRnd`) |
| **Gate** | `activeStage >= 5` |
| **Action** | R&D runs tests for each vendor independently. Test categories from `getTestsByCategory()` in mockData. Each test: pass/fail + notes. Submits per-vendor results. |
| **localStorage written** | `VENDOR_TESTS_KEY` → `{ [npdId]: { [vendorName]: { results, status: "pass"\|"fail"\|"partial", submittedAt } } }` |
| **Transition** | When all selected vendors have test results submitted: `stage → 6`. |
| **UI** | Vendor tab switcher at top of R&D card. Each tab shows that vendor's test grid. Submit locks results for that vendor. |

---

### NCD Stage 6 — RND Approval (Vendor Verdict + Supplier Selection)

| | |
|---|---|
| **Actor** | R&D Head (`rnd_head` / `super_admin`) for verdicts; Sourcing for final supplier selection |
| **Gate** | `activeStage >= 6` |
| **R&D Head action** | Reviews per-vendor test results. Gives Accept/Reject verdict per vendor with remarks. |
| **localStorage written (R&D)** | `VENDOR_VERDICTS_KEY` → `{ [npdId]: { [vendorName]: { verdict: "accept"\|"reject", remarks, at } } }` |
| **Sourcing action** | After R&D verdicts are in, sourcing sees "Select as Supplier" button next to each accepted vendor. Clicking selects the winner. |
| **localStorage written (sourcing)** | `FINAL_VENDOR_KEY` → `{ [npdId]: vendorName }`. Calls `updateNPD(npdId, { supplier: vendorName })`. Triggers part number assignment display. |
| **Transition** | On supplier selection: `stage → 7`. |
| **UI** | Vendor tab switcher. Per-vendor: test summary, verdict badges, R&D Head action box (if `canApprove`). Sourcing view shows all verdicts and "Select as Supplier" button for each accepted vendor. |

---

### NCD Stage 7 — PP Pricing

| | |
|---|---|
| **Actor** | Sourcing SPOC |
| **Gate** | `activeStage >= 7` |
| **Action** | Sourcing submits pre-production pricing for the selected supplier. Form: currency, price/unit, MOQ, lead time. |
| **localStorage written** | `NCD_PP_PRICING_KEY` → `{ currency, pricePerUnit, moq, leadTime, submittedAt, submittedBy, supplier }` keyed by `npdId` |
| **Transition** | On submit: `stage → 8`. NCD does not have an R&D Head PP approval gate (unlike ECN). |
| **UI** | Sourcing card with PP pricing form. After submit: pricing summary strip. R&D card shows pricing summary read-only. |

---

### NCD Stage 8 — NPD Summary & Closure

| | |
|---|---|
| **Actor** | No action — informational |
| **Gate** | `activeStage >= 8` |
| **Content** | Full NPD summary: selected supplier, part number, all stage timestamps, PP pricing, test results overview, TAT health. |
| **Transition** | Terminal stage. |

---

## Role-to-Stage Access Matrix

| Stage | ECN / NCD | Who can act |
|-------|-----------|-------------|
| ECN Stage 1 | ECN | `isRnd` (any R&D role) — submits ECN request |
| ECN Stage 2 | ECN | `rnd_head` / `super_admin` — approves. Sourcing — negotiates price. |
| ECN Stage 3 | ECN | Supplier portal — dispatches samples |
| ECN Stage 4 | ECN | `isRnd` — submits R&D test results |
| ECN Stage 5 | ECN | `dqa_engineer`, `dqa_lead` — submits DQA results |
| ECN Stage 6 | ECN | `rnd_head` / `super_admin` — approve/reject |
| ECN Stage 7 | ECN | Sourcing — submits PP price. `rnd_head` / `super_admin` — confirms plant testing, gates stage 8. |
| ECN Stage 8 | ECN | None — informational |
| NCD Stage 2 | NCD | Sourcing — sign-off, vendor selection, RFQ dispatch |
| NCD Stage 3 | NCD | Supplier portal — dispatch confirmation |
| NCD Stage 4 | NCD | `isRnd` — marks samples received |
| NCD Stage 5 | NCD | `isRnd` — runs per-vendor tests |
| NCD Stage 6 | NCD | `rnd_head` / `super_admin` — verdicts. Sourcing — selects final supplier. |
| NCD Stage 7 | NCD | Sourcing — submits PP pricing |
| NCD Stage 8 | NCD | None — informational |
| AS Stage 1 | AS | Sourcing — fills supplier qualification request |
| AS Stage 2 | AS | `rnd_head` / `super_admin` — approves request |
| AS Stage 3 | AS | Supplier portal — submits initial quote; sourcing negotiates and approves |
| AS Stage 4 | AS | `isRnd` — submits R&D test results |
| AS Stage 5 | AS | `dqa_engineer`, `dqa_lead` — submits DQA results |
| AS Stage 6 | AS | `rnd_head` / `super_admin` — approves combined R&D + DQA results |
| AS Stage 7 | AS | Sourcing — submits + approves PP pricing. `rnd_head` / `super_admin` — final approval, gates stage 8. |
| AS Stage 8 | AS | None — informational summary |

`canApprove` throughout the codebase = `currentRole === "rnd_head" || currentRole === "super_admin"`

---

## Price Negotiation Flow

Used in ECN Stage 2 (`ECN_NEGOTIATION_KEY`), ECN Stage 7 (`ECN_PP_NEGOTIATION_KEY`), and AS Stage 3 (`ECN_NEGOTIATION_KEY` — shared key). All use the identical `NegotiationRecord` shape.

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

**AS Stage 3 difference (supplier initiates):** Supplier submits their price first via `ECN_INITIAL_QUOTE_KEY`. Sourcing then counters or accepts via `ECN_NEGOTIATION_KEY`. When sourcing accepts (`approvedAt` written), the stage auto-advances to 4. The supplier portal shows Accept/Reject buttons after each sourcing counter-offer round.

**`negInFlight` gate (Stage 7 sourcing card):** `const negInFlight = ecnPpNegotiation && ecnPpNegotiation.status === "pending"`. When true: hides submission form, shows only negotiation widget. When false: shows submission form first (primary), negotiation section below (secondary).

---

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

---

## NPD Bundle Flow

`typeOfWork === "New Product Development (NPD)"`. A bundle is a parent record containing multiple parallel NCD sub-requests. The parent is created with `isBundle: true`; each child is a full `NPDRecord` with `parentId` set to the parent ID. All child records follow the standard NCD 9-stage workflow independently.

**Child ID format:** `${parentId}-NCD-01`, `${parentId}-NCD-02`, etc.

**Bundle map:** `NPD_BUNDLE_KEY` → `Record<parentId, string[]>` (child IDs). Written at creation, read in list views and the detail page.

**Creation wizard (step 2 for NPD type):**
- **Shared fields** (top section): Product Line, Manufacturing Location, Priority, TAT Development + TAT Production, Raised By, Remarks — applied to all children identically.
- **Item grid**: expandable row per NCD sub-request (min 1, max 5). Each row: Item Name, Commodity (auto-shows SPOC via `SPOC_NAME_MAP`), Drawing Link, Sample Qty, Revision No., per-item Remarks. Toggle arrow expands full fields; collapsed shows name + commodity only.
- On submit: parent record created with `isBundle: true, stage: 2`; N child records created with `typeOfWork: "NCD"`, commodity-routed `spoc`, `parentId`, `bundleItemName`.

**`SPOC_NAME_MAP`** (in `npd/new/page.tsx`): maps commodity → SPOC name. Plastics → Rahul Sharma, Sheet Metal → Karan Mehta, Electronics & Electrical → Priya Rajan, Compressors & Motors → Amit Kumar, Packaging & Others → Varun Joshi, Others → Rohan Desai.

**List view behavior (archive, dashboard, report/all):**
- Child records (`n.parentId != null`) are **always filtered out** — never shown directly.
- Parent row shows "NPD Bundle" type label, `X/N complete` progress bar (based on children at stage 8), and "Multiple" in the supplier column.
- SPOC filter for bundles: a SPOC sees the parent if any child has `spoc === currentRole`.

**Bundle detail page (`/npd/[id]` when `npd.isBundle`):** Renders a bundle overview instead of the stage workflow — header card with donut progress ring, sub-request grid (one row per child: TAT health dot, child ID, item name, commodity, SPOC, current stage name, "Open →" link). SPOC-scoped dimming: rows for other SPOCs are `opacity-40` with no "Open" link. Completion banner shown when all children reach stage 8.

**Child page back-link:** Child NCD pages show a "← Back to NPD Bundle {parentId}" link at the top when `npd.parentId` is set.

**Phase 5 (completion rollup) — not yet implemented:** When a child advances to stage 8, check if all siblings are at stage 8 and update the parent `stage` to 8.

---

### Key Types (`src/lib/mockData.ts`)

**`NPDRecord`** — core fields include `typeOfWork`, `stage`, `tatHealth`, `tatDaysRemaining`, `totalTat`, `spoc`, `supplier` (the locked final vendor), `priority`. Optional: `manufacturingLocation`, `remarks`, `tatDevelopment`, `tatProduction`. ECN-only optional fields: `ecnPartNumber`, `ecnPartName`, `ecnChangeDescription`. Bundle fields: `isBundle?: boolean` (true on parent), `parentId?: string` (set on children), `bundleItemName?: string` (per-child item name shown in bundle grid).

**`VendorRecord`** — `tier: "Tier 1" | "Tier 2" | "Tier 3" | "New"`, `status: "verified" | "audit_overdue" | "new"`, optional `isRequested?: boolean` (set on vendors added via the "Add New Vendor" form, not in the catalog).

### localStorage Key Reference

All keys exported from `mockData.ts`. Grouping by concern:

| Key constant | Stores |
|---|---|
| `ENQUIRY_SENT_KEY` | `Record<npdId, vendorName[]>` — which vendors received RFQ |
| `NDA_STATUS_KEY` | `Record<npdId, Record<vendorName, {signed, signedBy, signedAt}>>` |
| `LIVE_QUOTATIONS_KEY` | `Record<npdId, Record<vendorName, LiveQuotation>>` — feasibility + quote |
| `MULTI_DISPATCH_KEY` | `Record<npdId, Record<vendorName, {dispatchDate, docs, submittedAt}>>` |
| `VENDOR_SAMPLES_KEY` | `Record<npdId, Record<vendorName, boolean>>` — samples received flag |
| `VENDOR_TESTS_KEY` | `Record<npdId, Record<vendorName, {results, status, submittedAt}>>` |
| `VENDOR_VERDICTS_KEY` | `Record<npdId, Record<vendorName, {verdict, remarks, at}>>` |
| `FINAL_VENDOR_KEY` | `Record<npdId, string>` — the selected supplier after stage 6 |
| `SOURCING_APPROVAL_KEY` | `Record<npdId, {approved, approvedBy, approvedAt, note?}>` |
| `TAT_EXTENSION_REQ_KEY` | `Record<npdId, {days, reason, requestedAt, decision?, decidedAt?}>` |
| `REQUESTED_VENDORS_KEY` | `Record<npdId, {name, contact, email, phone}[]>` — new vendors not in catalog |
| `RND_EVAL_KEY` | `Record<npdId, {results, submittedAt, startedAt}>` — R&D test results (legacy single-vendor) |
| `PLANT_ACCEPTANCE_KEY` | `Record<npdId, {docName, acceptedAt, verdict?, remarks?}>` |
| `DQA_TESTS_KEY` | `Record<npdId, {results, submittedAt}>` — DQA test results (NCD flow) |
| `ECN_STAGE1_KEY` | `Record<npdId, {submittedAt, submittedBy}>` — ECN stage 1 submission |
| `ECN_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, note?}>` — ECN R&D Head approval at stage 2 |
| `ECN_SOURCING_DISPATCH_KEY` | `Record<npdId, {dispatchDate, docs, submittedAt}>` — ECN stage 3 supplier sample dispatch |
| `ECN_PRICE_ESTIMATION_KEY` | `Record<npdId, {...}>` — ECN price estimation data |
| `ECN_DQA_TESTS_KEY` | `Record<npdId, {results, submittedAt}>` — ECN DQA test results (stage 5) |
| `ECN_HEAD_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, note?}>` — ECN R&D Head final approval |
| `ECN_PP_PRICING_KEY` | `Record<npdId, {currency, pricePerUnit, moq, leadTime, submittedAt, submittedBy}>` — ECN PP pricing (stage 7, sourcing submission) |
| `ECN_PP_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, remarks?}>` — ECN Stage 7 R&D Head confirmation that plant testing is complete; gates stage 8 |
| `NCD_PP_PRICING_KEY` | `Record<npdId, {currency, pricePerUnit, moq, leadTime, submittedAt, submittedBy, supplier}>` — NCD PP pricing (stage 7) |
| `ECN_INITIAL_QUOTE_KEY` | `Record<npdId, {price, currency, submittedAt}>` — supplier's initial price quote (ECN Stage 2 + AS Stage 3) |
| `ECN_NEGOTIATION_KEY` | `Record<npdId, NegotiationRecord>` — ECN Stage 2 and AS Stage 3 multi-round negotiation (shared key) |
| `ECN_PP_NEGOTIATION_KEY` | `Record<npdId, NegotiationRecord>` — ECN Stage 7 PP pricing multi-round negotiation |
| `AS_STAGE1_KEY` | `Record<npdId, {supplierName, reason, docsLink?, submittedAt, submittedBy}>` — AS Stage 1 sourcing request |
| `AS_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, note?}>` — AS Stage 2 R&D Head approval |
| `AS_PP_PRICING_KEY` | `Record<npdId, {currency, ppPrice, moq, leadTime, submittedBy, submittedAt}>` — AS Stage 7 PP pricing submission |
| `AS_PP_SOURCING_APPROVED_KEY` | `Record<npdId, {approvedBy, approvedAt}>` — AS Stage 7 sourcing explicit approval (step 2; gates R&D action) |
| `AS_PP_RND_APPROVAL_KEY` | `Record<npdId, {approvedBy, approvedAt, remarks?}>` — AS Stage 7 R&D Head final approval; gates stage 8 |
| `AICM_FETCH_KEY` | `Record<npdId, {...}>` — AICM data fetch cache |
| `NPD_BUNDLE_KEY` | `Record<parentNpdId, string[]>` — maps parent bundle ID → list of child NCD IDs |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/mockData.ts` | All types, seed data, constants, localStorage keys, `getBundleChildren(parentId, npds)` helper |
| `src/lib/npdContext.tsx` | Global NPD state (Context + localStorage) |
| `src/lib/reportGenerator.ts` | Excel MIS export via ExcelJS (`@ts-nocheck` due to type conflicts) |
| `src/app/(internal)/npd/[id]/page.tsx` | Main NPD detail/workflow page — all stage logic (~7900 lines) |
| `src/app/(internal)/npd/new/page.tsx` | Multi-step NPD creation wizard |
| `src/app/supplier/dispatch/[id]/page.tsx` | Supplier dispatch portal — writes to both `SUPPLIER_DISPATCH_KEY` (legacy) and `MULTI_DISPATCH_KEY` |
| `src/components/LoginGate.tsx` | Auth gate — checks `localStorage.has_visited`; wraps `(internal)` layout |
| `src/components/Sidebar.tsx` | Left nav rendered in `(internal)` layout |
| `src/components/TopNav.tsx` | Top bar with breadcrumbs/actions in `(internal)` layout |
| `src/components/Tour.tsx` | Onboarding tour overlay |
| `src/lib/utils.ts` | Tailwind `cn()` helper (clsx + twMerge) |
| `src/components/ui/` | shadcn/ui components — do not hand-edit; use `npx shadcn add` |
| `src/components/PerfPatch.tsx` | Patches `performance.measure` to suppress React 19 profiling noise; rendered in root layout |

### UI Stack

- **Tailwind CSS v4** (PostCSS plugin — no `tailwind.config.js`)
- **shadcn/ui** — components in `src/components/ui/`; config in `components.json`
- **@base-ui/react** — lower-level headless primitives (used alongside shadcn/ui)
- **Recharts** — wrap in a fixed-pixel-height `<div>` to suppress console warnings
- **lucide-react** for icons
- **react-joyride** — powers the `<Tour>` onboarding overlay

### NPD Creation Wizard (`/npd/new`)

Step 1 selects work type (NCD, NPD, ECN, NTD, Compliance, Alternative Supplier). Step 2 layout differs by type:

- **NPD (bundle):** Shared fields section (Product Line, Manufacturing Location, Priority, TAT Dev + TAT Production, Raised By, Remarks) + expandable item grid (1–5 rows, each row = one NCD sub-request). See NPD Bundle Flow section for full details.
- **ECN**: dedicated two-column form — left "Part Details" (Part Number, Part Name, Existing Supplier from `VENDOR_CATALOG`, Manufacturing Plant, Priority) + right "Change Parameters" (TAT as a single field, Drawing/Spec Sheet Link, Remarks). ECN starts at **stage 1**; `totalTat` is set directly from the single TAT field; `supplier` is set at creation.
- **NCD**: left column — Product Line, Item Name, Commodity (auto-routes to SPOC; "Others" reveals custom input), Manufacturing Location, Priority, TAT Development + TAT Production (summed to `totalTat`). Right column — Drawing link, Drawing upload, Remarks, Sample Quantity, optional Revision Number with CPL sheet.
- **Alt Supplier**: left column has Product Line, Item Name, Manufacturing Location, Priority, TAT fields — **no commodity selection**. Right column has Drawing link, Remarks, and an Existing Part Number field. Starts at **stage 1**.
- **Compliance/NTD/Cost Innovation**: similar left column plus type-specific right column fields. Compliance starts at stage 3; NTD and Cost Innovation start at stage 2.

Step 3 shows a review summary (tiles differ per type) and an email preview.

### Role System

Roles are stored in `localStorage("poc_role")` and broadcast via `CustomEvent("rolechange")`. Role groups used throughout `npd/[id]/page.tsx`:

- `isRnd` — `currentRole.startsWith("rnd") || currentRole === "super_admin"`. Gates the entire R&D section card. **DQA roles do not satisfy `isRnd`.**
- `isECN` — `npd.typeOfWork === "Engineering Change Notice (ECN)"`. Use this to branch ECN-specific UI; never include ECN in `isNCD`.
- `isNCD` — `typeOfWork === "NCD" || typeOfWork === "NPD"`. ECN is explicitly excluded.
- DQA roles (`dqa_engineer`, `dqa_lead`) have read access to NPD records and write access to DQA testing cards. They **cannot** create new requests (sidebar nav entry excluded).
- The ECN DQA Testing card (stage 5) is rendered **outside** the `{isRnd && (...)}` block so DQA roles can access it. `canEdit` inside the block enforces who can write.

### NDA Logic

NDA is **only required** when: the work type is not NCD (`isNCD = npd.typeOfWork === "New Component Development (NCD)"`) **or** a newly added (non-catalog) vendor is selected. For NCD with catalog vendors only, sourcing gets a direct "Dispatch Bulk Enquiry" button — no NDA step.
