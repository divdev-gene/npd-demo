# ECN Price Negotiation Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-round price negotiation loop to ECN Stage 2 (Sourcing Review & RFQ) and Stage 7 (PP Pricing), allowing sourcing to set a target price, receive supplier quotes via the existing portal, and iterate until they approve a price.

**Architecture:** Two new localStorage keys store arrays of negotiation rounds (`ECN_NEGOTIATION_KEY` for Stage 2, `ECN_PP_NEGOTIATION_KEY` for Stage 7). The sourcing internal view polls for supplier responses every 3 s while a round is pending. The supplier portal (`/supplier/ecn-sourcing/[id]`) gains a new section that reads both negotiation keys and renders a price-submission form when a pending round exists. Stage 7 PP Pricing form is gated — it stays available if no negotiation was ever started (backward compat), but once started it requires approval before enabling.

**Tech Stack:** Next.js 16 app router, React 19, TypeScript, Tailwind CSS v4, localStorage (no backend)

---

## File Map

| File | Change |
|---|---|
| `src/lib/mockData.ts` | Add `ECN_NEGOTIATION_KEY` and `ECN_PP_NEGOTIATION_KEY` exports |
| `src/app/(internal)/npd/[id]/page.tsx` | Add types, state, localStorage loaders, polling, Stage 2 widget, Stage 7 widget |
| `src/app/supplier/ecn-sourcing/[id]/page.tsx` | Add negotiation section; read both keys; handle per-key submission |

---

## Task 1: Add localStorage keys to mockData.ts

**Files:**
- Modify: `src/lib/mockData.ts` (near line 385, after `ECN_PP_PRICING_KEY`)

- [ ] **Step 1: Insert the two new key exports**

In `src/lib/mockData.ts`, find the block ending with:
```ts
export const ECN_PP_PRICING_KEY    = "ecn_pp_pricing_v1"
export const NCD_PP_PRICING_KEY    = "ncd_pp_pricing_v1"
```

Add immediately after:
```ts
export const ECN_NEGOTIATION_KEY    = "ecn_negotiation_v1"
export const ECN_PP_NEGOTIATION_KEY = "ecn_pp_negotiation_v1"
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat(ecn): add ECN_NEGOTIATION_KEY and ECN_PP_NEGOTIATION_KEY to mockData"
```

---

## Task 2: Add types, state and localStorage loaders in npd/[id]/page.tsx

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx`

### Sub-task 2a — Import the new keys

- [ ] **Step 1: Add the two new keys to the import from `@/lib/mockData`**

Find the existing import line that contains `ECN_PP_PRICING_KEY, NCD_PP_PRICING_KEY` (around line 19) and append:
```ts
  ECN_NEGOTIATION_KEY, ECN_PP_NEGOTIATION_KEY,
```

So the relevant import fragment becomes:
```ts
  ECN_PRICE_ESTIMATION_KEY, ECN_DQA_TESTS_KEY, ECN_HEAD_APPROVAL_KEY, ECN_PP_PRICING_KEY, NCD_PP_PRICING_KEY,
  ECN_NEGOTIATION_KEY, ECN_PP_NEGOTIATION_KEY,
```

### Sub-task 2b — Define the shared TypeScript types

- [ ] **Step 2: Add types near the top of the file (after the last top-level `type` or `interface`, before the component function)**

Insert:
```ts
type NegotiationRound = {
  round: number
  targetPrice: string
  currency: "INR" | "USD" | "EUR"
  sentAt: number
  sentBy: string
  supplierResponse?: {
    price: string
    currency: "INR" | "USD" | "EUR"
    docs: string[]
    submittedAt: number
  }
}

type NegotiationRecord = {
  rounds: NegotiationRound[]
  approvedAt?: number
  approvedBy?: string
  finalPrice?: string
  finalCurrency?: "INR" | "USD" | "EUR"
}
```

### Sub-task 2c — Add state variables

- [ ] **Step 3: After the `ecnPpLeadTime` state block (around line 330) add:**

```ts
  // ECN Price Negotiation (Stage 2)
  const [ecnNegotiation,     setEcnNegotiation]     = useState<NegotiationRecord | null>(null)
  const [negTargetPrice,     setNegTargetPrice]      = useState("")
  const [negCurrency,        setNegCurrency]         = useState<"INR" | "USD" | "EUR">("INR")
  // ECN PP Negotiation (Stage 7)
  const [ecnPpNegotiation,   setEcnPpNegotiation]   = useState<NegotiationRecord | null>(null)
  const [ppNegTargetPrice,   setPpNegTargetPrice]    = useState("")
  const [ppNegCurrency,      setPpNegCurrency]       = useState<"INR" | "USD" | "EUR">("INR")
```

### Sub-task 2d — Load from localStorage

- [ ] **Step 4: Inside the existing `useEffect` that loads ECN data (around line 664, after the NCD PP Pricing block), add:**

```ts
    // ECN — Stage 2 Negotiation
    const rawEcnNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
    if (rawEcnNeg) {
      const allNeg = JSON.parse(rawEcnNeg)
      if (allNeg[npdId]) setEcnNegotiation(allNeg[npdId])
    }
    // ECN — PP Negotiation
    const rawEcnPpNeg = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
    if (rawEcnPpNeg) {
      const allPpNeg = JSON.parse(rawEcnPpNeg)
      if (allPpNeg[npdId]) setEcnPpNegotiation(allPpNeg[npdId])
    }
```

### Sub-task 2e — Add polling for pending negotiation rounds

- [ ] **Step 5: After the existing ECN dispatch-polling `useEffect` (after line 795), add two new polling effects:**

```ts
  // ECN: poll ECN_NEGOTIATION_KEY every 3s while stage 2 is active and a round is pending
  useEffect(() => {
    if (!isECN || activeStage !== 2) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(ECN_NEGOTIATION_KEY)
      if (!raw) return
      const all: Record<string, NegotiationRecord> = JSON.parse(raw)
      if (all[npdId]) setEcnNegotiation({ ...all[npdId] })
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, activeStage, npdId])

  // ECN: poll ECN_PP_NEGOTIATION_KEY every 3s while stage 7 is active and a round is pending
  useEffect(() => {
    if (!isECN || activeStage !== 7) return
    const interval = setInterval(() => {
      const raw = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
      if (!raw) return
      const all: Record<string, NegotiationRecord> = JSON.parse(raw)
      if (all[npdId]) setEcnPpNegotiation({ ...all[npdId] })
    }, 3000)
    return () => clearInterval(interval)
  }, [isECN, activeStage, npdId])
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat(ecn): add negotiation state, types, loaders and polling to npd detail page"
```

---

## Task 3: Stage 2 negotiation widget in the sourcing section

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` — Stage 2 sourcing card (around line 4541, after the existing `{(isDone || rfqApproved) && ...}` block)

The widget lives inside the `src-s2` card div, after the existing content. It is always visible when `isActive` (stage 2) regardless of `rfqApproved`.

- [ ] **Step 1: Insert the negotiation widget after the closing `{(isDone || rfqApproved) && ecnRndApproval && (...)}` block (line ~4539) and before the closing `</div>` of the `src-s2` card**

Find the exact anchor — the line that reads:
```tsx
        {(isDone || rfqApproved) && ecnRndApproval && (
          <p className="text-[10px] text-slate-400">RFQ sent by {ecnRndApproval.approvedBy} · {new Date(ecnRndApproval.approvedAt).toLocaleString("en-IN")}</p>
        )}
      </div>
    )
  }

  // Stage 3
```

Insert **before** the closing `</div>` of the src-s2 card (i.e., before the `      </div>\n    )\n  }\n\n  // Stage 3` sequence):

```tsx
        {/* ── Price Negotiation sub-section ── */}
        {isActive && (() => {
          const neg = ecnNegotiation
          const latestRound = neg?.rounds[neg.rounds.length - 1]
          const pendingResponse = latestRound && !latestRound.supplierResponse
          const awaitingApproval = latestRound?.supplierResponse && !neg?.approvedAt
          const approved = !!neg?.approvedAt
          const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

          return (
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price Negotiation</span>
                {approved && <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Agreed: {currSymbol(neg!.finalCurrency!)}{parseFloat(neg!.finalPrice!).toLocaleString("en-IN")}</span>}
                {pendingResponse && <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Awaiting Supplier — Round {latestRound.round}</span>}
              </div>

              {/* Round history */}
              {neg && neg.rounds.length > 0 && (
                <div className="space-y-2">
                  {neg.rounds.map(r => (
                    <div key={r.round} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Round {r.round}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.sentAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-500">Target: <strong className="text-slate-800">{currSymbol(r.currency)}{parseFloat(r.targetPrice).toLocaleString("en-IN")}</strong></span>
                        {r.supplierResponse && (
                          <span className="text-slate-500">Supplier: <strong className="text-slate-800">{currSymbol(r.supplierResponse.currency)}{parseFloat(r.supplierResponse.price).toLocaleString("en-IN")}</strong></span>
                        )}
                      </div>
                      {r.supplierResponse && r.supplierResponse.docs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {r.supplierResponse.docs.map(d => (
                            <span key={d} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{d}</span>
                          ))}
                        </div>
                      )}
                      {r.supplierResponse && (
                        <p className="text-[10px] text-slate-400">Submitted {new Date(r.supplierResponse.submittedAt).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Approve / Counter — shown when supplier has responded and not yet approved */}
              {awaitingApproval && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const updated: NegotiationRecord = {
                        ...neg!,
                        approvedAt: Date.now(),
                        approvedBy: currentRole,
                        finalPrice: latestRound!.supplierResponse!.price,
                        finalCurrency: latestRound!.supplierResponse!.currency,
                      }
                      const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                      all[npdId] = updated
                      localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                      setEcnNegotiation(updated)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  ><CheckCircle className="w-3.5 h-3.5" />Approve Price</button>
                  <button
                    onClick={() => {
                      setNegTargetPrice("")
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                  >Counter with new target ↓</button>
                </div>
              )}

              {/* Send new target form — shown when: no rounds yet, OR counter was clicked (negTargetPrice cleared and awaitingApproval) */}
              {!approved && !pendingResponse && (!neg || awaitingApproval) && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">
                    {!neg ? "Start Price Negotiation" : `Send Counter Target (Round ${(neg.rounds.length) + 1})`}
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={negCurrency}
                      onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Target price / unit"
                      value={negTargetPrice}
                      onChange={e => setNegTargetPrice(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      disabled={!negTargetPrice || parseFloat(negTargetPrice) <= 0}
                      onClick={() => {
                        const existingRounds = neg?.rounds ?? []
                        const newRound: NegotiationRound = {
                          round: existingRounds.length + 1,
                          targetPrice: negTargetPrice,
                          currency: negCurrency,
                          sentAt: Date.now(),
                          sentBy: currentRole,
                        }
                        const updated: NegotiationRecord = { rounds: [...existingRounds, newRound] }
                        const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
                        all[npdId] = updated
                        localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
                        setEcnNegotiation(updated)
                        setNegTargetPrice("")
                      }}
                      className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >Send to Supplier</button>
                  </div>
                  <p className="text-[10px] text-slate-400">Share the same supplier portal link — it will show this target price.</p>
                </div>
              )}
            </div>
          )
        })()}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat(ecn): add price negotiation widget to Stage 2 sourcing card"
```

---

## Task 4: Stage 7 PP Pricing negotiation widget

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` — Stage 7 sourcing card (around line 4659)

The PP Pricing form should only auto-enable if no negotiation was ever started. Once a `ECN_PP_NEGOTIATION_KEY` record exists for this NPD, the PP Pricing form is gated behind approval.

- [ ] **Step 1: Insert negotiation widget between the "Supplier Quote" reference tile and the PP Pricing input form**

Find the anchor inside the `src-s7` card — the section that reads:
```tsx
        {/* Reference price from supplier dispatch */}
        {ecnPriceEstimation && (
          ...
        )}

        {/* Submitted state */}
        {(isDone || ecnPpPricing) && ecnPpPricing && (
```

Between those two blocks, insert:

```tsx
        {/* PP Price Negotiation */}
        {isActive && !ecnPpPricing && (() => {
          const neg = ecnPpNegotiation
          const latestRound = neg?.rounds[neg.rounds.length - 1]
          const pendingResponse = latestRound && !latestRound.supplierResponse
          const awaitingApproval = latestRound?.supplierResponse && !neg?.approvedAt
          const approved = !!neg?.approvedAt
          const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

          return (
            <div className="mb-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PP Price Negotiation</span>
                {approved && <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Agreed: {currSymbol(neg!.finalCurrency!)}{parseFloat(neg!.finalPrice!).toLocaleString("en-IN")}</span>}
                {pendingResponse && <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Awaiting Supplier — Round {latestRound.round}</span>}
              </div>

              {/* Round history */}
              {neg && neg.rounds.length > 0 && (
                <div className="space-y-2">
                  {neg.rounds.map(r => (
                    <div key={r.round} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Round {r.round}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.sentAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-slate-500">Target: <strong className="text-slate-800">{currSymbol(r.currency)}{parseFloat(r.targetPrice).toLocaleString("en-IN")}</strong></span>
                        {r.supplierResponse && (
                          <span className="text-slate-500">Supplier: <strong className="text-slate-800">{currSymbol(r.supplierResponse.currency)}{parseFloat(r.supplierResponse.price).toLocaleString("en-IN")}</strong></span>
                        )}
                      </div>
                      {r.supplierResponse && r.supplierResponse.docs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {r.supplierResponse.docs.map(d => (
                            <span key={d} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{d}</span>
                          ))}
                        </div>
                      )}
                      {r.supplierResponse && (
                        <p className="text-[10px] text-slate-400">Submitted {new Date(r.supplierResponse.submittedAt).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Approve / Counter */}
              {awaitingApproval && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const updated: NegotiationRecord = {
                        ...neg!,
                        approvedAt: Date.now(),
                        approvedBy: currentRole,
                        finalPrice: latestRound!.supplierResponse!.price,
                        finalCurrency: latestRound!.supplierResponse!.currency,
                      }
                      const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_PP_NEGOTIATION_KEY) ?? "{}")
                      all[npdId] = updated
                      localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all))
                      setEcnPpNegotiation(updated)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  ><CheckCircle className="w-3.5 h-3.5" />Approve Price</button>
                  <button
                    onClick={() => setPpNegTargetPrice("")}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                  >Counter with new target ↓</button>
                </div>
              )}

              {/* Send new target form */}
              {!approved && !pendingResponse && (!neg || awaitingApproval) && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-orange-800">
                    {!neg ? "Start PP Price Negotiation" : `Send Counter Target (Round ${(neg.rounds.length) + 1})`}
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={ppNegCurrency}
                      onChange={e => setPpNegCurrency(e.target.value as "INR" | "USD" | "EUR")}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Target PP price / unit"
                      value={ppNegTargetPrice}
                      onChange={e => setPpNegTargetPrice(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button
                      disabled={!ppNegTargetPrice || parseFloat(ppNegTargetPrice) <= 0}
                      onClick={() => {
                        const existingRounds = neg?.rounds ?? []
                        const newRound: NegotiationRound = {
                          round: existingRounds.length + 1,
                          targetPrice: ppNegTargetPrice,
                          currency: ppNegCurrency,
                          sentAt: Date.now(),
                          sentBy: currentRole,
                        }
                        const updated: NegotiationRecord = { rounds: [...existingRounds, newRound] }
                        const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_PP_NEGOTIATION_KEY) ?? "{}")
                        all[npdId] = updated
                        localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all))
                        setEcnPpNegotiation(updated)
                        setPpNegTargetPrice("")
                      }}
                      className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >Send to Supplier</button>
                  </div>
                  <p className="text-[10px] text-slate-400">Share the same supplier portal link — it will show this PP target price.</p>
                </div>
              )}
            </div>
          )
        })()}
```

- [ ] **Step 2: Gate the existing PP Pricing input form**

Find the existing PP pricing input form condition:
```tsx
        {/* Input form — active stage, not yet submitted */}
        {isActive && !ecnPpPricing && (
```

Change it to:
```tsx
        {/* Input form — active stage, not yet submitted; if negotiation started, require approval first */}
        {isActive && !ecnPpPricing && (!ecnPpNegotiation || !!ecnPpNegotiation.approvedAt) && (
```

- [ ] **Step 3: Pre-fill PP price from approved negotiation**

Inside the PP Pricing submit handler (the `onClick` on the "Submit PP Pricing & Close ECN →" button), the `ppPrice` is taken from `ecnPpPrice` state. To auto-suggest the agreed price from negotiation, update the form's initial render to show the agreed price. Find the PP price input:

```tsx
                <input type="number" min="0" step="0.01" placeholder="e.g. 140.00" value={ecnPpPrice} onChange={e => setEcnPpPrice(e.target.value)} ...
```

No code change needed here — the input is already editable. Just add a hint below the currency/price row when negotiation is approved:

After the `</div>` closing the flex gap-3 row containing the currency select and PP price input, add:
```tsx
            {ecnPpNegotiation?.approvedAt && !ecnPpPrice && (
              <p className="text-[11px] text-emerald-700 -mt-1">
                Negotiated price: <button className="font-bold underline" onClick={() => { setEcnPpPrice(ecnPpNegotiation.finalPrice!); setEcnPpCurrency(ecnPpNegotiation.finalCurrency!) }}>Use ₹{parseFloat(ecnPpNegotiation.finalPrice!).toLocaleString("en-IN")}</button>
              </p>
            )}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat(ecn): add PP price negotiation widget to Stage 7 and gate PP Pricing form"
```

---

## Task 5: Update the supplier ECN sourcing portal

**Files:**
- Modify: `src/app/supplier/ecn-sourcing/[id]/page.tsx`

The portal needs to:
1. Read `ECN_NEGOTIATION_KEY` and `ECN_PP_NEGOTIATION_KEY` for pending rounds
2. If a Stage 2 pending round exists, show price negotiation form at the top
3. If a PP pending round exists, show PP negotiation form after dispatch
4. Submissions write back to the correct key under `supplierResponse` of the latest round

- [ ] **Step 1: Replace the entire portal file with the updated version**

The full updated `src/app/supplier/ecn-sourcing/[id]/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  ECN_SOURCING_DISPATCH_KEY,
  ECN_PRICE_ESTIMATION_KEY,
  ECN_NEGOTIATION_KEY,
  ECN_PP_NEGOTIATION_KEY,
} from "@/lib/mockData"
import {
  CheckCircle, CheckCircle2, UploadCloud, Truck, Mail, Tag,
} from "lucide-react"

type SubmissionRecord = {
  dispatchDate: string
  docs: string[]
  submittedAt: number
}

type NegotiationRound = {
  round: number
  targetPrice: string
  currency: "INR" | "USD" | "EUR"
  sentAt: number
  sentBy: string
  supplierResponse?: {
    price: string
    currency: "INR" | "USD" | "EUR"
    docs: string[]
    submittedAt: number
  }
}

type NegotiationRecord = {
  rounds: NegotiationRound[]
  approvedAt?: number
  approvedBy?: string
  finalPrice?: string
  finalCurrency?: "INR" | "USD" | "EUR"
}

const DEMO_FILES = [
  "dispatch_challan.pdf",
  "shipping_confirmation.pdf",
  "test_report.pdf",
  "quality_certificate.pdf",
  "invoice.pdf",
  "price_quote.pdf",
]

const currSymbol = (c: string) => c === "INR" ? "₹" : c === "USD" ? "$" : "€"

export default function EcnSourcingPage() {
  const params  = useParams()
  const npdId   = params.id as string

  // Dispatch state
  const [submitted,    setSubmitted]    = useState(false)
  const [dispatchDate, setDispatchDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  })
  const [docNames,     setDocNames]     = useState<string[]>([])
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [currency,     setCurrency]     = useState<"INR" | "USD" | "EUR">("INR")

  // Negotiation state (Stage 2)
  const [negRecord,    setNegRecord]    = useState<NegotiationRecord | null>(null)
  const [negPrice,     setNegPrice]     = useState("")
  const [negCurrency,  setNegCurrency]  = useState<"INR" | "USD" | "EUR">("INR")
  const [negDocs,      setNegDocs]      = useState<string[]>([])
  const [negSubmitted, setNegSubmitted] = useState(false)

  // PP Negotiation state (Stage 7)
  const [ppNegRecord,    setPpNegRecord]    = useState<NegotiationRecord | null>(null)
  const [ppNegPrice,     setPpNegPrice]     = useState("")
  const [ppNegCurrency,  setPpNegCurrency]  = useState<"INR" | "USD" | "EUR">("INR")
  const [ppNegDocs,      setPpNegDocs]      = useState<string[]>([])
  const [ppNegSubmitted, setPpNegSubmitted] = useState(false)

  useEffect(() => {
    // Dispatch
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, { submission: SubmissionRecord }> = rawD ? JSON.parse(rawD) : {}
    if (allD[npdId]?.submission) setSubmitted(true)

    // Stage 2 negotiation
    const rawN = localStorage.getItem(ECN_NEGOTIATION_KEY)
    if (rawN) {
      const allN: Record<string, NegotiationRecord> = JSON.parse(rawN)
      if (allN[npdId]) {
        setNegRecord(allN[npdId])
        const latest = allN[npdId].rounds[allN[npdId].rounds.length - 1]
        if (latest?.supplierResponse) setNegSubmitted(true)
      }
    }

    // PP negotiation
    const rawPP = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
    if (rawPP) {
      const allPP: Record<string, NegotiationRecord> = JSON.parse(rawPP)
      if (allPP[npdId]) {
        setPpNegRecord(allPP[npdId])
        const latest = allPP[npdId].rounds[allPP[npdId].rounds.length - 1]
        if (latest?.supplierResponse) setPpNegSubmitted(true)
      }
    }
  }, [npdId])

  const addFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[]) => {
    const next = DEMO_FILES[current.length % DEMO_FILES.length]
    const name = current.includes(next) ? `${next.replace(".pdf", "")}_${current.length + 1}.pdf` : next
    setter(prev => [...prev, name])
  }

  const removeFile = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index))

  // Submit Stage 2 negotiation response
  const handleNegSubmit = () => {
    if (!negRecord) return
    const rounds = [...negRecord.rounds]
    rounds[rounds.length - 1] = {
      ...rounds[rounds.length - 1],
      supplierResponse: {
        price: negPrice,
        currency: negCurrency,
        docs: negDocs,
        submittedAt: Date.now(),
      },
    }
    const updated: NegotiationRecord = { ...negRecord, rounds }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all))
    setNegRecord(updated)
    setNegSubmitted(true)
  }

  // Submit PP negotiation response
  const handlePpNegSubmit = () => {
    if (!ppNegRecord) return
    const rounds = [...ppNegRecord.rounds]
    rounds[rounds.length - 1] = {
      ...rounds[rounds.length - 1],
      supplierResponse: {
        price: ppNegPrice,
        currency: ppNegCurrency,
        docs: ppNegDocs,
        submittedAt: Date.now(),
      },
    }
    const updated: NegotiationRecord = { ...ppNegRecord, rounds }
    const all: Record<string, NegotiationRecord> = JSON.parse(localStorage.getItem(ECN_PP_NEGOTIATION_KEY) ?? "{}")
    all[npdId] = updated
    localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all))
    setPpNegRecord(updated)
    setPpNegSubmitted(true)
  }

  // Submit dispatch
  const handleDispatchSubmit = () => {
    const submission: SubmissionRecord = { dispatchDate, docs: docNames, submittedAt: Date.now() }
    const rawD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
    const allD: Record<string, { submission: SubmissionRecord }> = rawD ? JSON.parse(rawD) : {}
    allD[npdId] = { submission }
    localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(allD))

    const priceEntry = { pricePerUnit, currency, submittedAt: Date.now() }
    const rawP = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
    const allP: Record<string, typeof priceEntry> = rawP ? JSON.parse(rawP) : {}
    allP[npdId] = priceEntry
    localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(allP))

    setSubmitted(true)
  }

  const canDispatchSubmit = !!dispatchDate && docNames.length > 0 && !!pricePerUnit && parseFloat(pricePerUnit) > 0
  const dateFormatted = dispatchDate
    ? new Date(dispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Not specified"

  // Pending round helpers
  const negLatest = negRecord?.rounds[negRecord.rounds.length - 1]
  const negPending = negLatest && !negLatest.supplierResponse && !negRecord?.approvedAt
  const ppNegLatest = ppNegRecord?.rounds[ppNegRecord.rounds.length - 1]
  const ppNegPending = ppNegLatest && !ppNegLatest.supplierResponse && !ppNegRecord?.approvedAt

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-sm font-bold text-slate-700">ECN Sourcing Portal</span>
          </div>
          <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            Supplier Portal
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* NPD summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col gap-2">
            <span className="inline-block text-[10px] font-bold tracking-widest bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full self-start">
              {npdId}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">ECN Supplier Portal</h1>
            <p className="text-sm text-slate-500">
              Submit price quotes and dispatch details for this Engineering Change Notice.
            </p>
          </div>
        </div>

        {/* ── Stage 2: Price Negotiation ── */}
        {negPending && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" /> Price Quote — Round {negLatest.round}
            </h2>

            {negSubmitted ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Quote submitted — awaiting Amber review</p>
                  <p className="text-xs text-emerald-700 mt-0.5">You will be contacted if a counter offer is made.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Amber&apos;s target price</p>
                  <p className="text-xl font-bold text-blue-900">
                    {currSymbol(negLatest.currency)}{parseFloat(negLatest.targetPrice).toLocaleString("en-IN")} <span className="text-sm font-normal">/ unit</span>
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">Sent {new Date(negLatest.sentAt).toLocaleString("en-IN")}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Your counter-quote</h3>
                  <div className="flex gap-3">
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                      <select value={negCurrency} onChange={e => setNegCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="INR">INR ₹</option>
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Your price / unit <span className="text-red-500">*</span></label>
                      <input type="number" min="0" step="0.01" placeholder="e.g. 118.00" value={negPrice} onChange={e => setNegPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Optional docs */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Supporting documents <span className="text-slate-400">(optional)</span></label>
                    <div onClick={() => addFile(setNegDocs, negDocs)} className="rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 p-4 text-center cursor-pointer transition-all">
                      <p className="text-xs text-slate-400">Click to attach file</p>
                    </div>
                    {negDocs.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {negDocs.map((name, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                            <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                            <button onClick={() => removeFile(setNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    onClick={handleNegSubmit}
                    disabled={!negPrice || parseFloat(negPrice) <= 0}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                  >
                    Submit Quote
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Stage 3: Dispatch ── */}
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Dispatch Confirmed</h2>
              <p className="text-sm text-slate-500 mt-1">Your ECN sourcing dispatch details have been submitted.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Submission Summary</span>
              </div>
              <div className="p-4 space-y-2.5 text-[13px] text-slate-700 leading-relaxed">
                <p><strong>Reference:</strong> {npdId}</p>
                <p><strong>Dispatch Date:</strong> {dateFormatted}</p>
                <p><strong>Documents:</strong> {docNames.length > 0 ? docNames.join(", ") : "—"}</p>
                {pricePerUnit && <p><strong>Price Estimate:</strong> {currSymbol(currency)}{parseFloat(pricePerUnit).toLocaleString("en-IN")} per unit</p>}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Document upload */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-orange-500" /> Documents <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-slate-500">Upload challan, receipt, shipping confirmation, or test reports.</p>
              <div onClick={() => addFile(setDocNames, docNames)} className="block rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 p-8 text-center cursor-pointer transition-all">
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-10 h-10 text-slate-300 mb-1" />
                  <p className="text-sm font-semibold text-slate-600">Click to attach file</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG, XLSX accepted</p>
                </div>
              </div>
              {docNames.length > 0 && (
                <ul className="space-y-2">
                  {docNames.map((name, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /><span className="text-sm font-medium text-emerald-800 truncate">{name}</span></div>
                      <button onClick={() => removeFile(setDocNames, idx)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dispatch date + price + submit */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-500" /> Dispatch Details
              </h2>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Dispatch Date <span className="text-red-500">*</span></label>
                <p className="text-xs text-slate-400 mb-2">Date on which you will dispatch materials / samples.</p>
                <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-400 max-w-xs" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" /> Price Estimation Per Unit <span className="text-red-500">*</span>
                </h3>
                <div className="flex gap-3">
                  <div className="w-28 shrink-0">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Amount per unit</label>
                    <input type="number" min="0" step="0.01" placeholder="e.g. 125.50" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <button onClick={handleDispatchSubmit} disabled={!canDispatchSubmit} className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2">
                <Truck className="w-5 h-5" /> Confirm Dispatch
              </button>
              {!canDispatchSubmit && (
                <p className="text-xs text-slate-400 text-center">
                  {docNames.length === 0 ? "Attach at least one document to continue." : !pricePerUnit || parseFloat(pricePerUnit) <= 0 ? "Enter a price per unit to continue." : "Fill in all required fields to continue."}
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Stage 7: PP Price Negotiation ── */}
        {ppNegPending && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-500" /> PP Price Quote — Round {ppNegLatest.round}
            </h2>

            {ppNegSubmitted ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">PP quote submitted — awaiting Amber review</p>
                  <p className="text-xs text-emerald-700 mt-0.5">You will be contacted if a counter offer is made.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
                  <p className="text-xs font-semibold text-orange-700 mb-0.5">Amber&apos;s PP target price</p>
                  <p className="text-xl font-bold text-orange-900">
                    {currSymbol(ppNegLatest.currency)}{parseFloat(ppNegLatest.targetPrice).toLocaleString("en-IN")} <span className="text-sm font-normal">/ unit</span>
                  </p>
                  <p className="text-[10px] text-orange-500 mt-1">Sent {new Date(ppNegLatest.sentAt).toLocaleString("en-IN")}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Your PP counter-quote</h3>
                  <div className="flex gap-3">
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                      <select value={ppNegCurrency} onChange={e => setPpNegCurrency(e.target.value as "INR" | "USD" | "EUR")} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                        <option value="INR">INR ₹</option>
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Your PP price / unit <span className="text-red-500">*</span></label>
                      <input type="number" min="0" step="0.01" placeholder="e.g. 138.00" value={ppNegPrice} onChange={e => setPpNegPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Supporting documents <span className="text-slate-400">(optional)</span></label>
                    <div onClick={() => addFile(setPpNegDocs, ppNegDocs)} className="rounded-lg border-2 border-dashed border-slate-200 hover:border-orange-400 p-4 text-center cursor-pointer transition-all">
                      <p className="text-xs text-slate-400">Click to attach file</p>
                    </div>
                    {ppNegDocs.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {ppNegDocs.map((name, i) => (
                          <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                            <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="text-xs font-medium text-emerald-800 truncate">{name}</span></div>
                            <button onClick={() => removeFile(setPpNegDocs, i)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={handlePpNegSubmit}
                    disabled={!ppNegPrice || parseFloat(ppNegPrice) <= 0}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition-colors"
                  >
                    Submit PP Quote
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/supplier/ecn-sourcing/\[id\]/page.tsx
git commit -m "feat(ecn): update supplier portal to support Stage 2 and Stage 7 price negotiation rounds"
```

---

## Task 6: Cleanup — reset negotiation keys on stage rollback

**Files:**
- Modify: `src/app/(internal)/npd/[id]/page.tsx` — the stage rollback handlers (around lines 1303–1322)

When stages are rolled back, the negotiation data for those stages should be cleared so it doesn't pollute a fresh run.

- [ ] **Step 1: Find the rollback cleanup block around line 1303 and add negotiation key clears**

Find the existing block that looks like:
```ts
        const rawSD = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
        if (rawSD) { const all = JSON.parse(rawSD); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
        const rawPE = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
        if (rawPE) { const all = JSON.parse(rawPE); delete all[npdId]; localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(all)) }
```

After those two lines, add:
```ts
        const rawNeg = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg) { const all = JSON.parse(rawNeg); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
```

Similarly for the second rollback block (around line 1313 — rollback of stage 3→2), find:
```ts
        const rawSD4 = localStorage.getItem(ECN_SOURCING_DISPATCH_KEY)
        if (rawSD4) { const all = JSON.parse(rawSD4); delete all[npdId]; localStorage.setItem(ECN_SOURCING_DISPATCH_KEY, JSON.stringify(all)) }
        const rawPE4 = localStorage.getItem(ECN_PRICE_ESTIMATION_KEY)
        if (rawPE4) { const all = JSON.parse(rawPE4); delete all[npdId]; localStorage.setItem(ECN_PRICE_ESTIMATION_KEY, JSON.stringify(all)) }
```

And add after:
```ts
        const rawNeg4 = localStorage.getItem(ECN_NEGOTIATION_KEY)
        if (rawNeg4) { const all = JSON.parse(rawNeg4); delete all[npdId]; localStorage.setItem(ECN_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnNegotiation(null)
```

For the Stage 7 PP Pricing key (find the existing `rawPP` rollback block around line 1332):
```ts
        const rawPP = localStorage.getItem(ECN_PP_PRICING_KEY)
        if (rawPP) { const all = JSON.parse(rawPP); delete all[npdId]; localStorage.setItem(ECN_PP_PRICING_KEY, JSON.stringify(all)) }
```

Add after:
```ts
        const rawPpNeg = localStorage.getItem(ECN_PP_NEGOTIATION_KEY)
        if (rawPpNeg) { const all = JSON.parse(rawPpNeg); delete all[npdId]; localStorage.setItem(ECN_PP_NEGOTIATION_KEY, JSON.stringify(all)) }
        setEcnPpNegotiation(null)
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(internal\)/npd/\[id\]/page.tsx
git commit -m "feat(ecn): clear negotiation records on stage rollback"
```

---

## Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the two new keys to the localStorage key reference table**

Find the existing rows for `ECN_STAGE1_KEY` and `ECN_RND_APPROVAL_KEY` and insert before them:

```markdown
| `ECN_NEGOTIATION_KEY` | `Record<npdId, NegotiationRecord>` — Stage 2 price negotiation rounds |
| `ECN_PP_NEGOTIATION_KEY` | `Record<npdId, NegotiationRecord>` — Stage 7 PP price negotiation rounds |
```

Where `NegotiationRecord = { rounds: Round[], approvedAt?, approvedBy?, finalPrice?, finalCurrency? }`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add ECN negotiation keys to CLAUDE.md localStorage reference"
```
