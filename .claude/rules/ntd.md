# NTD — New Tool Development (v2)
# Amber Enterprises Pvt. Ltd. | Genessence NPD Platform
# Next.js + TypeScript + Tailwind v4 + shadcn/ui | No backend | localStorage only
# All file uploads = Google Drive / SharePoint links (text input) — no binary upload

---

## OVERVIEW

11-stage workflow for end-to-end tool development at Amber Enterprises.
Core pain being solved: back-and-forth design reviews currently done over
email with no version tracking or audit trail.

typeOfWork trigger: "New Tool Development (NTD)"
isNTD = npd.typeOfWork === "NTD"

SPOC: hardcoded to "Rohan Desai" on all NTD records.

---

## STAGE MAP

| Stage | Name                        | Primary Actors             |
|-------|-----------------------------|----------------------------|
| 1     | Tool Initiation             | R&D                        |
| 2     | RFQ Spec Sheet              | Sourcing + R&D (dual)      |
| 3     | RFQ Dispatch                | Sourcing                   |
| 4     | Quotation & Negotiations    | Sourcing + Vendor (open URL)|
| 5     | Supplier Selection          | Sourcing + R&D             |
| 6     | Final Design Handoff        | R&D → Supplier             |
| 7     | DFM Loop                    | Supplier → R&D             |
| 8     | Mould Design + MFA Loop     | Supplier → R&D + Sourcing  |
| 9     | Manufacturing               | Supplier + Sourcing        |
| 10    | Trials                      | Sourcing + R&D + Supplier  |
| 11    | Commissioning & Dispatch    | Supplier → Sourcing → EXIM |

---

## CORE DATA STRUCTURES

### VersionedFile
Used everywhere a file/link is stored. Old versions are NEVER deleted.

```ts
type VersionedFile = {
  file_id: string           // uuid, unique per logical file slot
  slot_name: string         // display label e.g. "Core Insert 3D", "MFA Report"
  versions: FileVersion[]
  current_version: number
  comments: FileComment[]
  approved: boolean
  approved_by?: string
  approved_at?: string
}

type FileVersion = {
  version_no: number        // 1, 2, 3... never resets
  link: string              // Drive/SharePoint URL
  uploaded_by: string
  uploaded_at: string
  upload_note?: string
  triggered_by_comment_id?: string  // which comment caused this revision
}

type FileComment = {
  comment_id: string
  author: string
  author_role: NTDRole
  text: string
  created_at: string
  requires_revision: boolean   // true = this comment blocks approval
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
}
```

### ActivityEntry
Append-only audit log. NEVER modify or delete entries.

```ts
type ActivityEntry = {
  id: string
  timestamp: string           // ISO
  actor: string               // display name
  actor_role: NTDRole
  stage: number               // 1–11
  substage?: "8A" | "8B"      // for Stage 8
  action_type: NTDActionType
  description: string         // human-readable e.g. "Uploaded tool design v2 (3 files)"
  payload?: {
    file_id?: string
    file_name?: string
    version_no?: number
    component_id?: string
    iteration_no?: number
    verdict?: string
    comment_id?: string
    trial_no?: number
    vendor_id?: string
  }
}

type NTDActionType =
  | "ntd_created"
  | "stage_advanced"
  | "file_uploaded"
  | "file_revised"
  | "comment_added"
  | "comment_resolved"
  | "file_approved"
  | "file_rejected"
  | "component_approved"
  | "component_rejected"
  | "stage_complete"
  | "supplier_submitted"
  | "query_posted"
  | "quotation_submitted"
  | "negotiation_round"
  | "supplier_selected"
  | "supplier_acknowledged"
  | "po_raised"
  | "samples_received"
  | "trial_initiated"
  | "trial_result"
  | "redesign_triggered"
  | "manufacturing_update"
  | "manufacturing_complete"
  | "shipment_update"
  | "exim_update"
  | "dual_approved"
  | "ntd_complete"

type NTDRole =
  | "rnd"
  | "sourcing"
  | "rnd_head"
  | "sourcing_head"
  | "exim"
  | "super_admin"
  | "supplier"
```

### NTDComponent
Defined in Stage 6. Immutable after Stage 6 submit.

```ts
type NTDComponent = {
  componentId: string    // "C01", "C02" ... auto-assigned
  name: string           // "Core Insert", "Cavity Plate" etc.
}
```

---

## STAGE DEFINITIONS

---

### Stage 1 — Tool Initiation
**Actor:** R&D (isRnd)
**Gate:** Submission triggers advance to Stage 2 immediately (no approval needed)

R&D creates the NTD record. Uploads part spec documents (one or more).
SPOC is always "Rohan Desai".

**UI:**
- Title field (required)
- Notes / description (optional)
- Part Spec files: add N file slots, each is a VersionedFile
  - Slot name (e.g. "Part Drawing", "Material Spec")
  - Drive link input
- Submit → creates NTD record, advances to Stage 2

**localStorage:** `ntd_initiation_{ntdId}`
```ts
{
  title: string,
  spoc: "Rohan Desai",
  notes: string,
  part_specs: VersionedFile[],
  submitted_by: string,
  submitted_at: string
}
```

---

### Stage 2 — RFQ Spec Sheet
**Actors:** Sourcing (fills) + R&D (validates) — DUAL sign-off required
**Gate:** Both sourcing_signed AND rnd_signed → advance to Stage 3

Sourcing prepares the RFQ spec sheet. Adds vendor comparison rows.
R&D validates the spec is correct. Both must independently sign off.

**UI:**
- Spec sheet link input (VersionedFile — can be revised)
- Vendor comparison table: add rows with vendor name + spec doc link + notes
- "Sourcing Sign-off" button (Sourcing role only)
- "R&D Sign-off" button (R&D role only)
- Each button shows name + timestamp after signing
- Stage locked until both signed
- Progress: "Sourcing ✓ | R&D pending" etc.

**localStorage:** `ntd_spec_{ntdId}`
```ts
{
  spec_sheet: VersionedFile,
  comparisons: {
    row_id: string,
    vendor_name: string,
    spec_doc_link: string,
    notes: string
  }[],
  sourcing_signed: boolean,
  sourcing_signed_by: string,
  sourcing_signed_at: string,
  rnd_signed: boolean,
  rnd_signed_by: string,
  rnd_signed_at: string
}
```

---

### Stage 3 — RFQ Dispatch
**Actor:** Sourcing SPOC
**Gate:** At least one RFQ sent → advance to Stage 4

Sourcing selects vendors from VENDOR_CATALOG (grouped by commodity).
Non-catalog vendors can be added manually — these auto-require NDA.
Each vendor gets a unique open URL token generated at dispatch.

RFQ package sent to vendor includes:
- Part spec links (from Stage 1, read-only)
- Spec sheet link (from Stage 2, read-only)

**UI:**
- Vendor multi-select from VENDOR_CATALOG
- "Add Custom Vendor" option
- Per-vendor: NDA toggle (forced on for non-catalog), "Generate & Send RFQ" button
- After send: shows vendor URL /rfq/ntd/[ntdId]/[token] with copy button
- Bulk send all option
- Status chips per vendor: "Pending" | "Sent"

**localStorage:** `ntd_rfq_{ntdId}`
```ts
{
  vendors: {
    [vendorId: string]: {
      vendor_name: string,
      is_catalog: boolean,
      token: string,              // random 8-char string, generated once, never changes
      nda_required: boolean,
      nda_signed: boolean,
      sent: boolean,
      sent_at: string,
      sent_by: string
    }
  }
}
```

---

### Stage 4 — Quotation & Negotiations
**Actors:** Sourcing (internal portal) ↔ Vendor (open URL /rfq/ntd/[ntdId]/[token])
**Gate:** At least one vendor status === "finalized" → advance to Stage 5

Two-sided threaded negotiation per vendor.
Vendor and Sourcing both see the same thread on their respective views.

**Open URL (/rfq/ntd/[ntdId]/[token]) — vendor sees:**
- NTD title + part spec links + spec sheet link (read-only)
- Quotation form: amount, currency, lead time (days), doc link, notes
  - Can update quotation until Sourcing marks "finalized"
- Thread: all messages chronologically
- Reply box: vendor posts query or counter-offer

**Internal view (Sourcing) — per vendor card:**
- Quotation details
- Thread with all messages
- Reply box (Sourcing posts response)
- Counter-offer field (numeric, optional on any message)
- Status selector: "sent" → "quotation_received" → "negotiating" → "finalized"

**localStorage:** `ntd_quotation_{ntdId}`
```ts
{
  [vendorId: string]: {
    quotation?: {
      amount: number,
      currency: string,
      lead_time_days: number,
      doc_link: string,
      notes: string,
      submitted_at: string,
      last_updated_at: string
    },
    thread: {
      message_id: string,
      author_name: string,
      author_type: "vendor" | "internal",
      text: string,
      counter_offer?: number,
      created_at: string
    }[],
    status: "sent" | "quotation_received" | "negotiating" | "finalized"
  }
}
```

---

### Stage 5 — Supplier Selection
**Actors:** Sourcing selects → R&D acknowledges
**Gate:** sourcing_approved AND rnd_acknowledged → advance to Stage 6

Sourcing picks one winner from vendors with status "finalized".
R&D must acknowledge the selection.
record.supplier is set here.

**UI:**
- Dropdown of finalized vendors with their quoted amounts
- "Select as Final Supplier" button (Sourcing only)
- After selection: R&D sees "Acknowledge Supplier Selection" button
- Both actions timestamped and attributed
- Progress: "Sourcing selected [vendor] ✓ | R&D acknowledgement pending"

**localStorage:** `ntd_selection_{ntdId}`
```ts
{
  selected_vendor_id: string,
  selected_vendor_name: string,
  sourcing_approved: boolean,
  sourcing_approved_by: string,
  sourcing_approved_at: string,
  rnd_acknowledged: boolean,
  rnd_acknowledged_by: string,
  rnd_acknowledged_at: string
}
```

---

### Stage 6 — Final Design Handoff
**Actor:** R&D uploads → Supplier acknowledges
**Gate:** supplier_acknowledged === true → advance to Stage 7

R&D uploads finalized tool design + spec documents to send to the selected supplier.
R&D also defines the component list here. Component list is IMMUTABLE after submit.

**UI (R&D):**
- Component builder:
  - "Add Component" → row with name input
  - Auto-assigns C01, C02...
  - Minimum 1 component required
  - WARNING: "Component list cannot be changed after submission"
  - Running count: "N Components Defined"
- Final design files: add N VersionedFile slots with slot names + Drive links
- "Submit & Notify Supplier" button
- After submit: shows supplier portal URL /supplier/ntd/[ntdId] with copy button
- Shows supplier acknowledgement status: "Awaiting supplier confirmation"
- "Simulate Supplier Acknowledgement" button (demo purposes)

**UI (Supplier portal — Stage 6 section):**
- List of uploaded files with Drive links
- "Confirm Receipt of All Files" button → sets supplier_acknowledged: true

**localStorage:** `ntd_handoff_{ntdId}`
```ts
{
  components: NTDComponent[],        // IMMUTABLE after submit
  component_count: number,
  final_designs: VersionedFile[],
  submitted_by: string,
  submitted_at: string,
  supplier_acknowledged: boolean,
  supplier_acknowledged_at: string
}
```

---

### Stage 7 — DFM Loop (per-component)
**Actor:** Supplier submits → R&D reviews each component
**Gate:** ALL components final_status === "approved" → advance to Stage 8
**PERMANENT:** DFM is never revisited after Stage 7 completes — not even on trial failure

Per-component loop:
```
"pending"
  → supplier submits PPT link + 3D design link → "under_review"
  → R&D reviews:
      Approve all files → "approved" (LOCKED FOREVER)
      Add revision-required comment on any file → "revision_required"
  → supplier sees feedback, uploads new version → "under_review"
  → loop until approved
```

PO Activity (parallel, does NOT block DFM progress):
- Sourcing marks PO raised: PO number + date
- Simple form, non-blocking

**UI (R&D — internal /ntd/[id]/dfm):**
- Header: "DFM Review — X / N Components Approved" + progress bar
- Component list (accordion):
  - Approved: green badge, collapsed, locked, no actions
  - Under Review: yellow badge — show file review panels
  - Revision Required: red badge — show feedback + iteration history
  - Pending: grey badge — awaiting supplier submission
- Per file in each component:
  - Drive link + version badge (v1, v2...)
  - "Approve File" button
  - "Add Comment" button — comment has "requires revision" toggle
  - Comment thread (inline, collapsible)
- Component approves when ALL its files are approved by R&D
- "X / N Files Approved" sub-indicator per component
- Iteration history accordion: shows all past submissions + feedback
- PO Activity panel (Sourcing role): PO number field + "Mark PO Raised" button

**UI (Supplier portal — Stage 7 section):**
- Shows ONLY components where final_status !== "approved"
- Per component: current status badge + latest R&D feedback
- Per file: current version link + all revision-required comments
- "Upload New Version" per file (Drive link input) → creates new version
- Approved components: NOT shown

**localStorage:** `ntd_dfm_{ntdId}`
```ts
{
  components: {
    componentId: string,
    name: string,
    ppt: VersionedFile,
    design_3d: VersionedFile,
    iteration_no: number,      // increments on each supplier resubmission
    final_status: "pending" | "under_review" | "revision_required" | "approved",
    approved_by?: string,
    approved_at?: string
  }[],
  po_activity: {
    raised: boolean,
    po_number: string,
    raised_by: string,
    raised_at: string
  },
  stage_complete: boolean
}
```

---

### Stage 8 — Mould Design + MFA Loop (per-component)
**Actor:** Supplier submits → R&D + Sourcing DUAL review each component
**Gate:** ALL components approved AND joint review complete → advance to Stage 9

Sub-stages: 8A (design loop) → 8B (joint review)

#### 8A — Mould Design + MFA Per-Component Loop

Same loop structure as Stage 7 DFM but:
- Supplier submits: Mould Design (3D link) + MFA Report (PPT link) per component
- BOTH R&D AND Sourcing must approve each component (dual)
- 24hr SLA on each review after submission:
    Green badge: > 4hrs remaining
    Yellow badge: < 4hrs remaining
    Red badge: OVERDUE
- A component is approved only when BOTH R&D AND Sourcing have approved
- If either rejects: "revision_required", supplier resubmits

Trial failure re-entry (from Stage 10):
- ONLY failed trial components re-enter 8A with new redesign_round number
- Passed/approved components stay permanently locked
- Banner shown: "Redesign Round N — triggered by Trial T"
- Only unlocked components shown to supplier in portal

Per-component state:
```
"pending"
  → supplier submits → "under_review"
  → R&D approves + Sourcing approves → "approved" (LOCKED)
  → any rejection → "revision_required"
  → supplier resubmits → "under_review"
```

#### 8B — Joint Review (after all 8A components approved)

After all components approved in 8A:
- Joint review session: R&D + Sourcing give consolidated feedback
- Supplier must upload confirmed final mould design files within 24hrs
- 24hr countdown starts when joint review feedback is submitted
- After supplier uploads + R&D + Sourcing approve → Stage 9 unlocks

**UI (R&D + Sourcing — /ntd/[id]/mould-design):**
- Sub-stage tabs: "8A — Per Component" | "8B — Joint Review"
- 8A tab:
  - "X / N Components Approved" progress bar
  - Component accordion (same pattern as DFM)
  - Per component: shows BOTH R&D review panel + Sourcing review panel
  - SLA countdown badge per component under review
  - Redesign round banner when applicable
- 8B tab (unlocks when all 8A complete):
  - Joint feedback text area (R&D + Sourcing both can add)
  - "Submit Joint Feedback to Supplier" button
  - After submit: shows 24hr countdown for supplier upload
  - Supplier upload section (when available): file links + approve button

**localStorage:** `ntd_mould_{ntdId}`
```ts
{
  redesign_round: number,       // 0 = initial, 1+ = post-trial
  components: {
    componentId: string,
    name: string,
    mould_3d: VersionedFile,
    mfa_ppt: VersionedFile,
    rnd_review: {
      verdict: "approved" | "rejected" | "pending",
      comments: string,
      reviewed_by: string,
      reviewed_at: string,
      sla_deadline: string      // submitted_at + 24hrs
    },
    sourcing_review: {
      verdict: "approved" | "rejected" | "pending",
      comments: string,
      reviewed_by: string,
      reviewed_at: string,
      sla_deadline: string
    },
    iteration_no: number,
    final_status: "pending" | "under_review" | "revision_required" | "approved",
    locked: boolean
  }[],
  joint_review: {
    feedback: string,
    feedback_by: string,
    feedback_at: string,
    supplier_deadline: string,  // feedback_at + 24hrs
    supplier_files: VersionedFile[],
    supplier_uploaded_at: string,
    approved: boolean,
    approved_by: string,
    approved_at: string
  } | null,
  stage_complete: boolean
}
```

---

### Stage 9 — Manufacturing
**Actor:** Supplier (updates) + Sourcing (monitors + confirms complete)
**Gate:** Sourcing marks complete → advance to Stage 10

Supplier confirms manufacturing start + ETA (1.5–2 months typical).
Posts periodic status updates (text + optional doc link).
Sourcing clicks "Mark Manufacturing Complete" when done.

**UI (Supplier portal — Stage 9 section):**
- "Confirm Manufacturing Start" — date picker
- ETA date picker
- "Post Status Update" — text + optional doc link
- "Mark Manufacturing Complete" button

**UI (Internal — Sourcing):**
- Manufacturing timeline card
- Status updates feed (read-only for R&D, Sourcing can post too)
- "Mark Manufacturing Complete" button (Sourcing only)

**localStorage:** `ntd_mfg_{ntdId}`
```ts
{
  mfg_start_date: string,
  eta_date: string,
  updates: {
    update_id: string,
    date: string,
    note: string,
    doc_link?: string,
    posted_by: string,
    posted_by_role: string
  }[],
  status: "not_started" | "in_progress" | "complete",
  completed_by: string,
  completed_at: string
}
```

---

### Stage 10 — Trials
**Actor:** Sourcing initiates → R&D tests → Supplier resubmits on failure
**Gate:** ALL components pass in a trial → advance to Stage 11
**Unbounded:** No cap on trial count

A new trial can only be initiated when:
- It is Trial 1 (no previous trials), OR
- All failed components from previous trial completed Stage 8A redesign loop

Per trial flow:
1. Sourcing initiates trial (T1, T2, T3...)
2. Supplier confirms sample dispatch (on supplier portal)
3. R&D marks samples received
4. R&D fills 7-parameter test checklist per component:

```ts
type ComponentTestResult = {
  componentId: string,
  dimensional_accuracy:     { verdict: "pass"|"fail", actual: string, spec: string },
  surface_finish:           { verdict: "pass"|"fail", ra_value: string, visual_grade: string },
  material_hardness:        { verdict: "pass"|"fail", reading: string, unit: "HRC"|"HB"|"other" },
  cavity_fill_flash:        { verdict: "pass"|"fail", notes: string },
  ejection_parting_line:    { verdict: "pass"|"fail", defect_desc: string },
  tooling_fit_assembly:     { verdict: "pass"|"fail", notes: string },
  cycle_time:               { verdict: "pass"|"fail", actual_sec: number, target_sec: number },
  overall_verdict:          "pass" | "fail",
  feedback_ppt_link:        string,    // required if fail — R&D uploads PPT
  requires_redesign:        boolean
}
```

Post-trial auto-logic:
- ALL pass → stage_complete: true → advance to Stage 11
- Partial fail:
  - Failed components re-enter Stage 8A (Mould Design ONLY — DFM never revisited)
  - Passed components locked forever (cannot be re-tested)
  - ntd_redesign entry created
  - Banner on Stage 8 and Stage 10: "Redesign Round N — triggered by Trial T"

**UI (/ntd/[id]/trials):**
- Trial tabs: T1 | T2 | T3 ... (auto-grows)
- "Initiate New Trial" button (Sourcing) — disabled if redesign pending
- Per trial:
  - Status: "pending" | "samples_dispatched" | "samples_received" | "testing" | "complete"
  - Component test cards — R&D fills checklist per component
  - Overall trial result badge: "All Pass" | "Partial Fail"
  - Failed components: "Redesign Required →" link to Stage 8
- Overall progress: "X / N Components Passed (Cumulative)"

**localStorage:** `ntd_trials_{ntdId}`
```ts
{
  trials: {
    trial_no: number,
    initiated_at: string,
    initiated_by: string,
    samples_dispatched_at: string,
    samples_received_at: string,
    status: "pending" | "samples_dispatched" | "samples_received" | "testing" | "complete",
    result: "all_pass" | "partial_fail" | null,
    components: ComponentTestResult[]
  }[],
  stage_complete: boolean
}
```

**localStorage:** `ntd_redesign_{ntdId}`
```ts
{
  redesign_rounds: {
    round_no: number,
    triggered_by_trial: number,
    failed_component_ids: string[],
    re_enters: "STAGE_8A_MOULD_DESIGN_ONLY",
    mould_redesign_round_ref: number,
    resolved_at: string
  }[]
}
```

---

### Stage 11 — Commissioning & Dispatch
**Actors:** Supplier → Sourcing → EXIM → Dual sign-off
**Sequential sub-steps — each unlocks the next**

Sub-step 1 — Final Inspection Report (Supplier)
- Supplier uploads Final Inspection Report (VersionedFile)

Sub-step 2 — Commissioning (Sourcing)
- Commissioning checklist (checkbox list)
- Pack list upload (VersionedFile)
- Invoice upload (VersionedFile)

Sub-step 3 — Shipment Setup (Sourcing)
- EXIM docs upload (multiple VersionedFiles)
- Shipment mode: Sea | Air
- Tracking ID entry

Sub-step 4 — EXIM Clearance (EXIM role only)
- Status updates: text + optional doc link
- "Mark EXIM Cleared" button
- Can upload additional EXIM documents

Sub-step 5 — Tool Arrival (Sourcing)
- Confirm arrival at Gurugram plant
- Arrival date

Sub-step 6 — Final Dual Sign-off
- R&D Head approves (rnd_head / super_admin role)
- Sourcing Head approves (sourcing_head / super_admin role)
- BOTH required → ntd_complete: true → NTD fully closed

**localStorage:** `ntd_stage11_{ntdId}`
```ts
{
  inspection: {
    report: VersionedFile,
    submitted_by: string,
    submitted_at: string
  } | null,
  commissioning: {
    checklist_items: { label: string, checked: boolean }[],
    pack_list: VersionedFile,
    invoice: VersionedFile,
    completed_by: string,
    completed_at: string
  } | null,
  shipment: {
    exim_docs: VersionedFile[],
    mode: "sea" | "air",
    tracking_id: string,
    dispatched_at: string,
    dispatched_by: string
  } | null,
  exim: {
    updates: {
      update_id: string,
      status_label: string,
      note: string,
      doc?: VersionedFile,
      updated_by: string,
      updated_at: string
    }[],
    cleared: boolean,
    cleared_at: string
  } | null,
  arrival: {
    arrived_at: string,
    confirmed_by: string
  } | null,
  final_approval: {
    rnd_head_approved: boolean,
    rnd_head_by: string,
    rnd_head_at: string,
    sourcing_head_approved: boolean,
    sourcing_head_by: string,
    sourcing_head_at: string,
    ntd_complete: boolean
  } | null
}
```

---

## TRACKING SURFACES

### 1. Activity Feed (tab on /ntd/[id])
- Full reverse-chronological log from ntd_activity_{ntdId}
- Append-only, never editable
- Each entry: timestamp | actor name | role badge | stage badge | description
- Filterable by: Stage | Role | Action Type
- File upload entries show version number (e.g. "v2")
- Approval entries: green badge. Rejection entries: red badge

### 2. Per-file Version History (inline everywhere files appear)
- Click any file → version history drawer
- Timeline: v1 → v2 → v3 with uploader + date + comment that triggered revision
- Current version highlighted in blue
- All Drive links accessible per version

### 3. Component Status Board (Stage 7 DFM + Stage 8 Mould Design)
- Grid: rows = components, columns = iterations (I1, I2, I3...)
- Cell = status badge for that component in that iteration
- Click cell → drawer with that iteration's submission + feedback
- "View Full History" expands all iterations per component

### 4. Trial History (Stage 10)
- Tab per trial: T1 | T2 | T3...
- Per trial tab: component checklist results + overall verdict
- Failed components: "→ Redesign Round N" link
- Cumulative pass tracker: "X / N Components Passed"

---

## ROUTES

| Route                           | Who              | Purpose                                     |
|---------------------------------|------------------|---------------------------------------------|
| /ntd                            | All internal     | NTD list — search, status, Stage X/11 bar  |
| /ntd/new                        | R&D only         | Create NTD (Stage 1)                        |
| /ntd/[id]                       | All internal     | Detail — header card, stepper, stage cards  |
| /ntd/[id]/dfm                   | R&D + Sourcing   | Stage 7 DFM per-component loop              |
| /ntd/[id]/mould-design          | R&D + Sourcing   | Stage 8 mould design + joint review         |
| /ntd/[id]/trials                | R&D + Sourcing   | Stage 10 trial testing loop                 |
| /rfq/ntd/[ntdId]/[vendorToken]  | Vendor (open)    | RFQ open URL — quotation + thread           |
| /supplier/ntd/[ntdId]           | Supplier (open)  | Supplier portal — stages 6–11               |

---

## SUPPLIER PORTAL — /supplier/ntd/[ntdId]

No auth. URL shared by Sourcing after Stage 5.
Shows the relevant section based on current stage.

| Stage | Supplier Sees                                                      |
|-------|--------------------------------------------------------------------|
| 6     | File receipt acknowledgement                                       |
| 7     | DFM — submit PPT + 3D link per component (non-approved only)      |
| 8     | Mould Design — submit mould 3D + MFA PPT per component            |
|       | + Joint Review response (upload within 24hr deadline)             |
| 9     | Manufacturing start/ETA + status updates + mark complete          |
| 10    | Sample dispatch confirmation per trial                            |
| 11    | Final inspection report upload                                    |

Supplier tracking view (their own history only):
- Per-component submission history: what they submitted, what feedback they got
- Current status per component
- Never shows: internal discussion, other vendor info, internal approvals

---

## ROLES

| Role          | Access                                                             |
|---------------|--------------------------------------------------------------------|
| rnd           | Stages 1, 2 (sign-off), 6 (upload + components), 7 (review), 8 (review), 10 (test) |
| sourcing      | Stages 2 (fill), 3, 4 (internal), 5, 7 (PO), 8 (review), 9, 10 (initiate), 11 |
| rnd_head      | Stage 11 final sign-off + all read access                         |
| sourcing_head | Stage 11 final sign-off + all read access                         |
| exim          | Stage 11 sub-step 4 ONLY                                          |
| super_admin   | All stages, all actions                                           |
| supplier      | /supplier/ntd/[ntdId] only                                        |
| vendor        | /rfq/ntd/[ntdId]/[token] only                                     |

---

## localStorage KEY REFERENCE

| Key                      | Stage | Purpose                                      |
|--------------------------|-------|----------------------------------------------|
| ntd_records              | —     | Array of all NTDRecord summaries             |
| ntd_record_{id}          | —     | Master NTD record                            |
| ntd_activity_{id}        | —     | Append-only activity log                     |
| ntd_initiation_{id}      | 1     | Part spec files + metadata                   |
| ntd_spec_{id}            | 2     | RFQ spec sheet + comparisons + dual sign-off |
| ntd_rfq_{id}             | 3     | Per-vendor RFQ dispatch + tokens             |
| ntd_quotation_{id}       | 4     | Per-vendor quotations + threads              |
| ntd_selection_{id}       | 5     | Selected vendor + dual acknowledgement       |
| ntd_handoff_{id}         | 6     | Final designs + component list + supplier ack|
| ntd_dfm_{id}             | 7     | DFM per-component loop + PO activity         |
| ntd_mould_{id}           | 8     | Mould design loop + joint review             |
| ntd_mfg_{id}             | 9     | Manufacturing status + updates               |
| ntd_trials_{id}          | 10    | Trial iterations + test results              |
| ntd_redesign_{id}        | 10    | Redesign rounds triggered by trial failures  |
| ntd_stage11_{id}         | 11    | Commissioning + shipment + EXIM + sign-off   |

---

## INVARIANTS — NEVER VIOLATE

1.  ntd_activity is append-only — never modify or delete entries
2.  Component list (ntd_handoff.components) is immutable after Stage 6 submit
3.  DFM Stage 7 is NEVER revisited after completion — not on trial failure, not ever
4.  Trial failure → re-enters Stage 8A ONLY, ONLY for failed components
5.  Approved components in any loop are permanently locked — no reopen
6.  VersionedFile version numbers only increment — old versions never deleted
7.  vendorToken is generated once at Stage 3 dispatch and never regenerated
8.  Stage 11 dual sign-off requires BOTH rnd_head AND sourcing_head — not one alone
9.  Trial count is unbounded — never hardcode a cap
10. Supplier portal never shows approved components — only actionable ones
11. New trial cannot start until failed components complete Stage 8A redesign loop
12. EXIM role can only act in Stage 11 sub-step 4 — no access elsewhere

---

## ADDENDUM — Per-Commodity Multi-Supplier Model (v2.1+)

NTD now supports **multiple suppliers per tool** via commodity-based routing. One supplier per commodity selected at Stage 5; subsequent stages (6–11) are tracked per commodity.

### Commodities

**`NTD_COMMODITIES`** constant:
```ts
["Sheet Metal", "Plastics", "EPS"]
```

### NTDComponent Structure (Stage 6)

Components now include a commodity field:
```ts
type NTDComponent = {
  componentId: string      // "C01", "C02" etc.
  name: string
  commodity: string        // "Sheet Metal" | "Plastics" | "EPS"
}
```

### Stage-by-Stage Changes

**Stage 1:** Component rows include commodity dropdown selector (required).

**Stage 3 (RFQ Dispatch):** Vendors tagged by commodity in `ntd_rfq_{ntdId}`. Sourcing pools & filters vendors per commodity when dispatching.

**Stage 5 (Supplier Selection):** `ntd_selection_{ntdId}` now uses:
```ts
selections: Record<commodity, {
  selected_vendor_id: string,
  selected_vendor_name: string,
  sourcing_approved_at: string,
  rnd_acknowledged_at: string
}>
```
On R&D acknowledgement, `NTDRecord.selectedSuppliers` is set (keyed by commodity).

**Stage 6 (Final Design Handoff):** `supplier_acknowledged_by_commodity` tracks ack per commodity. Portal URLs become `/supplier/ntd/[id]?commodity=X` (supplier scoped to commodity).

**Stage 8B (Mould Design Joint Review):** New localStorage key `ntd_mould_8b_{ntdId}`:
```ts
Record<commodity, {
  feedback: string,
  feedback_by: string,
  feedback_at: string,
  supplier_deadline: string,
  supplier_files: VersionedFile[],
  supplier_uploaded_at: string,
  approved: boolean,
  approved_by: string,
  approved_at: string
}>
```

**Stage 9 (Manufacturing):** New localStorage key `ntd_mfg_v2_{ntdId}`:
```ts
Record<commodity, {
  mfg_start_date: string,
  eta_date: string,
  updates: UpdateEntry[],
  status: "not_started" | "in_progress" | "complete",
  completed_by: string,
  completed_at: string
}>
```

**Stage 11 (Commissioning & Dispatch):** `inspection` field becomes:
```ts
inspection: Record<commodity, {
  report: VersionedFile,
  submitted_by: string,
  submitted_at: string
}>
```

### Supplier Portals

- **Design & Manufacturing:** `/supplier/ntd/[id]?commodity=X` — scopes all stages (6–11) to that supplier's commodity; hides other commodities.
- **Redesign Portal:** `/supplier/ntd/redesign/[id]?commodity=X` — for post-trial mould resubmission after Stage 8A failure.

### New localStorage Keys

| Key                  | Purpose                                  |
|----------------------|------------------------------------------|
| `ntd_mould_8b_{id}`  | Stage 8B per-commodity joint review data |
| `ntd_mfg_v2_{id}`    | Stage 9 per-commodity manufacturing data |
