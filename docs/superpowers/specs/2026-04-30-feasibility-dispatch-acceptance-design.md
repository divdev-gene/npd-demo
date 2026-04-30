# Feasibility Denial Thread, Dispatch Status Card & RND Delivery Acceptance — Design Spec

**Date:** 2026-04-30
**Branch:** divyansh-NPD-demo

---

## Goal

Three connected enhancements to the NPD detail page that close the supplier interaction loop:

1. When a supplier denies feasibility and raises a query, surface it in the RND user's Sourcing Status section and let RND reply with a comment + optional doc.
2. When a supplier is locked, show a read-only dispatch status card in the Sourcing section that reflects data the supplier submits via the dispatch portal.
3. In Stage 5 (RND Evaluation), show the supplier's dispatch form data as context and require RND to upload a proof-of-delivery document before advancing to testing.

---

## 1. Data Layer

### 1a. Feasibility Denial Reply — extend `live_quotations_v1`

The supplier's query is already stored in `liveQuotes[npdId][vendorName].query` (written by `/supplier/quote/[id]/page.tsx` when `feasible: false`).

Add two new optional fields to the `LiveQuotation` type:

```ts
rndReply?: string       // RND's text comment in response to the query
rndReplyDoc?: string    // filename of optional uploaded doc (simulated)
```

Written back to `live_quotations_v1` from the NPD detail page when RND submits a reply.

### 1b. Dispatch Status — existing `supplier_dispatch_submitted_v1`

No schema changes. Already written by `/supplier/dispatch/[id]/page.tsx`:

```ts
{
  [npdId]: {
    vendorName: string
    dispatchDate: string
    docs: string[]          // compliance doc filenames
    submittedAt: string
  }
}
```

Read in `page.tsx` useEffect alongside other localStorage keys.

### 1c. Delivery Acceptance — new `delivery_acceptance_v1`

```ts
{
  [npdId]: {
    docName: string         // filename of uploaded POD document
    acceptedAt: string      // ISO timestamp of rnd_user confirmation
    headApproved: boolean   // true once rnd_head approves — triggers stage advance
  }
}
```

Written in two steps from `page.tsx`: `headApproved: false` when RND user confirms receipt; updated to `true` when RND Head approves.

---

## 2. State Added to `page.tsx`

```ts
// Feasibility replies (extends liveQuotes — re-uses same liveQuotes state, no new state var)
// Input state for the reply form:
const [queryReplyText, setQueryReplyText]   = useState<Record<string, string>>({})  // keyed by vendorName
const [queryReplyDoc,  setQueryReplyDoc]    = useState<Record<string, string>>({})  // keyed by vendorName

// Dispatch info
const [dispatchInfo, setDispatchInfo] = useState<{
  vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string
} | null>(null)

// Delivery acceptance — two-step: rnd_user uploads POD, then rnd_head approves
const [deliveryDoc,           setDeliveryDoc]           = useState("")      // filename of uploaded POD
const [deliverySubmitted,     setDeliverySubmitted]     = useState(false)   // rnd_user confirmed receipt
const [deliveryHeadApproved,  setDeliveryHeadApproved]  = useState(false)   // rnd_head approved → advance stage
```

### useEffect additions

```ts
// Load dispatch info
const rawDispatch = localStorage.getItem("supplier_dispatch_submitted_v1")
const allDispatch = rawDispatch ? JSON.parse(rawDispatch) : {}
setDispatchInfo(allDispatch[npdId] ?? null)

// Load delivery acceptance
const rawAcceptance = localStorage.getItem("delivery_acceptance_v1")
const allAcceptance = rawAcceptance ? JSON.parse(rawAcceptance) : {}
if (allAcceptance[npdId]) {
  setDeliveryDoc(allAcceptance[npdId].docName)
  setDeliverySubmitted(true)
  if (allAcceptance[npdId].headApproved) setDeliveryHeadApproved(true)
}
```

---

## 3. UI Changes

### 3a. RND View — Sourcing Status card (Section 2, shown at `activeStage >= 3`)

Below the existing 4-chip grid, add a **Vendor Queries** block — only rendered when at least one vendor in `liveQuotes` has `feasible === false && query`.

For each such vendor, render one row:

**Unresolved (no `rndReply` yet):**
```
┌─────────────────────────────────────────────────┐
│ ⚠  {vendorName} — Feasibility Denied            │
│    Query: "{query text}"                         │
├─────────────────────────────────────────────────┤
│  [Textarea: "Reply to this query..."] (required) │
│  [Upload doc (optional)]  doc name if uploaded   │
│  [Send Reply]  (disabled until comment filled)   │
└─────────────────────────────────────────────────┘
```
Background: amber-50, border: amber-200.

**Resolved (`rndReply` present):**
```
┌─────────────────────────────────────────────────┐
│ ✓  {vendorName} — Query Resolved                 │
│    Query: "{query}"                              │
│    Reply: "{rndReply}"   📎 {rndReplyDoc}        │
└─────────────────────────────────────────────────┘
```
Background: emerald-50, border: emerald-200. No edit after submit.

**Submit handler:** saves `rndReply` + `rndReplyDoc` into `liveQuotes[npdId][vendorName]` and persists to `live_quotations_v1`.

---

### 3b. Sourcing View — Section 2: Supplier Dispatch (shown at `activeStage >= 4`)

When `npd.supplier` is locked (not "Pending Assignment"), replace the current dispatch card with a two-state card:

**State 1 — Not yet submitted (`dispatchInfo === null`):**
```
┌─────────────────────────────────────────────────┐
│  Supplier Dispatch                               │
│  ─────────────────                               │
│  ⏳ Awaiting dispatch submission from            │
│     {npd.supplier}                               │
│                                                  │
│  Share the dispatch portal link with them:       │
│  [  dispatch portal URL  ] [Copy] [↗]            │
│                                                  │
│  ── or ──                                        │
│  [Mark Dispatched & Advance to RND Evaluation]   │
└─────────────────────────────────────────────────┘
```

**State 2 — Submitted (`dispatchInfo !== null`):**
```
┌─────────────────────────────────────────────────┐
│  Supplier Dispatch          ✓ Dispatched         │
│  ─────────────────                               │
│  Supplier:   {dispatchInfo.vendorName}           │
│  Dispatch Date:  {dispatchInfo.dispatchDate}     │
│  Submitted:  {dispatchInfo.submittedAt}          │
│                                                  │
│  Compliance Docs ({count}):                      │
│    • {doc1}                                      │
│    • {doc2}  …                                   │
│                                                  │
│  Status:  [Dispatched — Pending RND Acceptance]  │
└─────────────────────────────────────────────────┘
```
Status badge: amber background when `deliveryAccepted === false`, emerald when `true`.

The "Mark Dispatched" manual button remains below in both states as a fallback.

---

### 3c. RND View — My Actions → Stage 5 card (`activeStage === 5`)

Replace the existing plain upload widget with two parts:

**Part 1 — Dispatch context strip (read-only):**

If `dispatchInfo !== null`:
```
┌─────────────────────────────────────────────────┐
│  Dispatch Details (from supplier portal)         │
│  Supplier: {vendorName}  ·  Date: {dispatchDate} │
│  Docs: {count} compliance documents submitted    │
│  ▾ View docs   →  expandable list of doc names   │
└─────────────────────────────────────────────────┘
```
Background: blue-50, border: blue-200.

If `dispatchInfo === null`:
- Show muted note: "Dispatch details not submitted via portal. You can still accept below."

**Part 2 — Delivery acceptance upload (two-step):**

**Step A — RND User (any `rnd_*` role):**
```
Upload proof of delivery / delivery receipt
[  drag-and-drop zone — PDF, PNG, JPG  ]

[Confirm Receipt — Send for RND Head Approval]   ← disabled until doc attached
```

On click:
1. Saves `{ docName, acceptedAt, headApproved: false }` to `delivery_acceptance_v1[npdId]`
2. Sets `deliverySubmitted = true`
3. Does NOT advance stage — shows "Awaiting RND Head Approval" status badge (amber)

**Step B — RND Head (`rnd_head` or `super_admin`) — shown when `deliverySubmitted === true`:**
```
┌────────────────────────────────────────────────┐
│  ✓ RND User confirmed receipt                  │
│    POD: {docName}                              │
│                                                │
│  [Approve & Advance to RND Testing]            │  ← rnd_head/super_admin only
└────────────────────────────────────────────────┘
```

On Approve click:
1. Updates `delivery_acceptance_v1[npdId].headApproved = true`
2. Sets `deliveryHeadApproved = true`
3. Advances `activeStage` to 6, calls `updateNPD({ stage: 6, stageName: NPD_STAGES[5] })`

**After both steps complete:** card shows completed state with green "Receipt Accepted & Approved" badge.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `src/app/(internal)/npd/[id]/page.tsx` | Add state vars, useEffect reads, all three UI sections |

No changes to supplier portal pages — they already write the required data.

---

## 5. Unchanged Behaviour

- The supplier quote portal (`/supplier/quote/[id]`) is unchanged — query already saved to `liveQuotes`.
- The supplier dispatch portal (`/supplier/dispatch/[id]`) is unchanged — dispatch data already saved to `supplier_dispatch_submitted_v1`.
- `defenceAdvanced` state and the "Mark Dispatched" manual button remain as a fallback for cases where the supplier does not use the portal.
- Stage advancement logic for all other stages is unchanged.
