## NCD Flow — Detailed Stage Reference

`typeOfWork === "New Component Development (NCD)"` or `"NPD"`. Multi-vendor flow through stages 2–6. NCD starts at **stage 2** (wizard skips stage 1). Supplier is not known at creation — determined at end of stage 6.

`isNCD = npd.typeOfWork === "NCD" || npd.typeOfWork === "NPD"` — **ECN is explicitly excluded from this group.**

**Multi-vendor flow (stages 2–6):**

Stage 2 (Sourcing): Sourcing signs off on the R&D request brief → selects multiple vendors → dispatches RFQ (NDA required only for non-NCD types, or if a new/requested vendor is selected). Stage 3: Each selected vendor gets a unique dispatch portal link; dispatch status tracked per vendor in `MULTI_DISPATCH_KEY`. Stage 4: R&D marks samples received per vendor (`VENDOR_SAMPLES_KEY`). Stage 5: R&D runs tests per vendor with a tab switcher; results saved to `VENDOR_TESTS_KEY`. Stage 6: R&D Head gives Accept/Reject verdict per vendor (`VENDOR_VERDICTS_KEY`); sourcing picks the final supplier ("Select as Supplier" button) which writes to `FINAL_VENDOR_KEY`, calls `updateNPD({ supplier: vendor })`, and triggers part number assignment. Stages 7–8 operate on the single selected winner.

**Sourcing gate:** Vendor selection and RFQ are locked behind `SOURCING_APPROVAL_KEY` — sourcing must sign off (and optionally request a TAT extension via `TAT_EXTENSION_REQ_KEY`, which R&D must approve) before vendors are visible.

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

## NDA Logic

NDA is **only required** when: the work type is not NCD (`isNCD = npd.typeOfWork === "New Component Development (NCD)"`) **or** a newly added (non-catalog) vendor is selected. For NCD with catalog vendors only, sourcing gets a direct "Dispatch Bulk Enquiry" button — no NDA step.

---

## NCD localStorage Keys

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
| `NCD_PP_PRICING_KEY` | `Record<npdId, {currency, pricePerUnit, moq, leadTime, submittedAt, submittedBy, supplier}>` — NCD PP pricing (stage 7) |
| `NPD_BUNDLE_KEY` | `Record<parentNpdId, string[]>` — maps parent bundle ID → list of child NCD IDs |

## NCD Role-to-Stage Access

| Stage | Who can act |
|-------|-------------|
| NCD Stage 2 | Sourcing — sign-off, vendor selection, RFQ dispatch |
| NCD Stage 3 | Supplier portal — dispatch confirmation |
| NCD Stage 4 | `isRnd` — marks samples received |
| NCD Stage 5 | `isRnd` — runs per-vendor tests |
| NCD Stage 6 | `rnd_head` / `super_admin` — verdicts. Sourcing — selects final supplier. |
| NCD Stage 7 | Sourcing — submits PP pricing |
| NCD Stage 8 | None — informational |

## NCD Wizard (step 2)

Left column — Product Line, Item Name, Commodity (auto-routes to SPOC; "Others" reveals custom input), Manufacturing Location, Priority, TAT Development + TAT Production (summed to `totalTat`). Right column — Drawing link, Drawing upload, Remarks, Sample Quantity, optional Revision Number with CPL sheet.
