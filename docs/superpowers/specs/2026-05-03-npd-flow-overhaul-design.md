# NPD Flow Overhaul — Design Spec
**Date:** 2026-05-03  
**Status:** Approved

## Overview

Three coordinated changes to the NPD Command application:
1. Personalise all internal emails with real recipient names
2. Remove Stage 2 (RND Internal Review) — stages 3–8 become 2–7 — and add a new Stage 8 (NPD Summary & Closure)
3. Update all mock NPD stage numbers to match the new numbering

---

## 1. Email Personalisation

### Problem
Emails in `npd/[id]/page.tsx` address recipients by role string (`"R&D User"`, `"R&D Head"`) in both the `to=` prop of `EmailCard` and the `Dear <strong>…</strong>` salutation in email body HTML.

### Solution
Add a named R&D Head contact to `mockData.ts`:
```ts
export const DEFAULT_RND_HEAD: ContactInfo = {
  name:  "Rajesh Kumar",
  email: "rajesh.kumar@amber.com",
  phone: "+91 98100 88002",
}
```

The existing `DEFAULT_RND_CONTACT` (`Ankit Verma`) serves as the R&D User name.

Replace all occurrences in `npd/[id]/page.tsx`:
- `"R&D User"` (in `to=` and `Dear`) → `DEFAULT_RND_CONTACT.name` ("Ankit Verma")
- `"R&D Head"` (in `to=` and `Dear`) → `DEFAULT_RND_HEAD.name` ("Rajesh Kumar")

SPOC names and vendor names already use variables — no change needed.

---

## 2. Stage Renumbering

### New NPD_STAGES array (mockData.ts)
| Stage | Name |
|-------|------|
| 1 | Request Initialisation |
| 2 | Supplier Sourcing & Quotation *(was 3)* |
| 3 | Supplier Dispatch *(was 4)* |
| 4 | RND Evaluation *(was 5)* |
| 5 | RND Testing & TQR *(was 6)* |
| 6 | RND Approval *(was 7)* |
| 7 | Plant Delivery Acceptance *(was 8)* |
| 8 | NPD Summary & Closure *(new)* |

`TOTAL_NPD_STAGES` remains 8.

### Changes in npd/[id]/page.tsx
- Remove the Stage 2 (RND Internal Review) panel entirely from the RND section
- All `activeStage === X` / `activeStage >= X` guards shift: old 3→2, 4→3, 5→4, 6→5, 7→6, 8→7
- `dispatchEnquiry`: advances to stage 2 (was 3)
- `setVendorApproval`: advances to stage 3 (was 4)
- `approveDelivery`: advances to stage 5 (was 6)
- TQR fully approved → advance button: stage 6 (was 7)
- Stage 7 RND Approval button: advances to stage 7 (was 8)
- `demoAdvanceStage`: all stage transition checks shift accordingly; stage 7 is the plant delivery satisfaction step; stage 8 is a simple advance (new placeholder)
- `demoRevertStage`: no logic change needed (uses relative prev = activeStage - 1)

### Changes in npd/new/page.tsx
- `handleConfirmDispatch`: creates NPD at `stage: 2` (was 3), `stageName: getStageName(2, workTypeLabel)`

---

## 3. Mock NPD Stage Remapping (mockData.ts)

| NPD ID | Old Stage | New Stage | Stage Name |
|--------|-----------|-----------|------------|
| NPD-FY-2026-0012 | 4 | 3 | Supplier Dispatch |
| NPD-FY-2026-0014 | 6 | 5 | RND Testing & TQR |
| NPD-FY-2026-0018 | 3 | 2 | Sourcing Impact Assessment (ECN) |
| NPD-FY-2026-0021 | 4 | 3 | Document Submission (Compliance) |
| NPD-FY-2026-0005 | 7 | 6 | RND Approval |
| NPD-FY-2026-0008 | 2 | 2 | Advance to Supplier Sourcing (review gate removed) |
| NPD-FY-2026-0027 | 4 | 3 | Supplier Dispatch |

`stageName` fields also updated to match `getStageName()` output for the new stage number.

---

## 4. Stage 8 — NPD Summary & Closure

New section in `npd/[id]/page.tsx`, shown when `activeStage === 8`. Visible to all roles.

### Parts

**A. Summary Card**
- Part number (`assignedPartNumber`)
- Item name, supplier, category
- Test results table (all tests from `RND_EVAL_KEY` with values — same columns as the evaluation table)
- Plant verdict (Accepted / Not Good) with remarks
- Final TAT status

**B. Download Report Button**
- Calls `window.print()` on a formatted summary div
- No external PDF library — uses browser print with a print-only CSS class (`print:block`, rest `print:hidden`)
- Button label: "Download Report"

**C. Fetch Part Details from AICM**
- Button: "Fetch Part Details from AICM"
- On click: toggles an inline panel (no new browser tab — consistent with existing UI)
- Panel shows a mock AICM record:
  - Part Number: `assignedPartNumber`
  - Part Name: `npd.itemName`
  - Unit Cost (₹): `npd.cost ?? 850` (fallback mock value)
- Simulates an API fetch with a 1-second loading state

### localStorage key
`AICM_FETCH_KEY = "aicm_fetch_v1"` — persists the fetched state so it survives refresh.

---

## Files Changed
1. `src/lib/mockData.ts` — NPD_STAGES, DEFAULT_RND_HEAD, mock NPD records, AICM_FETCH_KEY
2. `src/app/(internal)/npd/[id]/page.tsx` — stage logic, email names, new stage 8 section
3. `src/app/(internal)/npd/new/page.tsx` — creation stage number
