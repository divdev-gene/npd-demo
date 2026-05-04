# Supplier Quote Redesign & Cost Innovation Label

**Date:** 2026-04-29  
**Branch:** divyansh-NPD-demo

---

## Scope

Three discrete changes triggered after the bulk email enquiry is sent:

1. **Cost Innovation label** — R&D user role sees "Cost Innovation" instead of "PP Pre-Production Repeat" in the new-request wizard.
2. **Supplier quote form redesign** — Feasibility gate → simplified 2-field form → contact panel → drawing note.
3. **Vendor Quotations status** — Internal detail page reflects feasibility + new field values from the redesigned form.

---

## Change 1 — Cost Innovation Label (R&D User View)

**File:** `src/app/(internal)/npd/new/page.tsx`

- Read `poc_role` from localStorage on mount (same pattern used elsewhere in the app).
- When role is `rnd_user` or `rnd_head`:
  - WORK_TYPES PP card title → **"Cost Innovation"**
  - PP card desc → **"PP lot — production quantity for a cost-validated part."**
  - `WORK_TYPE_LABEL["PP"]` → **"Cost Innovation"** (used in Step 2 banner and Step 3 summary strip)
- All other roles see existing "PP Pre-Production Repeat" / "PP (Pre-Production) Repeat" labels unchanged.
- Role is read once in a `useEffect`; no new state beyond `const [role, setRole] = useState("")`.

---

## Change 2 — Supplier Quote Form Redesign

**File:** `src/app/supplier/quote/[id]/page.tsx`

### 2a — Feasibility Gate

New state: `feasible: "yes" | "no" | null` (default `null`).

Rendering logic:
- `feasible === null` → Gate screen only (no form, no contact panel)
- `feasible === "no"` → Not-feasible screen (polite close message)
- `feasible === "yes"` → Full form (contact panel + simplified fields + documents)

Gate screen content:
> **"Is this requirement feasible for you?"**  
> Sub-copy: *"Please review the item details above and let us know if you can fulfil this requirement."*  
> Two buttons: **Yes, I can fulfil this** (blue/primary) | **No, not feasible** (outline/secondary)

Not-feasible screen content:
> Thank-you card confirming the response has been logged; instructs supplier to close the tab.

### 2b — Simplified Form (feasible = yes)

Remove all 12 existing `SUPPLIER_FORM_DEFAULTS` questions from the rendered form. Show only:

| Field | Type | Required |
|-------|------|----------|
| Sample Quantity | number | yes |
| Supply Date | date | yes |

Submit button label: **"Submit Response"**

Form saves to `LIVE_QUOTATIONS_KEY` with:
```ts
{
  vendorName,
  status: "submitted",
  feasible: true,
  formValues: { sampleQty: "5", supplyDate: "2026-05-20" },
  submittedAt: today,
  revisionCount: prev ? prev.revisionCount + 1 : 1,
}
```

Not-feasible submit (clicking "No") saves:
```ts
{ vendorName, status: "submitted", feasible: false, formValues: {}, submittedAt: today, revisionCount: 1 }
```

### 2c — Contact Info Panel

Shown in a card above the form when `feasible === "yes"`.

Two sub-sections side by side:
- **R&D Contact** (who raised the NPD)
- **Sourcing SPOC** (assigned sourcing person)

Each shows: Name · Email · Phone

**Data source:** Static mock maps in `mockData.ts` behind typed interfaces:

```ts
export type ContactInfo = { name: string; email: string; phone: string }

// Keyed by SPOC name string (as stored in NPDRecord.spoc)
export const SPOC_CONTACTS: Record<string, ContactInfo> = { ... }

// Default R&D contact used for all NPDs (replace with DB lookup when live)
export const DEFAULT_RND_CONTACT: ContactInfo = { ... }
```

**Replacement path when going live:** swap `DEFAULT_RND_CONTACT` lookup for `fetchRndContact(npd.raisedById)` and `SPOC_CONTACTS[npd.spoc]` for `fetchSpocContact(npd.spocId)`. Type stays the same; only the data source changes.

### 2d — Drawing Note

In the Technical Documents card, below the Drive link row, add:

> *"Please save this document and study the attached drawing before filling the form."*

Shown only when `npd.driveLink` exists (same condition as the link itself).

---

## Change 3 — Vendor Quotations Status Update

**File:** `src/lib/mockData.ts` — extend `LiveQuotation` type:
```ts
export type LiveQuotation = {
  ...existing fields...
  feasible?: boolean   // undefined = legacy record (treat as feasible)
}
```

**File:** `src/app/(internal)/npd/[id]/page.tsx`

Display logic in vendor quotation cards:

- If `live?.feasible === false`:
  - Show red **"Not Feasible"** badge in card header (replaces Submitted/Pending badge)
  - Hide all cost/date/MOQ rows (they are empty anyway)
  - Card gets `border-red-200 bg-red-50/20` styling

- If `live?.feasible === true` or `live` is a legacy record:
  - `samplesVal` resolves from `live.formValues.sampleQty` → fallback `live.formValues.q2` → fallback `v.sampleQty`
  - `dispatchVal` resolves from `live.formValues.supplyDate` → fallback `live.formValues.q1` → fallback `v.dispatchDate`
  - All other fields (unit cost, MOQ, etc.) fall back to mock `VendorQuotation` values as today

Summary strip:
- "Awaiting Response" count: `pending` status vendors + `re_negotiation` vendors (unchanged)
- "Not Feasible" vendors are counted under "Quotations Received" (they responded; they just can't fulfil)

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add `ContactInfo` type, `SPOC_CONTACTS`, `DEFAULT_RND_CONTACT`, extend `LiveQuotation.feasible` |
| `src/app/(internal)/npd/new/page.tsx` | Role-aware PP label |
| `src/app/supplier/quote/[id]/page.tsx` | Full redesign: feasibility gate, 2-field form, contact panel, drawing note |
| `src/app/(internal)/npd/[id]/page.tsx` | Vendor quotation card: feasibility badge, new field key fallback chain |

---

## Constraints

- No DB calls; all mock data stays in `mockData.ts`.
- `ContactInfo` type and lookup keys must be a clean seam — documented as "replace with API call" when going live.
- Existing mock `VendorQuotation` records (q1/q2 keys) must continue to render correctly.
- TypeScript strict mode — `npx tsc --noEmit` must pass.
