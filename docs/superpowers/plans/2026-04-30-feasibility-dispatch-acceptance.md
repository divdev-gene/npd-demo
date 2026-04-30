# Feasibility Denial Thread, Dispatch Status & RND Delivery Acceptance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface supplier feasibility denials to RND with a reply thread, show read-only supplier dispatch data in the Sourcing section, and add a two-step RND delivery acceptance flow (RND user uploads POD → RND Head approves → advance to stage 6).

**Architecture:** All changes are in one file (`page.tsx`) plus a type extension in `mockData.ts`. New state vars read from two new localStorage keys (`supplier_dispatch_submitted_v1`, `delivery_acceptance_v1`). Feasibility reply data extends the existing `live_quotations_v1` key via two new optional fields on `LiveQuotation`. No new components — all UI is inline JSX.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react

---

## File Map

| File | Change |
|------|--------|
| `src/lib/mockData.ts` | Add `rndReply?` and `rndReplyDoc?` to `LiveQuotation` type |
| `src/app/(internal)/npd/[id]/page.tsx` | Add state vars, handlers, useEffect reads, three UI sections |

---

## Task 1 — Extend `LiveQuotation` type and add new state + handlers

**Files:**
- Modify: `src/lib/mockData.ts` (line 195–205)
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (lines 137–233)

### Steps

- [ ] **Step 1: Add `rndReply` and `rndReplyDoc` to `LiveQuotation`**

In `src/lib/mockData.ts`, find the `LiveQuotation` type (line 195). Add two fields after `reNegotiationAt?`:

```ts
export type LiveQuotation = {
  vendorName:         string;
  status:             "submitted" | "re_negotiation";
  formValues:         Record<string, string>;
  submittedAt:        string;
  revisionCount:      number;
  feasible?:          boolean;
  query?:             string;
  reNegotiationMsg?:  string;
  reNegotiationAt?:   string;
  rndReply?:          string;    // RND's text reply to a feasibility denial query
  rndReplyDoc?:       string;    // optional uploaded doc filename
};
```

- [ ] **Step 2: Add new state variables to `page.tsx`**

In `src/app/(internal)/npd/[id]/page.tsx`, after line 140 (`const [fpaImageUploaded, setFpaImageUploaded] = useState(false)`), insert:

```ts
  // ── Query reply form (keyed by vendorName) ──────────────────────────────
  const [queryReplyText, setQueryReplyText] = useState<Record<string, string>>({})
  const [queryReplyDoc,  setQueryReplyDoc]  = useState<Record<string, string>>({})

  // ── Dispatch info from supplier portal ──────────────────────────────────
  const [dispatchInfo, setDispatchInfo] = useState<{
    vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string
  } | null>(null)

  // ── Delivery acceptance (two-step: user submits, head approves) ──────────
  const [deliveryDoc,          setDeliveryDoc]          = useState("")
  const [deliverySubmitted,    setDeliverySubmitted]    = useState(false)
  const [deliveryHeadApproved, setDeliveryHeadApproved] = useState(false)
```

- [ ] **Step 3: Load dispatch info and delivery acceptance in `useEffect`**

In `src/app/(internal)/npd/[id]/page.tsx`, after line 215 (after the `setDateApprovals` call inside `useEffect`), insert:

```ts
    // Dispatch info from supplier portal
    const rawDispatch = localStorage.getItem("supplier_dispatch_submitted_v1")
    const allDispatch: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> = rawDispatch ? JSON.parse(rawDispatch) : {}
    setDispatchInfo(allDispatch[npdId] ?? null)

    // Delivery acceptance (two-step)
    const rawAcceptance = localStorage.getItem("delivery_acceptance_v1")
    const allAcceptance: Record<string, { docName: string; acceptedAt: string; headApproved: boolean }> = rawAcceptance ? JSON.parse(rawAcceptance) : {}
    if (allAcceptance[npdId]) {
      setDeliveryDoc(allAcceptance[npdId].docName)
      setDeliverySubmitted(true)
      if (allAcceptance[npdId].headApproved) setDeliveryHeadApproved(true)
    }
```

- [ ] **Step 4: Add `supplier_dispatch_submitted_v1` to `refreshLiveData` and the storage event listener**

Find the `refreshLiveData` function (line ~149). Add these two lines at the end of the function body, before the closing `}`:

```ts
    const rawDispatch = localStorage.getItem("supplier_dispatch_submitted_v1")
    const allDispatch: Record<string, { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string }> = rawDispatch ? JSON.parse(rawDispatch) : {}
    setDispatchInfo(allDispatch[npdId] ?? null)
```

Then find the storage event listener condition (line ~219):
```ts
    if (e.key === LIVE_QUOTATIONS_KEY || e.key === SUPPLIER_DOCS_KEY || e.key === VENDOR_STATUS_KEY) refreshLiveData()
```
Add `"supplier_dispatch_submitted_v1"` to the check:
```ts
    if (e.key === LIVE_QUOTATIONS_KEY || e.key === SUPPLIER_DOCS_KEY || e.key === VENDOR_STATUS_KEY || e.key === "supplier_dispatch_submitted_v1") refreshLiveData()
```

- [ ] **Step 5: Add `submitQueryReply` handler**

After the `setVendorApproval` function (line ~370), insert:

```ts
  const submitQueryReply = (vendorName: string) => {
    const reply = queryReplyText[vendorName]?.trim()
    if (!reply) return
    const raw = localStorage.getItem(LIVE_QUOTATIONS_KEY)
    const all: Record<string, Record<string, LiveQuotation>> = raw ? JSON.parse(raw) : {}
    const prev = all[npdId]?.[vendorName]
    if (!prev) return
    const updated: LiveQuotation = {
      ...prev,
      rndReply: reply,
      ...(queryReplyDoc[vendorName] ? { rndReplyDoc: queryReplyDoc[vendorName] } : {}),
    }
    if (!all[npdId]) all[npdId] = {}
    all[npdId][vendorName] = updated
    localStorage.setItem(LIVE_QUOTATIONS_KEY, JSON.stringify(all))
    setLiveQuotes(prev => ({ ...prev, [vendorName]: updated }))
  }
```

- [ ] **Step 6: Add `submitDelivery` and `approveDelivery` handlers**

After `submitQueryReply`, insert:

```ts
  const submitDelivery = () => {
    const acceptance = { docName: deliveryDoc, acceptedAt: new Date().toLocaleString("en-IN"), headApproved: false }
    const raw = localStorage.getItem("delivery_acceptance_v1")
    const all: Record<string, typeof acceptance> = raw ? JSON.parse(raw) : {}
    all[npdId] = acceptance
    localStorage.setItem("delivery_acceptance_v1", JSON.stringify(all))
    setDeliverySubmitted(true)
  }

  const approveDelivery = () => {
    const raw = localStorage.getItem("delivery_acceptance_v1")
    const all: Record<string, { docName: string; acceptedAt: string; headApproved: boolean }> = raw ? JSON.parse(raw) : {}
    if (all[npdId]) {
      all[npdId].headApproved = true
      localStorage.setItem("delivery_acceptance_v1", JSON.stringify(all))
    }
    setDeliveryHeadApproved(true)
    setActiveStage(6)
    updateNPD(npdId, { stage: 6, stageName: NPD_STAGES[5] })
  }
```

- [ ] **Step 7: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/mockData.ts "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat: add state, handlers, localStorage reads for feasibility reply, dispatch info, delivery acceptance"
```

---

## Task 2 — Feasibility denial thread in RND Sourcing Status card

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (inside the RND Section 2 Sourcing Status card, line ~818–851)

The RND Section 2 Sourcing Status card (`{activeStage >= 3 && (<Card>...)}`) ends at line ~852. The `<CardContent>` currently holds only the 4-chip grid. We add the vendor query block inside `<CardContent>` after the grid.

### Steps

- [ ] **Step 1: Add vendor query block inside the Sourcing Status CardContent**

Find the closing `</div>` of the 4-chip grid inside the Sourcing Status CardContent (the `</div>` that closes `<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">`). After it, but before `</CardContent>`, insert:

```tsx
                {/* Vendor feasibility denial queries */}
                {Object.entries(liveQuotes).some(([, lq]) => lq.feasible === false && lq.query) && (
                  <div className="mt-4 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor Queries</p>
                    {Object.entries(liveQuotes)
                      .filter(([, lq]) => lq.feasible === false && lq.query)
                      .map(([vendorName, lq]) => (
                        <div
                          key={vendorName}
                          className={`rounded-lg border p-3 ${lq.rndReply ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
                        >
                          <div className="flex items-start gap-2">
                            {lq.rndReply
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold ${lq.rndReply ? "text-emerald-800" : "text-amber-800"}`}>
                                {vendorName} — {lq.rndReply ? "Query Resolved" : "Feasibility Denied"}
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5 italic">Query: "{lq.query}"</p>
                              {lq.rndReply ? (
                                <div className="mt-1.5 space-y-0.5">
                                  <p className="text-xs text-slate-700">Reply: {lq.rndReply}</p>
                                  {lq.rndReplyDoc && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> {lq.rndReplyDoc}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    rows={2}
                                    value={queryReplyText[vendorName] ?? ""}
                                    onChange={e => setQueryReplyText(prev => ({ ...prev, [vendorName]: e.target.value }))}
                                    placeholder="Type your reply to this query…"
                                    className="w-full text-xs border border-amber-300 rounded-md px-2 py-1.5 focus:ring-amber-400 focus:border-amber-400 bg-white"
                                  />
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div
                                      onClick={() => {
                                        const fakeDoc = `rnd_reply_${vendorName.toLowerCase().replace(/\s+/g, "_")}.pdf`
                                        setQueryReplyDoc(prev => ({
                                          ...prev,
                                          [vendorName]: queryReplyDoc[vendorName] ? "" : fakeDoc,
                                        }))
                                      }}
                                      className={`cursor-pointer flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors ${
                                        queryReplyDoc[vendorName]
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                          : "bg-white border-slate-300 text-slate-500 hover:border-amber-400"
                                      }`}
                                    >
                                      <UploadCloud className="w-3 h-3" />
                                      {queryReplyDoc[vendorName] ? queryReplyDoc[vendorName] : "Attach doc (optional)"}
                                    </div>
                                    <Button
                                      size="sm"
                                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                                      disabled={!(queryReplyText[vendorName]?.trim())}
                                      onClick={() => submitQueryReply(vendorName)}
                                    >
                                      <Send className="w-3 h-3 mr-1" /> Send Reply
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat: show feasibility denial queries with RND reply form in Sourcing Status card"
```

---

## Task 3 — Dispatch status card in Sourcing Section 2

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (Sourcing Section 2, lines ~1569–1622)

The current Supplier Dispatch card (lines 1569–1623) shows a link + "Mark Dispatched" button. We replace the card's inner content with a two-state layout: "awaiting submission" when `dispatchInfo` is null, and a read-only info card when it's available.

### Steps

- [ ] **Step 1: Replace the CardContent of the Supplier Dispatch card**

Find the `<CardContent className="pt-5 space-y-3">` that opens around line 1577 and its closing `</CardContent>` before line 1622. Replace everything between (but not including) those two tags with:

```tsx
                <p className="text-sm text-slate-600">
                  Share the dispatch link with <strong>{npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? "the selected vendor"}</strong>. They must upload compliance documents and confirm dispatch.
                </p>

                {dispatchInfo ? (
                  /* Supplier has submitted via portal — show read-only data */
                  <div className="bg-white border border-emerald-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Supplier Submitted Dispatch Details
                      </p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        deliveryHeadApproved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {deliveryHeadApproved ? "Delivery Accepted" : "Pending RND Acceptance"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Supplier</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.vendorName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Dispatch Date</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.dispatchDate}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Submitted</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.submittedAt}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wider font-bold">Compliance Docs</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{dispatchInfo.docs.length} document{dispatchInfo.docs.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {dispatchInfo.docs.length > 0 && (
                      <ul className="space-y-1">
                        {dispatchInfo.docs.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" /> {doc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  /* Not yet submitted — show portal link */
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Awaiting dispatch submission from {npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? "supplier"}
                    </p>
                    {(() => {
                      const vendor = npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : sentVendors[0] ?? ""
                      const dispatchUrl = `${baseUrl}/supplier/dispatch/${npdId}${vendor ? `?vendor=${encodeURIComponent(vendor)}` : ""}`
                      return (
                        <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2.5">
                          <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-blue-700 font-mono truncate flex-1">{dispatchUrl}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(dispatchUrl)
                              setCopiedVendor("dispatch")
                              setTimeout(() => setCopiedVendor(null), 2000)
                            }}
                            className="shrink-0 text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedVendor === "dispatch" ? "Copied!" : "Copy"}
                          </button>
                          <a href={dispatchUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-blue-700">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Manual fallback — always present */}
                <div className="pt-1 border-t border-orange-100">
                  <p className="text-[10px] text-slate-400 mb-2">Manual override (if supplier did not use portal):</p>
                  {!defenceAdvanced ? (
                    <Button
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                      onClick={() => {
                        setDefenceAdvanced(true)
                        setActiveStage(5)
                        updateNPD(npdId, { stage: 5, stageName: NPD_STAGES[4] })
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Dispatched &amp; Advance to RND Evaluation
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Dispatched — Advanced to RND Evaluation
                    </span>
                  )}
                </div>
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat: show read-only supplier dispatch data in Sourcing Section 2"
```

---

## Task 4 — Stage 5 two-step delivery acceptance in RND My Actions

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` (Stage 5 active content, lines ~613–649)

The existing Stage 5 active block (`{activeStage === 5 && (...)`) uses a simple toggle upload + one advance button. Replace its inner content with the two-part dispatch-info strip + two-step acceptance.

### Steps

- [ ] **Step 1: Replace the Stage 5 active content**

Find the block starting at `{activeStage === 5 && (` inside the Stage 5 card (around line 613). Replace the entire `<div className="space-y-3">` through its closing `</div>` with:

```tsx
                    <div className="space-y-4">

                      {/* Part 1 — Dispatch context strip */}
                      {dispatchInfo ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Dispatch Details (from supplier portal)
                          </p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-700">
                            <span><span className="text-slate-400">Supplier:</span> <strong>{dispatchInfo.vendorName}</strong></span>
                            <span><span className="text-slate-400">Dispatch Date:</span> <strong>{dispatchInfo.dispatchDate}</strong></span>
                            <span><span className="text-slate-400">Docs:</span> <strong>{dispatchInfo.docs.length} submitted</strong></span>
                          </div>
                          {dispatchInfo.docs.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {dispatchInfo.docs.map((doc, i) => (
                                <li key={i} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <FileText className="w-3 h-3 shrink-0 text-slate-400" /> {doc}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Dispatch details not submitted via portal. You can still accept below.
                        </p>
                      )}

                      {/* Part 2 — Two-step acceptance */}
                      {deliveryHeadApproved ? (
                        /* Fully approved */
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-800">Receipt Accepted &amp; Approved</p>
                            <p className="text-xs text-emerald-600">POD: {deliveryDoc}</p>
                          </div>
                        </div>
                      ) : deliverySubmitted ? (
                        /* RND user confirmed — awaiting head */
                        <div className="space-y-3">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-amber-800">Awaiting RND Head Approval</p>
                              <p className="text-xs text-amber-600">POD attached: {deliveryDoc}</p>
                            </div>
                          </div>
                          {(currentRole === "rnd_head" || currentRole === "super_admin") && (
                            <Button
                              className="bg-purple-700 hover:bg-purple-800 text-white"
                              onClick={approveDelivery}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Approve &amp; Advance to RND Testing
                            </Button>
                          )}
                        </div>
                      ) : (
                        /* RND user uploads POD */
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600">Upload proof of delivery to confirm receipt.</p>
                          <div
                            onClick={() => {
                              if (!deliveryDoc) setDeliveryDoc("delivery_confirmation.jpg")
                              else setDeliveryDoc("")
                            }}
                            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                              deliveryDoc ? "border-emerald-400 bg-emerald-50" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50/40 bg-white"
                            }`}
                          >
                            {deliveryDoc ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-sm font-semibold text-emerald-700">{deliveryDoc}</p>
                                <p className="text-xs text-emerald-600">Click to remove</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <UploadCloud className="w-8 h-8 text-blue-400 mb-1" />
                                <p className="text-sm font-semibold text-slate-700">Upload proof of delivery</p>
                                <p className="text-xs text-slate-400">PDF, PNG, JPG accepted</p>
                              </div>
                            )}
                          </div>
                          {deliveryDoc && (
                            <Button
                              className="bg-blue-900 hover:bg-blue-800 text-white"
                              onClick={submitDelivery}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Receipt — Send for RND Head Approval
                            </Button>
                          )}
                        </div>
                      )}

                    </div>
```

- [ ] **Step 2: Remove the now-unused `fpaImageUploaded` state variable**

The old Stage 5 upload used `fpaImageUploaded` / `setFpaImageUploaded`. Now that Stage 5 uses `deliveryDoc`, `fpaImageUploaded` is only used if referenced elsewhere. Search the file for `fpaImageUploaded` — if it only appears in the state declaration and nowhere else in the JSX, delete the declaration line:

```ts
  const [fpaImageUploaded, setFpaImageUploaded] = useState(false)
```

If it still appears in other places, leave it.

- [ ] **Step 3: TypeScript check**

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Visual check**

Start the dev server and verify:

```bash
cd "/home/div-dev/div_dev_code/New-Product-Development-Module" && npm run dev
```

1. Open any NPD at stage 3. Switch role to `rnd_user`. Sourcing Status card should show no query rows (no denials yet).
2. Open `/supplier/quote/[id]?vendor=SomeName` in another tab, submit with feasibility = no + a query. Come back to the NPD detail page. Sourcing Status should now show the amber denial row with the reply form.
3. Fill in a reply and click Send Reply. Row should turn emerald with the reply text shown.
4. Navigate to an NPD at stage 4. Switch role to a sourcing SPOC. Sourcing Section 2 should show "Awaiting dispatch submission" + the dispatch portal link.
5. Open `/supplier/dispatch/[id]?vendor=...` and submit the form. Return to NPD detail — Section 2 should now show the read-only dispatch data card.
6. Switch role to `rnd_user`. Advance to stage 5. Stage 5 card should show dispatch context strip (if filled) + upload widget. Upload POD → "Awaiting RND Head Approval" badge appears.
7. Switch role to `rnd_head`. Stage 5 should show "Approve & Advance to RND Testing" button. Click it → stage advances to 6.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(internal)/npd/[id]/page.tsx"
git commit -m "feat: two-step delivery acceptance at Stage 5 (RND user POD upload + RND Head approval)"
```
