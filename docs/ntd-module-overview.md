# NTD Module — New Tool Development
## Amber Enterprises Pvt. Ltd. | Genessence NPD Platform

---

## What is NTD?

The **New Tool Development (NTD)** module manages the end-to-end lifecycle of manufacturing tool development at Amber Enterprises — from the initial R&D brief through vendor selection, design reviews, manufacturing, trials, and final commissioning.

**Core problem solved:** Design reviews and approvals previously happened over email with no version tracking, audit trail, or accountability. NTD brings all of it into one structured workflow.

**Trigger:** `typeOfWork === "New Tool Development (NTD)"`
**SPOC:** Always hardcoded to **Rohan Desai**
**Stages:** 11

---

## Roles & Responsibilities

| Role | What they do |
|------|-------------|
| **R&D** (`rnd`) | Creates NTD, reviews designs, tests components, handles DFM & mould review |
| **Sourcing** | Prepares RFQ spec, dispatches RFQs, selects supplier, manages manufacturing & PO |
| **R&D Head** (`rnd_head`) | Final sign-off at Stage 11 |
| **Sourcing Head** (`sourcing_head`) | Final sign-off at Stage 11 |
| **EXIM** | Stage 11 clearance only |
| **Supplier** | Portal access at `/supplier/ntd/[ntdId]` for Stages 6–11 |
| **Vendor** | Open URL `/rfq/ntd/[ntdId]/[token]` for quotation & negotiation at Stage 4 |

---

## 11-Stage Workflow

```
Stage 1  ──►  Stage 2  ──►  Stage 3  ──►  Stage 4  ──►  Stage 5
Initiation    RFQ Spec      RFQ Dispatch  Quotations    Supplier
(R&D)         (Dual: S+R)   (Sourcing)    (S ↔ Vendor)  Selection

    ──►  Stage 6  ──►  Stage 7  ──►  Stage 8  ──►  Stage 9
         Design        DFM Loop      Mould Design  Manufacturing
         Handoff       (per-comp)    + MFA Loop    (Supplier)
         (R&D → Supp)  R&D reviews   R&D + Sourcing

    ──►  Stage 10  ──►  Stage 11
         Trials         Commissioning
         (unbounded)    & Dispatch
```

---

## Stage-by-Stage Reference

### Stage 1 — Tool Initiation
**Who:** R&D  
R&D creates the NTD record with a title, notes, and part spec documents (Drive links). Submitting immediately advances to Stage 2 — no approval gate.

---

### Stage 2 — RFQ Spec Sheet
**Who:** Sourcing (fills) + R&D (validates) — **dual sign-off required**  
Sourcing prepares the RFQ spec sheet and adds a vendor comparison table. Both Sourcing and R&D must independently sign off before Stage 3 unlocks.

---

### Stage 3 — RFQ Dispatch
**Who:** Sourcing  
Sourcing selects vendors from the catalog (or adds custom vendors — auto-triggers NDA requirement). Each vendor gets a unique open URL token. At least one RFQ sent → advances to Stage 4.

---

### Stage 4 — Quotation & Negotiations
**Who:** Sourcing (internal) ↔ Vendor (open URL)  
Two-sided threaded negotiation per vendor. Vendors submit quotations (amount, currency, lead time, doc link). Sourcing can counter-offer. Status tracks through `sent → quotation_received → negotiating → finalized`. At least one `finalized` vendor → Stage 5.

---

### Stage 5 — Supplier Selection
**Who:** Sourcing selects → R&D acknowledges  
Sourcing picks the winning vendor from finalized quotations. R&D must separately acknowledge the selection. Both actions required before Stage 6.

---

### Stage 6 — Final Design Handoff
**Who:** R&D uploads → Supplier acknowledges  
R&D defines the **immutable component list** (C01, C02…) and uploads final design files. Supplier confirms receipt via their portal. Component list cannot be changed after this point.

---

### Stage 7 — DFM Loop *(per-component)*
**Who:** Supplier submits → R&D reviews  
Each component goes through a review loop:

```
pending → supplier submits PPT + 3D link → under_review
       → R&D approves all files → approved (LOCKED FOREVER)
       → R&D adds revision comment → revision_required
       → supplier uploads new version → under_review → ...
```

All components must reach `approved` before Stage 8. **DFM is never revisited** — not even after trial failures.

---

### Stage 8 — Mould Design + MFA Loop *(per-component)*
**Who:** Supplier submits → **R&D + Sourcing dual review**  
Same loop as Stage 7 but requires **both** R&D and Sourcing to approve each component. 24-hour SLA tracked per component under review.

**Sub-stages:**
- **8A:** Per-component approval loop (mould 3D + MFA report per component)
- **8B:** Joint review session after all 8A approvals — supplier must upload final confirmed files within 24 hours

On trial failure (Stage 10), **only failed components** re-enter 8A. Passed components stay permanently locked.

---

### Stage 9 — Manufacturing
**Who:** Supplier updates → Sourcing monitors + confirms  
Supplier confirms manufacturing start + ETA, posts periodic status updates. Sourcing marks manufacturing complete when done → Stage 10.

---

### Stage 10 — Trials *(unbounded)*
**Who:** Sourcing initiates → R&D tests → cycle repeats on failure  
Sourcing initiates trial batches (T1, T2, T3…). Per trial, supplier dispatches samples, R&D marks receipt, then tests 7 parameters per component:

| Test Parameter | Details |
|---------------|---------|
| Dimensional Accuracy | actual vs spec |
| Surface Finish | Ra value + visual grade |
| Material Hardness | reading + unit (HRC/HB) |
| Cavity Fill & Flash | notes |
| Ejection & Parting Line | defect description |
| Tooling Fit & Assembly | notes |
| Cycle Time | actual vs target seconds |

- **All pass** → advance to Stage 11
- **Partial fail** → failed components re-enter Stage 8A (mould only, not DFM). New trial cannot start until redesign loop completes.

---

### Stage 11 — Commissioning & Dispatch
**Who:** Sequential sub-steps across Supplier, Sourcing, EXIM, R&D Head + Sourcing Head

| Sub-step | Actor | Action |
|----------|-------|--------|
| 1 | Supplier | Final Inspection Report upload |
| 2 | Sourcing | Commissioning checklist + pack list + invoice |
| 3 | Sourcing | EXIM docs + shipment mode + tracking ID |
| 4 | EXIM | Status updates + "Mark EXIM Cleared" |
| 5 | Sourcing | Confirm tool arrival at Gurugram plant |
| 6 | R&D Head + Sourcing Head | **Dual final sign-off** → NTD complete |

---

## Key Design Principles

- **VersionedFile everywhere** — all file slots store full version history. Old versions are never deleted.
- **Append-only activity log** — every action is logged to `ntd_activity_{id}`. Never modified.
- **Component immutability** — the component list defined in Stage 6 is frozen forever.
- **Selective re-entry** — trial failures only unlock failed components in Stage 8A; DFM (Stage 7) is never reopened.
- **Dual sign-offs** — Stages 2, 5, 8 (per-component), and 11 all require two independent approvals.
- **No trial cap** — trials are unbounded; T1, T2, T3… until all components pass.

---

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/ntd` | Internal | NTD list view |
| `/ntd/new` | R&D only | Create NTD (Stage 1) |
| `/ntd/[id]` | Internal | Detail page + stage cards |
| `/ntd/[id]/dfm` | R&D + Sourcing | Stage 7 DFM per-component review |
| `/ntd/[id]/mould-design` | R&D + Sourcing | Stage 8 mould design + joint review |
| `/ntd/[id]/trials` | R&D + Sourcing | Stage 10 trial testing |
| `/rfq/ntd/[ntdId]/[token]` | Vendor (open) | RFQ quotation + negotiation thread |
| `/supplier/ntd/[ntdId]` | Supplier (open) | Supplier portal — Stages 6–11 |

---

## localStorage Keys

| Key | Stage | Stores |
|-----|-------|--------|
| `ntd_records` | — | All NTD record summaries |
| `ntd_record_{id}` | — | Master NTD record |
| `ntd_activity_{id}` | — | Append-only audit log |
| `ntd_initiation_{id}` | 1 | Part specs + metadata |
| `ntd_spec_{id}` | 2 | RFQ spec + vendor comparison + dual sign-off |
| `ntd_rfq_{id}` | 3 | Per-vendor dispatch + tokens |
| `ntd_quotation_{id}` | 4 | Per-vendor quotations + threads |
| `ntd_selection_{id}` | 5 | Selected vendor + dual acknowledgement |
| `ntd_handoff_{id}` | 6 | Final designs + component list + supplier ack |
| `ntd_dfm_{id}` | 7 | DFM per-component loop + PO activity |
| `ntd_mould_{id}` | 8 | Mould design loop + joint review |
| `ntd_mfg_{id}` | 9 | Manufacturing status + updates |
| `ntd_trials_{id}` | 10 | Trial iterations + test results |
| `ntd_redesign_{id}` | 10 | Redesign rounds from trial failures |
| `ntd_stage11_{id}` | 11 | Commissioning + shipment + EXIM + sign-off |
