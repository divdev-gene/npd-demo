# NPD Detail Page Overhaul — Design Spec (Sub-projects 1 & 2)

**Date:** 2026-04-30  
**Branch:** divyansh-NPD-demo

---

## Goal

Replace the tab-heavy, stage-stepping NPD detail page with a clean role-based vertical layout. Reduce clutter, show only what each role needs, and introduce an 8-stage flow replacing the current 10-stage one.

---

## 1. Stage Flow (8 Stages)

### New Stage Definitions

| # | Name | Who acts | Description |
|---|------|----------|-------------|
| 1 | Request Initialisation | RND | NPD raised, details captured |
| 2 | RND Internal Review | RND | Internal feasibility, drawings uploaded |
| 3 | Supplier Sourcing & Quotation | Sourcing | RFQ sent, vendors respond with feasibility + sample qty/date |
| 4 | Supplier Dispatch | Sourcing | Vendor uploads dispatch documents, dispatch date confirmed |
| 5 | RND Evaluation | RND | Proof of delivery attached, MRN raised |
| 6 | RND Testing & TQR | RND | Testing performed, TQR submitted and approved |
| 7 | RND Approval | RND Head | Final approval by RND Head |
| 8 | Re-Sampling | Sourcing | New sample qty + date form sent back to supplier |

### Stage Name Constant (replaces NTD_STAGES + getStageName)

```ts
export const NPD_STAGES = [
  "Request Initialisation",       // 1
  "RND Internal Review",          // 2
  "Supplier Sourcing & Quotation",// 3
  "Supplier Dispatch",            // 4
  "RND Evaluation",               // 5
  "RND Testing & TQR",            // 6
  "RND Approval",                 // 7
  "Re-Sampling",                  // 8
]
export const TOTAL_NPD_STAGES = 8
```

### Mock Data Stage Remapping

Existing `mockNPDs` stage values (old → new):

| Old stage | New stage | Rationale |
|-----------|-----------|-----------|
| 1 | 1 | unchanged |
| 2 | 2 | unchanged |
| 3 | 3 | unchanged |
| 4 | 4 | Supplier Defence → Dispatch |
| 5 | 4 | Sample Submission absorbed into Dispatch |
| 6 | 5 | MRN/Receipt → RND Evaluation |
| 7 | 5 | R&D Evaluation → RND Evaluation |
| 8 | 6 | FPA → RND Testing & TQR |
| 9 | 6 | Sample Cost → absorbed into stage 6 |
| 10 | 7 | PP Lot Pricing → RND Approval |

Update `mockNPDs` records accordingly.

---

## 2. Page Layout

### Structure

```
┌─────────────────────────────────────────┐
│  [Progress Bar — 8 stages, read-only]   │
├─────────────────────────────────────────┤
│  [NPD Header Card — info for everyone]  │
├─────────────────────────────────────────┤
│  [Role Section A]                       │
│  [Role Section B]                       │
│  ...                                    │
└─────────────────────────────────────────┘
```

No `<Tabs>` component. No Prev/Next stage buttons. Single vertical scroll.

---

## 3. Progress Bar

- Horizontal bar spanning full width of the page content area
- 8 nodes: circles connected by lines
- **Completed stages:** filled circle (blue/slate), connecting line filled
- **Current stage:** filled circle with ring highlight + stage name shown below it
- **Future stages:** empty circle (slate-300), muted label
- Read-only — no click interaction
- Stage name shown below each node (abbreviated on mobile — show only current on small screens)
- Lives above the NPD header card

---

## 4. NPD Header Card (everyone)

Shown to all roles, always visible below the progress bar.

**Left column:**
- NPD ID badge (blue pill)
- Item name (large, bold)
- Category · Product Line (muted)
- Work type badge
- Priority chip (colour-coded)

**Right column (2×2 grid of chips):**
- Assigned SPOC (name)
- Locked Supplier (or "Pending Assignment")
- TAT Health (green/amber/red/black with days remaining)
- Current Stage name

Grade A badge shown inline with item name if applicable.

No "Advance Stage" / "Prev" buttons here. Stage advancement is done via action buttons inside each role section.

---

## 5. Role-Based Sections

### 5a. RND View (rnd_user, rnd_head)

Sections rendered in order:

#### Section 1: My Actions
Stage-gated action cards — only the card for the current stage is active; others show as greyed-out "completed" or "upcoming":

- **Stage 1** — Request summary read-only (form already submitted at creation)
- **Stage 2** — RND internal checklist: upload drawings to Drive, confirm feasibility, advance to sourcing. RND Head sees an "Approve & Release to Sourcing" button.
- **Stage 5** — Proof of delivery upload. Once uploaded → advance to stage 6.
- **Stage 6** — Testing results + TQR form (existing TQR widget reused). Advance to stage 7.
- **Stage 7** — RND Head only: Final approval button. Advance to stage 8.

#### Section 2: Sourcing Info (read-only)
A compact info card always visible:
- Vendors contacted (count + names)
- Selected/locked supplier name + tier
- Dispatch date (from supplier's dispatch submission, if available)
- Stage 3–4 status chip ("Awaiting quotations", "Supplier dispatched", etc.)

#### Section 3: Document Library
Existing document library widget, unchanged. Shows uploaded files with download links.

---

### 5b. Sourcing View (SPOC names, sourcing_head)

Sections rendered in order:

#### Section 1: Supplier Sourcing & Quotations
Combined view — previously split across "Supplier Sourcing Workflow" and "Vendor Quotations" tabs:
- At stage < 3: locked with "Waiting for RND to release" notice
- At stage 3: RFQ dispatch panel (select vendors, send bulk email), vendor quotation cards below
- Vendor cards: show feasibility (✓/✗), sample qty, supply date, query badge if raised

#### Section 2: Supplier Dispatch
- At stage 4: shows dispatch document status per vendor + dispatch date
- Dispatch link card (existing supplier dispatch portal link)
- "Mark Dispatched" → advance to stage 5

#### Section 3: Parts & Supplier Tracking
Existing tracking widget, condensed. Shows committed vs actual dispatch dates.

#### Section 4: Re-Sampling (stage 8 only)
Shown only when `activeStage === 8`. A simple form to define new sample quantity and expected date, which generates a new supplier quote URL pre-filled with context.

---

### 5c. Super Admin View
Renders all sections from both RND and Sourcing views, each clearly labelled with their role group header.

---

## 6. Removed

| What | Why |
|------|-----|
| `<Tabs>` component | Replaced by vertical role sections |
| Sample Cost tab | Removed per user request |
| Integrated Mail tab | Removed per user request |
| Prev/Next stage buttons | Stage advances via action buttons inside sections |
| Old 10-stage `NTD_STAGES` constant | Replaced by `NPD_STAGES` (8 stages) |
| `getStageName` for NTD type | Replaced by `NPD_STAGES[stage-1]` lookup |

---

## 7. Files Changed

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add `NPD_STAGES`, `TOTAL_NPD_STAGES`; update mock NPD stage values; update `getStageName` |
| `src/app/(internal)/npd/[id]/page.tsx` | Full restructure: remove Tabs, add progress bar, role-based vertical sections |

---

## 8. Data / State Notes

- `activeStage` state remains — driven by `npd.stage` on load, updated via `updateNPD`
- `currentRole` state remains — read from `localStorage.getItem("poc_role")`
- `isSpocOrSourcing` helper remains: `SPOC_NAMES.includes(currentRole) || currentRole === "sourcing_head" || currentRole === "super_admin"`
- New helper: `const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"`
- No new localStorage keys required for this sub-project
- All existing localStorage keys (live_quotations_v1, enquiry_sent_vendors_v1, etc.) remain unchanged
