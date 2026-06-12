# NTD New Page Redesign — Design Spec
**Date:** 2026-06-12  
**Scope:** `/ntd/new` form page + Stage 1 card downstream display  
**Stack:** Next.js App Router, TypeScript, Tailwind v4, shadcn/ui  

---

## Problem

The current `/ntd/new` page uses `max-w-2xl` with a single-column card layout, leaving most of a widescreen empty. There is no bulk-entry path — users must add every component row manually. Component rows are dense bordered cards that stack poorly at scale.

---

## Goals

1. Full-width two-column layout that uses widescreen space
2. Bulk upload path: upload Excel tech spec sheet → auto-fills component rows (random data for demo)
3. Tech spec sheet stored as a master document and surfaced on the Stage 1 card downstream
4. Flat table-style component rows (denser, more scannable than current card-per-row)

---

## Layout

Container: `max-w-5xl mx-auto`, two-column grid: `grid-cols-[380px_1fr] gap-8`

```
┌──────────────────────────┬──────────────────────────────────────────┐
│  LEFT (380px fixed)      │  RIGHT (flex-grow)                       │
│                          │                                          │
│  [Tool Title *]          │  ┌─ Components ──────────────── + Add ─┐ │
│  [Notes]                 │  │  C01 [name ───────] [Commodity ▼]   │ │
│                          │  │      [Spec link ──────────────────]  │ │
│  ─── or fill manually ── │  │  C02 [name ───────] [Commodity ▼]   │ │
│                          │  │      [Spec link ──────────────────]  │ │
│  ┌── Tech Spec Sheet ──┐ │  └──────────────────────────────────────┘ │
│  │  ⬆ Drop Excel here  │ │                                          │
│  │  or click to upload │ │              [  Create NTD Record →  ]   │
│  └─────────────────────┘ │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
```

---

## Data Model Change

`NTDInitiationData` in `src/types/ntd.ts` gains one new optional field:

```ts
tech_spec_sheet?: {
  file_name: string
  link: string           // Drive/SharePoint URL or base64 data URL
  uploaded_at: string
  uploaded_by: string
}
```

The existing `part_specs: VersionedFile[]` array is unchanged — it holds per-component Drive links. `tech_spec_sheet` is a flat object (no revision history needed at initiation stage).

---

## Left Panel

### Tool Title
Required text input. `w-full`, rounded-xl, focus ring blue.

### Notes
Optional textarea, 3 rows, resize-none.

### Divider
```
──────── or fill manually ────────
```
Thin slate-200 line with centered label. Visually separates meta fields from the upload zone without implying they are separate steps.

### Tech Spec Sheet Upload Zone
- Style: `border-2 border-dashed border-blue-200 bg-blue-50 rounded-xl p-6 text-center cursor-pointer`
- Icon: `FileSpreadsheet` (lucide-react) in blue-400
- Label: "Upload Tech Spec Sheet" + sub-label "Excel (.xlsx / .xls) · auto-fills components"
- Accepts: `<input type="file" accept=".xlsx,.xls" className="sr-only" />`
- Hidden real input, entire zone is clickable

**After upload (success state):**
- Replace zone with a slate pill: `📄 filename.xlsx` + `× remove` button
- Below pill: emerald text "✓ N components auto-filled"

**Demo bulk-fill logic (`handleBulkUpload`):**
Ignores actual file contents. Generates a fixed set of realistic component rows:
```ts
const DEMO_COMPONENTS = [
  { name: "Core Insert",     commodity: "Sheet Metal" },
  { name: "Cavity Plate",    commodity: "Sheet Metal" },
  { name: "Ejector Pin",     commodity: "Plastics"    },
  { name: "Runner System",   commodity: "Plastics"    },
  { name: "Guide Pillar",    commodity: "EPS"         },
]
```
Replaces current `componentRows` state with these 5 rows, each assigned C01–C05 IDs. Existing user-entered rows are discarded (user is warned via the success message).

---

## Right Panel

### Component List Header
Row: "Components *" label left, `+ Add Component` button right (indigo-50 bg, indigo-700 text).

### Component Rows (flat table style)
Each row is a single horizontal strip (not a bordered card):

```
[C01] [Component Name ─────────────────] [Commodity ▼] [🔗 Spec link (optional) ────] [🗑]
```

- `C01` badge: `text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded`
- Name input: `flex-1 min-w-0`
- Commodity select: `w-36`
- Spec link input: `w-52 text-sm placeholder:text-slate-300`
- Trash icon: `text-slate-300 hover:text-red-400`, hidden when only 1 row remains
- Rows separated by `border-b border-slate-100`

### Submit Button
`w-full` of the right column, bottom-aligned. `bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-xl py-2.5`.

---

## Downstream: Stage 1 Card in `/ntd/[id]/page.tsx`

The existing Stage 1 done-card subtitle changes from:

```
Submitted by {initData.submitted_by} · {initData.part_specs.length} spec file(s)
```

to:

```
Submitted by {initData.submitted_by}
{initData.tech_spec_sheet && " · Tech Spec: " + initData.tech_spec_sheet.file_name}
· {initData.part_specs.length} spec file(s)
```

The file link row gains a leading entry for the tech spec sheet when present:

```tsx
{initData.tech_spec_sheet && (
  <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
    <FileSpreadsheet className="w-3 h-3" />
    {initData.tech_spec_sheet.file_name}
    <span className="text-slate-400">· master spec</span>
  </span>
)}
```

Shown as a pill (not a link) since the base64 data URL from a demo file upload is not a shareable URL. If `tech_spec_sheet.link` is an http URL (Drive link), render as an `<a>` instead.

---

## Files to Change

| File | Change |
|------|--------|
| `src/types/ntd.ts` | Add `tech_spec_sheet?` field to `NTDInitiationData` |
| `src/app/(internal)/ntd/new/page.tsx` | Full redesign per this spec |
| `src/app/(internal)/ntd/[id]/page.tsx` | Update Stage 1 done-card to show tech spec sheet |

---

## Out of Scope

- Actual Excel parsing (demo only — random fill)
- Version history for the tech spec sheet
- Spec sheet shown on supplier portal or RFQ vendor portal
