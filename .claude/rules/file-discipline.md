## Commands

```bash
npm run dev      # Start dev server on http://localhost:5001
npx tsc --noEmit # Type-check (use this, NOT npm run build)
npm run lint     # ESLint
```

No test suite is configured.

> **Next.js version note:** This project uses Next.js **16** with React 19 (app router). Verify API signatures in `node_modules/next/dist/` before writing Next.js-specific code — training data may reflect older versions.

---

## Architecture

### Route Groups

- **`(internal)/`** — Staff-facing app. Wrapped in `NPDProvider` + `LoginGate` (checks `localStorage.has_visited`). Renders `<Sidebar>` + `<TopNav>`.
  - `/dashboard/lead` — Lead dashboard (default landing after login)
  - `/dashboard/rnd` — R&D dashboard
  - `/npd/[id]` — NPD detail/workflow page (~7625 lines; drives all stage progression)
  - `/npd/new` — Multi-step NPD creation wizard
  - `/pipeline`, `/approvals`, `/archive`, `/mdm`, `/report/[id]`, `/report/all`, `/settings`
- **`(public)/`** — Supplier-facing portal (no auth). `/buyer/[id]` — "Procurement Readiness View" for buyers; `/supplier/[id]` — "Request for Development (RFD)" for suppliers. Both use seed data from `mockNPDs`.
- **`/supplier/*`** — Supplier pages outside the public group: `/quote/[id]`, `/nda/[id]`, `/dispatch/[id]`, `/status/[id]`, `/plant-delivery/[id]`, `/update/[id]`, `/ecn-sourcing/[id]` (ECN supplier sample dispatch portal).
- **`/login`** — Sets `localStorage.has_visited` and redirects into `(internal)/`.

### Data Layer

**No backend.** All persistence is `localStorage` + in-memory React state.

- `src/lib/mockData.ts` — Single source of truth: all types, seed data (`mockNPDs`), `VENDOR_CATALOG`, stage definitions, every `localStorage` key constant, and helpers (`getStageName`, `getTestsByCategory`). **Always add new localStorage keys here, never inline.**
- `src/lib/npdContext.tsx` — `NPDProvider` / `useNPDs` hook (`addNPD`, `updateNPD`). Reads/writes NPD records under key `npd_records_v1`. Only core `NPDRecord` fields go here.
- Supplier-portal interactions each have their own key in `mockData.ts`.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/mockData.ts` | All types, seed data, constants, localStorage keys, `getBundleChildren(parentId, npds)` helper |
| `src/lib/npdContext.tsx` | Global NPD state (Context + localStorage) |
| `src/lib/reportGenerator.ts` | Excel MIS export via ExcelJS (`@ts-nocheck` due to type conflicts) |
| `src/app/(internal)/npd/[id]/page.tsx` | Main NPD detail/workflow page — all stage logic (~7625 lines) |
| `src/app/(internal)/npd/new/page.tsx` | Multi-step NPD creation wizard |
| `src/app/supplier/dispatch/[id]/page.tsx` | Supplier dispatch portal — writes to both `SUPPLIER_DISPATCH_KEY` (legacy) and `MULTI_DISPATCH_KEY` |
| `src/components/LoginGate.tsx` | Auth gate — checks `localStorage.has_visited`; wraps `(internal)` layout |
| `src/components/Sidebar.tsx` | Left nav rendered in `(internal)` layout |
| `src/components/TopNav.tsx` | Top bar with breadcrumbs/actions in `(internal)` layout |
| `src/components/Tour.tsx` | Onboarding tour overlay |
| `src/lib/utils.ts` | Tailwind `cn()` helper (clsx + twMerge) |
| `src/components/ui/` | shadcn/ui components — do not hand-edit; use `npx shadcn add` |
| `src/components/PerfPatch.tsx` | Patches `performance.measure` to suppress React 19 profiling noise; rendered in root layout |

---

## Key Types

**`NPDRecord`** — core fields include `typeOfWork`, `stage`, `tatHealth`, `tatDaysRemaining`, `totalTat`, `spoc`, `supplier` (the locked final vendor), `priority`. Optional: `manufacturingLocation`, `remarks`, `tatDevelopment`, `tatProduction`. ECN-only optional fields: `ecnPartNumber`, `ecnPartName`, `ecnChangeDescription`. Bundle fields: `isBundle?: boolean` (true on parent), `parentId?: string` (set on children), `bundleItemName?: string` (per-child item name shown in bundle grid).

**`VendorRecord`** — `tier: "Tier 1" | "Tier 2" | "Tier 3" | "New"`, `status: "verified" | "audit_overdue" | "new"`, optional `isRequested?: boolean` (set on vendors added via the "Add New Vendor" form, not in the catalog).

Shared localStorage key for misc data:

| Key constant | Stores |
|---|---|
| `AICM_FETCH_KEY` | `Record<npdId, {...}>` — AICM data fetch cache |

---

## UI Stack

- **Tailwind CSS v4** (PostCSS plugin — no `tailwind.config.js`)
- **shadcn/ui** — components in `src/components/ui/`; config in `components.json`
- **@base-ui/react** — lower-level headless primitives (used alongside shadcn/ui)
- **Recharts** — wrap in a fixed-pixel-height `<div>` to suppress console warnings
- **lucide-react** for icons
- **react-joyride** — powers the `<Tour>` onboarding overlay

---

## Role System

Roles are stored in `localStorage("poc_role")` and broadcast via `CustomEvent("rolechange")`. Role groups used throughout `npd/[id]/page.tsx`:

- `isRnd` — `currentRole.startsWith("rnd") || currentRole === "super_admin"`. Gates the entire R&D section card. **DQA roles do not satisfy `isRnd`.**
- `isECN` — `npd.typeOfWork === "Engineering Change Notice (ECN)"`. Use this to branch ECN-specific UI; never include ECN in `isNCD`.
- `isNCD` — `typeOfWork === "NCD" || typeOfWork === "NPD"`. ECN is explicitly excluded.
- DQA roles (`dqa_engineer`, `dqa_lead`) have read access to NPD records and write access to DQA testing cards. They **cannot** create new requests (sidebar nav entry excluded).
- The ECN DQA Testing card (stage 5) is rendered **outside** the `{isRnd && (...)}` block so DQA roles can access it. `canEdit` inside the block enforces who can write.
- `canApprove` throughout the codebase = `currentRole === "rnd_head" || currentRole === "super_admin"`

---

## NPD Creation Wizard (`/npd/new`)

Step 1 selects work type (NCD, NPD, ECN, NTD, Compliance, Alternative Supplier). Step 2 layout differs by type — see each module's rule file for the specific form layout. Step 3 shows a review summary (tiles differ per type) and an email preview.

**NPD Lifecycle overview by `typeOfWork`:**

- **NCD (default):** 9 stages. Starts at **stage 2** (wizard skips stage 1).
- **ECN:** 8 stages. Starts at **stage 1**. Single fixed supplier set at creation.
- **Alternative Supplier (AS):** 8 stages. Starts at **stage 1**. Single supplier proposed at stage 1.
- **Compliance / Regulatory:** 6 stages. Starts at **stage 3**.
- **NTD / Cost Innovation:** Starts at **stage 2**.

Each `NPDRecord` has `stage: number` and `tatHealth: "green" | "amber" | "red" | "black"`.
