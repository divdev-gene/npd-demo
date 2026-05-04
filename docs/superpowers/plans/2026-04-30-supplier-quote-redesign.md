# Supplier Quote Redesign & Cost Innovation Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the supplier enquiry form with a feasibility gate and two-field response, add a contact info panel, rename PP to "Cost Innovation" for R&D users, and surface feasibility status in the internal Vendor Quotations tab.

**Architecture:** All data stays in localStorage + mockData.ts. A new `ContactInfo` type + two exported constants (`SPOC_CONTACTS`, `DEFAULT_RND_CONTACT`) act as the seam that a DB layer will later replace. The supplier quote page is rebuilt around a `feasible` state machine (`null → "yes" | "no"`). The internal detail page adds a fallback key chain so old mock records and new live records both render correctly.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, localStorage, lucide-react

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/mockData.ts` | Modify | Add `ContactInfo` type, `SPOC_CONTACTS`, `DEFAULT_RND_CONTACT`; add `feasible?: boolean` to `LiveQuotation` |
| `src/app/(internal)/npd/new/page.tsx` | Modify | Role-aware PP label ("Cost Innovation" for rnd_user/rnd_head) |
| `src/app/supplier/quote/[id]/page.tsx` | Modify | Feasibility gate, 2-field form, contact panel, drawing note |
| `src/app/(internal)/npd/[id]/page.tsx` | Modify | Feasibility badge in vendor quotation cards; new key fallback chain in `displayQuotations` |

---

## Task 1: Add contact types and mock data to mockData.ts

**Files:**
- Modify: `src/lib/mockData.ts` (after the `LiveQuotation` type, ~line 203)

- [ ] **Step 1: Add `ContactInfo` type and mock constants**

Open `src/lib/mockData.ts`. After the closing `};` of the `LiveQuotation` type (around line 203), add:

```ts
export type ContactInfo = {
  name:  string;
  email: string;
  phone: string;
};

// Replace with fetchSpocContact(spocId) when connecting to DB
export const SPOC_CONTACTS: Record<string, ContactInfo> = {
  "Rahul Sharma": { name: "Rahul Sharma",  email: "rahul.sharma@amber.com",  phone: "+91 98100 11223" },
  "Karan Mehta":  { name: "Karan Mehta",   email: "karan.mehta@amber.com",   phone: "+91 98100 44556" },
  "Priya Rajan":  { name: "Priya Rajan",   email: "priya.rajan@amber.com",   phone: "+91 98100 77889" },
  "Amit Kumar":   { name: "Amit Kumar",    email: "amit.kumar@amber.com",    phone: "+91 98100 22334" },
  "Varun Joshi":  { name: "Varun Joshi",   email: "varun.joshi@amber.com",   phone: "+91 98100 55667" },
};

// Replace with fetchRndContact(raisedById) when connecting to DB
export const DEFAULT_RND_CONTACT: ContactInfo = {
  name:  "Ankit Verma",
  email: "ankit.verma@amber.com",
  phone: "+91 98100 99001",
};
```

- [ ] **Step 2: Add `feasible` field to `LiveQuotation` type**

In `src/lib/mockData.ts`, find the `LiveQuotation` type (line ~195). Add `feasible?: boolean` after `revisionCount`:

```ts
export type LiveQuotation = {
  vendorName:         string;
  status:             "submitted" | "re_negotiation";
  formValues:         Record<string, string>;
  submittedAt:        string;
  revisionCount:      number;
  feasible?:          boolean;   // undefined = legacy record; treat as feasible
  reNegotiationMsg?:  string;
  reNegotiationAt?:   string;
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module
npx tsc --noEmit
```

Expected: no errors (the new optional field is backward-compatible).

---

## Task 2: Cost Innovation label in the new-request wizard

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx`

- [ ] **Step 1: Add role state**

In `src/app/(internal)/npd/new/page.tsx`, find the existing state declarations (around line 68). Add:

```ts
const [pocRole, setPocRole] = useState("")

useEffect(() => {
  setPocRole(localStorage.getItem("poc_role") ?? "")
}, [])
```

- [ ] **Step 2: Derive isRndUser flag and cost-innovation label**

Immediately below the `pocRole` state, add:

```ts
const isRndUser = pocRole === "rnd_user" || pocRole === "rnd_head"
```

- [ ] **Step 3: Apply label to WORK_TYPES card**

In the JSX, find where `{type.title}` and `{type.desc}` are rendered for the work-type selection cards (the `WORK_TYPES.map(...)` block). Replace the rendered text so the PP entry shows the alternate label:

```tsx
<span className="font-bold text-slate-900">
  {type.id === "PP" && isRndUser ? "Cost Innovation" : type.title}
</span>
<p className="text-xs text-slate-500 mt-0.5">
  {type.id === "PP" && isRndUser
    ? "PP lot — production quantity for a cost-validated part."
    : type.desc}
</p>
```

- [ ] **Step 4: Apply label to Step 2 banner and Step 3 summary strip**

Find the Step 2 banner where `selectedType?.title` is rendered (around line 200–220). Wrap it:

```tsx
<span className="font-semibold text-slate-800">
  {selectedType?.id === "PP" && isRndUser ? "Cost Innovation" : selectedType?.title} — Rajpura RAC
</span>
```

Find the `WORK_TYPE_LABEL` usage in the Step 3 summary strip (the review step). The label is used via `WORK_TYPE_LABEL[typeOfWork]`. Add a derived value just before the JSX return:

```ts
const displayWorkTypeLabel =
  typeOfWork === "PP" && isRndUser ? "Cost Innovation" : (WORK_TYPE_LABEL[typeOfWork] ?? typeOfWork)
```

Then replace every use of `WORK_TYPE_LABEL[typeOfWork]` in the JSX with `{displayWorkTypeLabel}`.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 3: Supplier quote form — feasibility gate + simplified form

**Files:**
- Modify: `src/app/supplier/quote/[id]/page.tsx`

This task replaces the existing complex form with a three-screen state machine.

- [ ] **Step 1: Add imports**

At the top of `src/app/supplier/quote/[id]/page.tsx`, add to the existing lucide-react import line:

```ts
import {
  CheckCircle2, FileText, ExternalLink, UserCircle,
  Clock, AlertTriangle, CheckCircle, AlertCircle, RotateCcw,
  Phone, Mail, XCircle,
} from "lucide-react"
```

Also add to the mockData imports:

```ts
import {
  mockNPDs, LIVE_QUOTATIONS_KEY,
  type NPDRecord, type LiveQuotation,
  SPOC_CONTACTS, DEFAULT_RND_CONTACT, type ContactInfo,
} from "@/lib/mockData"
```

(Remove `SUPPLIER_FORM_DEFAULTS, SUPPLIER_FORM_KEY, SUPPLIER_DOCS_KEY, type FormQuestion, type SupplierDoc` — they are no longer needed in this page.)

- [ ] **Step 2: Replace state declarations**

Replace all existing `useState` declarations with:

```ts
const [npd,        setNpd]       = useState<NPDRecord | null>(null)
const [vendorName, setVendorName]= useState<string>("")
const [feasible,   setFeasible]  = useState<"yes" | "no" | null>(null)
const [sampleQty,  setSampleQty] = useState("")
const [supplyDate, setSupplyDate]= useState("")
const [submitted,  setSubmitted] = useState(false)
const validUntil = getValidUntil(10)
```

- [ ] **Step 3: Simplify useEffect**

Replace the existing `useEffect` with:

```ts
useEffect(() => {
  const qp     = new URLSearchParams(window.location.search)
  const vendor = qp.get("vendor") ?? ""
  setVendorName(vendor)

  const stored  = localStorage.getItem("npd_records_v1")
  const records: NPDRecord[] = stored ? JSON.parse(stored) : mockNPDs
  const found   = records.find(n => n.id === npdId)
    ?? mockNPDs.find(n => n.id === npdId)
    ?? mockNPDs[0]
  setNpd(found)

  // Pre-fill supply date to 7 days from now
  const d = new Date(); d.setDate(d.getDate() + 7)
  setSupplyDate(d.toISOString().split("T")[0])
}, [npdId])
```

- [ ] **Step 4: Replace handleSubmit**

Replace the existing `handleSubmit` with two handlers:

```ts
const handleNotFeasible = () => {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const raw  = localStorage.getItem(LIVE_QUOTATIONS_KEY)
  const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
  if (!all[npdId]) all[npdId] = {}
  all[npdId][vendorName] = {
    vendorName,
    status:        "submitted",
    feasible:      false,
    formValues:    {},
    submittedAt:   today,
    revisionCount: all[npdId][vendorName] ? all[npdId][vendorName].revisionCount + 1 : 1,
  }
  localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
  setFeasible("no")
}

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const raw  = localStorage.getItem(LIVE_QUOTATIONS_KEY)
  const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
  if (!all[npdId]) all[npdId] = {}
  const prev = all[npdId][vendorName]
  all[npdId][vendorName] = {
    vendorName,
    status:        "submitted",
    feasible:      true,
    formValues:    { sampleQty, supplyDate },
    submittedAt:   today,
    revisionCount: prev ? prev.revisionCount + 1 : 1,
  }
  localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
  setSubmitted(true)
}
```

- [ ] **Step 5: Replace the full JSX return**

Replace everything from `if (!npd) { return ...}` down through the closing `}` with the following. This is the complete new render output:

```tsx
if (!npd) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading…</p>
    </div>
  )
}

// Not-feasible screen
if (feasible === "no") {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Response Recorded</h2>
        <p className="text-slate-500 text-sm">
          Thank you for letting us know. Your response for <strong>{npd.id}</strong> has been
          logged. The Sourcing SPOC will follow up if needed.
        </p>
        <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
      </div>
    </div>
  )
}

// Submitted screen
if (submitted) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center py-14 px-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Response Submitted</h2>
        <p className="text-slate-500 text-sm">
          {vendorName && <><strong>{vendorName}</strong>'s </>}
          response for <strong>{npd.id}</strong> has been registered. The Sourcing SPOC will review and follow up.
        </p>
        <p className="text-xs text-slate-400 mt-4">You may close this window.</p>
      </div>
    </div>
  )
}

const spocContact: ContactInfo = SPOC_CONTACTS[npd.spoc] ?? { name: npd.spoc, email: "—", phone: "—" }
const rndContact: ContactInfo  = DEFAULT_RND_CONTACT

return (
  <div className="min-h-screen bg-slate-50">
    {/* Header */}
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
          <div className="h-5 w-px bg-slate-200" />
          <span className="text-sm font-bold text-slate-700">Supplier Enquiry Portal</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          <Clock className="w-3.5 h-3.5" />
          Valid until {validUntil}
        </div>
      </div>
    </header>

    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* NPD Hero */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full mb-3">
          {npd.id}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{npd.itemName}</h1>
        <p className="text-sm text-slate-500">{npd.itemCategory} · {npd.productLine}</p>
        {vendorName && (
          <p className="text-sm font-semibold text-blue-900 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 inline-block">
            Enquiry sent to: {vendorName}
          </p>
        )}
      </div>

      {/* Feasibility gate */}
      {feasible === null && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
          <h2 className="text-xl font-bold text-slate-900">Is this requirement feasible for you?</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Please review the item details above and let us know if you can fulfil this requirement.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setFeasible("yes")}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl px-8 py-3 transition-colors"
            >
              Yes, I can fulfil this
            </button>
            <button
              onClick={handleNotFeasible}
              className="border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl px-8 py-3 transition-colors"
            >
              No, not feasible
            </button>
          </div>
        </div>
      )}

      {/* Contact info panel (shown after feasibility confirmed) */}
      {feasible === "yes" && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Points of Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* R&D Contact */}
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <UserCircle className="w-6 h-6 text-violet-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">R&amp;D — Request Owner</p>
                  <p className="text-sm font-bold text-slate-800">{rndContact.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 shrink-0" />{rndContact.email}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />{rndContact.phone}
                  </p>
                </div>
              </div>
              {/* Sourcing SPOC */}
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <UserCircle className="w-6 h-6 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sourcing SPOC</p>
                  <p className="text-sm font-bold text-slate-800">{spocContact.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 shrink-0" />{spocContact.email}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />{spocContact.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Technical Documents</h2>
            {npd.driveLink ? (
              <>
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-700 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Drawing / Spec Sheet Folder</p>
                      <p className="text-xs text-blue-600 truncate max-w-xs">{npd.driveLink}</p>
                    </div>
                  </div>
                  <a
                    href={npd.driveLink} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-blue-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Drive
                  </a>
                </div>
                <p className="text-xs text-slate-500 italic pl-1">
                  Please save this document and study the attached drawing before filling the form.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-400 italic">
                <AlertTriangle className="w-4 h-4" /> No drawing link attached. Contact the SPOC.
              </div>
            )}
          </div>

          {/* Simplified form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">Your Response</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Sample Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min={1} required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 max-w-xs"
                  value={sampleQty}
                  onChange={e => setSampleQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Supply Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date" required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 max-w-xs"
                  value={supplyDate}
                  onChange={e => setSupplyDate(e.target.value)}
                />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl px-6 py-3 transition-colors"
                >
                  Submit Response
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  </div>
)
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 4: Internal detail page — feasibility badge + new key fallback

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

- [ ] **Step 1: Update `displayQuotations` mapping to handle new form keys**

Find the `displayQuotations` declaration (around line 397). It currently reads `lq.formValues.q1`, `lq.formValues.q2`, etc. Replace the `.map(lq => ...)` body with a version that falls back to new keys first:

```ts
const displayQuotations: VendorQuotation[] = [
  ...vendorQuotations,
  ...Object.values(liveQuotes)
    .filter(lq => !vendorQuotations.find(vq => vq.vendorName === lq.vendorName))
    .map(lq => ({
      vendorName:   lq.vendorName,
      tier:         "—",
      status:       "submitted" as const,
      unitCost:     parseFloat(lq.formValues.q3 || "") || null,
      toolingCost:  parseFloat(lq.formValues.q4 || "") || null,
      dispatchDate: lq.formValues.supplyDate || lq.formValues.q1 || null,
      sampleQty:    parseInt(lq.formValues.sampleQty || lq.formValues.q2 || "") || null,
      moq:          parseInt(lq.formValues.q9 || "") || null,
      paymentTerms: lq.formValues.q10 || null,
      leadTimeDays: parseInt(lq.formValues.q11 || "") || null,
      submittedAt:  lq.submittedAt,
    })),
]
```

- [ ] **Step 2: Update per-card value resolution for new key fallback**

Find the section inside the `displayQuotations.map(v => {` block (around line 1365) where `dispatchVal` and `samplesVal` are derived:

```ts
const dispatchVal  = live ? (live.formValues.supplyDate || live.formValues.q1 || v.dispatchDate) : v.dispatchDate
const samplesVal   = live ? (parseInt(live.formValues.sampleQty || live.formValues.q2 || "") || null) : v.sampleQty
```

Replace the existing two lines with the above.

- [ ] **Step 3: Add `isFeasible` and `isNotFeasible` flags inside the card map**

Immediately after the `const isBeingRenegotiated` line (around line 1382), add:

```ts
const isNotFeasible = live?.feasible === false
```

- [ ] **Step 4: Add "Not Feasible" badge to the status badge section**

In the card header's status badge block (the chain of `approval === "approved" ?  ... : approval === "rejected" ? ...`), add a `isNotFeasible` check at the top:

```tsx
{/* Status badge */}
{isNotFeasible ? (
  <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
    <XCircle className="w-3.5 h-3.5" /> Not Feasible
  </span>
) : approval === "approved" ? (
  // ... rest of existing badge chain unchanged
```

- [ ] **Step 5: Gate quoted-values grid on feasibility**

Find `{(isSubmitted || isReNegotiating) ? (` (around line 1437). Change the condition to:

```tsx
{(isSubmitted || isReNegotiating) && !isNotFeasible ? (
```

This hides the cost/date/MOQ grid entirely for not-feasible vendors.

- [ ] **Step 6: Add card border style for not-feasible**

Find the Card className chain (around line 1385):

```tsx
<Card key={v.vendorName} className={`border ${
  approval === "approved" ? "border-emerald-200 bg-emerald-50/30" :
  approval === "rejected" ? "border-red-200 bg-red-50/20 opacity-60" :
  isReNegotiating ? "border-amber-200 bg-amber-50/20" :
  isSubmitted ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50/50"
}`}>
```

Add `isNotFeasible` at the top of that chain:

```tsx
<Card key={v.vendorName} className={`border ${
  isNotFeasible    ? "border-red-200 bg-red-50/20" :
  approval === "approved" ? "border-emerald-200 bg-emerald-50/30" :
  approval === "rejected" ? "border-red-200 bg-red-50/20 opacity-60" :
  isReNegotiating ? "border-amber-200 bg-amber-50/20" :
  isSubmitted ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50/50"
}`}>
```

- [ ] **Step 7: Make sure `XCircle` is in the import list**

In `src/app/(internal)/npd/[id]/page.tsx`, find the lucide-react import block and verify `XCircle` is present. It should already be there (used for rejection badge); if not, add it.

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 5: End-to-end smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test Change 1 — Cost Innovation label**

1. Open `http://localhost:3000`
2. Ensure role switcher is set to `rnd_user` (or check localStorage `poc_role`)
3. Navigate to New Request wizard
4. Step 1: PP card should show **"Cost Innovation"** with subtext *"PP lot — production quantity for a cost-validated part."*
5. Select it, go to Step 2 banner: should show **"Cost Innovation — Rajpura RAC"**
6. Go to Step 3: summary strip should show **"Cost Innovation"**
7. Switch role to `spoc_user` / refresh → PP card should revert to **"PP Pre-Production Repeat"**

- [ ] **Step 3: Test Change 2 — Supplier feasibility gate (No path)**

1. Open `http://localhost:3000/supplier/quote/NPD-FY-2026-0012?vendor=Tubetech+India+Pvt+Ltd`
2. Should see the NPD hero and the feasibility gate ("Is this requirement feasible for you?")
3. Click **"No, not feasible"**
4. Should see the "Response Recorded" screen
5. Open internal page for NPD-FY-2026-0012 → Vendor Quotations tab
6. Tubetech row should show **"Not Feasible"** red badge and no cost grid

- [ ] **Step 4: Test Change 2 — Supplier feasibility gate (Yes path)**

1. Clear `live_quotations_v1` from localStorage (or use a different NPD)
2. Open `/supplier/quote/NPD-FY-2026-0014?vendor=Synapse+Electronics+Pvt+Ltd`
3. Click **"Yes, I can fulfil this"**
4. Contact panel should appear with R&D and SPOC details (Ankit Verma + Priya Rajan)
5. Drawing note should appear beneath the Drive link row
6. Only two fields visible: Sample Quantity + Supply Date
7. Fill in values and click **"Submit Response"**
8. Should see "Response Submitted" screen

- [ ] **Step 5: Test Change 3 — Vendor Quotations updated**

1. Open internal NPD-FY-2026-0014 → Vendor Quotations tab
2. Synapse Electronics row should show "Pending Review" badge with Sample Qty and Supply Date populated from the values you entered
3. No unit cost / MOQ / payment terms rows visible (since the new form doesn't collect them)
4. Existing mock records (Tubetech, Alpha, etc.) should still render all their cost fields correctly
