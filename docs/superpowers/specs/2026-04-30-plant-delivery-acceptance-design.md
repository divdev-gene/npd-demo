# Plant Delivery Acceptance (Stage 8) — Design Spec

**Date:** 2026-04-30
**Branch:** divyansh-NPD-demo

---

## Goal

Rename Stage 8 from "Re-Sampling" to "Plant Delivery Acceptance" and build out its full flow:

1. RND Head assigns a new part number after stage 7 → 8 transition
2. Supplier is asked for delivery date + sample quantity (manual entry by sourcing/RND)
3. `plant_user` role accepts the delivery and gives final testing verdict (Accepted / Not Good)
4. "Not Good" verdict stores the rejected part number for use in future NPD revision requests

---

## 1. Data Layer

### 1a. New localStorage keys

```ts
export const PART_ASSIGNMENT_KEY       = "part_assignment_v1"
export const PLANT_SUPPLIER_RESP_KEY   = "plant_supplier_response_v1"
export const PLANT_ACCEPTANCE_KEY      = "plant_acceptance_v1"
export const REJECTED_PARTS_KEY        = "rejected_parts_v1"
```

### 1b. Schemas

```ts
// part_assignment_v1
{ [npdId]: { partNumber: string; assignedAt: string } }

// plant_supplier_response_v1
{ [npdId]: { deliveryDate: string; sampleQty: number; submittedAt: string } }

// plant_acceptance_v1
{ [npdId]: { docName: string; acceptedAt: string; verdict: "accepted" | "not_good"; remarks?: string } }

// rejected_parts_v1  (array, not keyed by npdId — so new-request form can list all)
Array<{ npdId: string; partNumber: string; itemName: string; rejectedAt: string }>
```

---

## 2. TopNav — plant_user role

Add a new "Plant" group to `ROLE_GROUPS` in `TopNav.tsx`:

```ts
{
  label: "Plant",
  roles: [
    { value: "plant_user", name: "Plant User", area: "Delivery & Testing" }
  ]
}
```

`getRoleBg`: `plant_user` → `"bg-orange-600"`

---

## 3. State Added to `page.tsx`

```ts
// Stage 8 — part assignment
const [partNumberInput, setPartNumberInput]           = useState("")
const [partAssigned, setPartAssigned]                 = useState(false)
const [assignedPartNumber, setAssignedPartNumber]     = useState("")

// Stage 8 — supplier delivery response (manual entry)
const [plantDeliveryDate, setPlantDeliveryDate]       = useState("")
const [plantDeliveryQty, setPlantDeliveryQty]         = useState("")
const [plantSupplierSubmitted, setPlantSupplierSubmitted] = useState(false)

// Stage 8 — plant user acceptance + verdict
const [plantDeliveryDoc, setPlantDeliveryDoc]         = useState("")
const [plantDeliveryAccepted, setPlantDeliveryAccepted] = useState(false)
const [plantVerdict, setPlantVerdict]                 = useState<"accepted" | "not_good" | null>(null)
const [plantRemarks, setPlantRemarks]                 = useState("")
```

### useEffect additions

Load all 3 stage-8 keys from localStorage on mount alongside other keys.

### Role checks

```ts
const isPlantUser = currentRole === "plant_user" || currentRole === "super_admin"
```

---

## 4. UI — Stage 8 card in "My Actions" (activeStage === 8)

The stage 8 card is a four-step ladder:

### Step A — Part Number Assignment (rnd_head / super_admin)

```
┌──────────────────────────────────────────────┐
│  Assign New Part Number                       │
│  ────────────────────                         │
│  [  Part Number  e.g. AMB-PT-2026-0012  ]     │
│  [  Assign & Notify Supplier  ]               │
│       ↑ disabled until field not empty        │
└──────────────────────────────────────────────┘
```

On submit: saves to `part_assignment_v1[npdId]`, sets `partAssigned = true`.

For non-rnd_head users: show read-only "Awaiting RND Head to assign part number."

### Step B — Supplier Delivery Request (any RND / sourcing role, once part assigned)

```
┌──────────────────────────────────────────────┐
│  ✓ Part Number: {assignedPartNumber}          │
│  ─────────────────────────────────────────── │
│  Request Delivery Details from Supplier       │
│                                               │
│  Delivery Date   [  date input  ]             │
│  Sample Qty      [  number input  ]           │
│  [  Submit Supplier Response  ]               │
│       ↑ disabled until both fields filled     │
└──────────────────────────────────────────────┘
```

On submit: saves to `plant_supplier_response_v1[npdId]`, sets `plantSupplierSubmitted = true`.

### Step C — Plant User Delivery Acceptance (plant_user / super_admin, once supplier responded)

```
┌──────────────────────────────────────────────┐
│  Supplier Delivery Details                    │
│  Delivery Date: {date}  ·  Qty: {qty} pcs    │
│                                               │
│  Accept Delivery                              │
│  [  drag-and-drop — PDF, PNG, JPG  ]          │
│  [  Confirm Receipt  ]  ← disabled until doc │
└──────────────────────────────────────────────┘
```

On submit: saves `{ docName, acceptedAt }` to `plant_acceptance_v1[npdId]`, sets `plantDeliveryAccepted = true`.

For non-plant_user: show read-only "Awaiting plant user to accept delivery."

### Step D — Plant User Testing Verdict (plant_user / super_admin, once accepted)

```
┌──────────────────────────────────────────────┐
│  ✓ Delivery Accepted: {docName}              │
│                                               │
│  Testing Verdict                              │
│  [  ✓ Accepted  ]   [  ✗ Not Good  ]         │
│  Remarks (optional): [textarea]               │
│  [  Submit Verdict  ]  ← disabled until      │
│                          a verdict is chosen  │
└──────────────────────────────────────────────┘
```

On submit:
- Updates `plant_acceptance_v1[npdId]` with `verdict` + `remarks`
- Sets `plantVerdict`
- If "not_good": appends `{ npdId, partNumber: assignedPartNumber, itemName: npd.itemName, rejectedAt: timestamp }` to `rejected_parts_v1` array
- If "accepted": advance stage to 9 (or mark complete if 8 is final) — for demo show a "NPD Complete" green banner and call `updateNPD({ stage: 9, stageName: "Completed" })` — no stage 9 in NPD_STAGES, so guard against overflow

**Completed state:** Green banner "Plant Delivery Accepted — Part Approved" (verdict === "accepted") or red "Part Not Good — Returned for Revision" (verdict === "not_good"). No further actions.

---

## 5. `demoAdvanceStage` update

For `activeStage === 7` → 8 (current RND approval):
- Already handled by `setTqrStatus("fully_approved")` + stage advance

For `activeStage === 8` → "complete":
- Auto-satisfy: assign a dummy part number, set supplier response, set plant acceptance + verdict "accepted"
- Then mark stage 9 / complete

---

## 6. Files Changed

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add 4 new localStorage key constants |
| `src/components/TopNav.tsx` | Add `plant_user` role to ROLE_GROUPS |
| `src/app/(internal)/npd/[id]/page.tsx` | Stage 8 state, useEffect, UI section |

---

## 7. Sub-project 3 dependency

Sub-project 3 (revision dropdown in new NPD form) reads from `rejected_parts_v1` written here. It is a separate spec.
