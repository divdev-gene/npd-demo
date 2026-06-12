# NTD New Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/ntd/new` into a two-column widescreen layout with a bulk Excel upload path that auto-fills component rows, and surface the uploaded tech spec sheet on the Stage 1 done-card downstream.

**Architecture:** Three-file change. Type extended first (Task 1), then the creation form fully rewritten (Task 2), then the detail page Stage 1 card updated to display the new field (Task 3). No new files created — changes are self-contained within existing files.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind v4, lucide-react. No test suite — verify each task with `npx tsc --noEmit`.

---

## File Map

| File | Change |
|------|--------|
| `src/types/ntd.ts` | Add `tech_spec_sheet?` to `NTDInitiationData` (line ~147) |
| `src/app/(internal)/ntd/new/page.tsx` | Full rewrite — two-column layout, bulk upload, flat component rows |
| `src/app/(internal)/ntd/[id]/page.tsx` | Update Stage 1 done-card to show `tech_spec_sheet` when present |

---

## Task 1: Extend NTDInitiationData with tech_spec_sheet field

**Files:**
- Modify: `src/types/ntd.ts:147-155`

- [ ] **Step 1: Add the new optional field to NTDInitiationData**

In `src/types/ntd.ts`, replace the `NTDInitiationData` type (lines 147–155):

```ts
export type NTDInitiationData = {
  title: string
  spoc: "Rohan Desai"
  notes: string
  components: NTDComponent[]          // captured at creation; commodity-tagged
  part_specs: VersionedFile[]
  tech_spec_sheet?: {
    file_name: string
    link: string                       // Drive/SharePoint URL or base64 data URL
    uploaded_at: string
    uploaded_by: string
  }
  submitted_by: string
  submitted_at: string
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: no errors (field is optional, existing callers pass no new args).

- [ ] **Step 3: Commit**

```bash
git add src/types/ntd.ts
git commit -m "feat(ntd): add tech_spec_sheet field to NTDInitiationData"
```

---

## Task 2: Rewrite /ntd/new page — two-column layout + bulk upload

**Files:**
- Modify: `src/app/(internal)/ntd/new/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the entire file with the new implementation**

Replace the full contents of `src/app/(internal)/ntd/new/page.tsx` with:

```tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ArrowLeft, AlertTriangle, FileSpreadsheet, X, CheckCircle2 } from "lucide-react"
import { saveNTDRecord, setNTDInitiation, appendActivity, generateNTDId, createVersionedFile } from "@/lib/ntd"
import { NTD_COMMODITIES, type NTDCommodity } from "@/types/ntd"

interface ComponentRow {
  id: string
  name: string
  commodity: NTDCommodity
  specLink: string
}

const DEMO_COMPONENTS: { name: string; commodity: NTDCommodity }[] = [
  { name: "Core Insert",   commodity: "Sheet Metal" },
  { name: "Cavity Plate",  commodity: "Sheet Metal" },
  { name: "Ejector Pin",   commodity: "Plastics"    },
  { name: "Runner System", commodity: "Plastics"    },
  { name: "Guide Pillar",  commodity: "EPS"         },
]

function makeId(n: number) {
  return `C${String(n).padStart(2, "0")}`
}

export default function NTDNewPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentRole, setCurrentRole] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [componentRows, setComponentRows] = useState<ComponentRow[]>([
    { id: "C01", name: "", commodity: "Sheet Metal", specLink: "" }
  ])
  const [techSpecSheet, setTechSpecSheet] = useState<{ file_name: string; link: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
  }, [])

  const canCreate = currentRole.startsWith("rnd") || currentRole === "super_admin"

  // ── Component row helpers ──────────────────────────────────────
  const addComponentRow = () => {
    const nextNum = componentRows.length + 1
    setComponentRows(prev => [...prev, { id: makeId(nextNum), name: "", commodity: "Sheet Metal", specLink: "" }])
  }

  const removeComponentRow = (rowId: string) => {
    if (componentRows.length > 1)
      setComponentRows(prev => prev.filter(r => r.id !== rowId))
  }

  const updateRow = (rowId: string, field: keyof ComponentRow, value: string) => {
    setComponentRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r))
  }

  // ── Bulk upload (demo: ignores file contents, fills fixed sample data) ──
  const handleBulkUpload = (file: File) => {
    setTechSpecSheet({ file_name: file.name, link: "" })
    setComponentRows(
      DEMO_COMPONENTS.map((c, i) => ({ id: makeId(i + 1), name: c.name, commodity: c.commodity, specLink: "" }))
    )
    setErrors(prev => ({ ...prev, components: "" }))
    const reader = new FileReader()
    reader.onload = () => setTechSpecSheet({ file_name: file.name, link: reader.result as string })
    reader.readAsDataURL(file)
  }

  const removeTechSpec = () => {
    setTechSpecSheet(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── Validation ─────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Title is required"
    if (!componentRows.some(r => r.name.trim())) e.components = "At least one component name is required"
    return e
  }

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)

    const id = generateNTDId()
    const now = new Date().toISOString()
    const ntdRole = currentRole === "rnd_head" ? "rnd_head" : currentRole === "super_admin" ? "super_admin" : "rnd"

    const validRows = componentRows.filter(r => r.name.trim())
    const ntdComponents = validRows.map(r => ({ componentId: r.id, name: r.name.trim(), commodity: r.commodity }))
    const partSpecs = validRows
      .filter(r => r.specLink.trim())
      .map(r => createVersionedFile(r.name.trim(), r.specLink.trim(), currentRole))

    saveNTDRecord({
      id, typeOfWork: "NTD", title: title.trim(), spoc: "Rohan Desai",
      created_by: currentRole, created_at: now, current_stage: 2, status: "active",
    })

    setNTDInitiation(id, {
      title: title.trim(), spoc: "Rohan Desai", notes: notes.trim(),
      components: ntdComponents, part_specs: partSpecs,
      ...(techSpecSheet ? { tech_spec_sheet: { file_name: techSpecSheet.file_name, link: techSpecSheet.link, uploaded_at: now, uploaded_by: currentRole } } : {}),
      submitted_by: currentRole, submitted_at: now,
    })

    appendActivity(id, currentRole, ntdRole, 1, "ntd_created",
      `NTD created: "${title.trim()}" — ${ntdComponents.length} component(s) across ${[...new Set(ntdComponents.map(c => c.commodity))].join(", ")}`)
    appendActivity(id, currentRole, ntdRole, 2, "stage_advanced", "Stage 1 auto-submitted — advanced to Stage 2 (Spec & Sign-off)")
    router.push(`/ntd/${id}`)
  }

  // ── Access gate ────────────────────────────────────────────────
  if (!canCreate) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 text-sm">Only R&D roles can create new tool development records.</p>
        <Link href="/ntd" className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to NTD list
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Back + header */}
      <div className="space-y-1">
        <Link href="/ntd" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Tool Development
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Tool Development</h1>
            <p className="text-slate-500 text-sm mt-0.5">Create a new NTD record and define initial part spec files.</p>
          </div>
          <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full shrink-0">
            SPOC: Rohan Desai · Others
          </span>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[380px_1fr] gap-8 items-start">

        {/* ── LEFT: project meta + tech spec upload ── */}
        <div className="space-y-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tool Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: "" })) }}
              placeholder="e.g. Core Insert Mould — Line 3"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.title ? "border-red-300" : "border-slate-200"}`}
            />
            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Background context, scope, requirements..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium shrink-0">or fill manually →</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Tech Spec Sheet upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tech Spec Sheet</label>

            {techSpecSheet ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{techSpecSheet.file_name}</span>
                  <button type="button" onClick={removeTechSpec} className="text-slate-400 hover:text-slate-600 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {DEMO_COMPONENTS.length} components auto-filled from spec sheet
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-6 text-center cursor-pointer transition-colors">
                <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-blue-700">Upload Tech Spec Sheet</p>
                  <p className="text-xs text-blue-500 mt-0.5">Excel (.xlsx / .xls) · auto-fills components</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkUpload(f) }}
                />
              </label>
            )}
          </div>
        </div>

        {/* ── RIGHT: component list + submit ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">
                Components <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-slate-400">{componentRows.length} added</span>
              </span>
              <button type="button" onClick={addComponentRow}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Component
              </button>
            </div>

            {errors.components && (
              <div className="px-5 py-2 bg-red-50 border-b border-red-100 flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {errors.components}
              </div>
            )}

            {/* Column labels */}
            <div className="grid grid-cols-[40px_1fr_144px_1fr_32px] gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Component Name</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commodity</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spec Link (optional)</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {componentRows.map(row => (
                <div key={row.id} className="grid grid-cols-[40px_1fr_144px_1fr_32px] gap-3 px-5 py-2.5 items-center">
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-center">{row.id}</span>

                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Core Insert"
                    value={row.name}
                    onChange={e => updateRow(row.id, "name", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />

                  <select
                    value={row.commodity}
                    onChange={e => updateRow(row.id, "commodity", e.target.value as NTDCommodity)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {NTD_COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Drive / SharePoint URL"
                    value={row.specLink}
                    onChange={e => updateRow(row.id, "specLink", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-300"
                  />

                  <button
                    type="button"
                    onClick={() => removeComponentRow(row.id)}
                    disabled={componentRows.length === 1}
                    className="flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link href="/ntd" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Cancel</Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              {submitting ? "Creating..." : "Create NTD Record →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(internal\)/ntd/new/page.tsx
git commit -m "feat(ntd): redesign new page — two-column layout, bulk Excel upload, flat component rows"
```

---

## Task 3: Update Stage 1 done-card to display tech_spec_sheet

**Files:**
- Modify: `src/app/(internal)/ntd/[id]/page.tsx` (Stage 1 card block, lines ~568–606)

The Stage 1 card is built around line 568. It currently renders `initData.part_specs.length` in the subtitle and a list of spec file links. We add a tech spec sheet pill before the per-component links.

- [ ] **Step 1: Add FileSpreadsheet to the lucide-react import**

Find the lucide-react import at line ~5 of `src/app/(internal)/ntd/[id]/page.tsx`:

```tsx
import {
  CheckCircle2, Circle, ChevronRight, ArrowLeft, Wrench,
  AlertTriangle, ExternalLink, Plus, Trash2, Copy, Check,
  Users, Clock, Package, Building2, Paperclip, X
} from "lucide-react"
```

Add `FileSpreadsheet` to that import:

```tsx
import {
  CheckCircle2, Circle, ChevronRight, ArrowLeft, Wrench,
  AlertTriangle, ExternalLink, Plus, Trash2, Copy, Check,
  Users, Clock, Package, Building2, Paperclip, X, FileSpreadsheet
} from "lucide-react"
```

- [ ] **Step 2: Update the Stage 1 subtitle line**

Find this line (~576):
```tsx
<p className="text-[11px] text-slate-400">
  Submitted by {initData.submitted_by} · {initData.part_specs.length} spec file(s)
</p>
```

Replace with:
```tsx
<p className="text-[11px] text-slate-400">
  Submitted by {initData.submitted_by}
  {initData.tech_spec_sheet && ` · Tech Spec: ${initData.tech_spec_sheet.file_name}`}
  {initData.part_specs.length > 0 && ` · ${initData.part_specs.length} spec file(s)`}
</p>
```

- [ ] **Step 3: Add tech spec sheet pill in the file links row**

Find this block (~586–602):
```tsx
<div className="flex flex-wrap gap-4">
  {initData.part_specs.map(f => {
    const link = f.versions.find(v => v.version_no === f.current_version)?.link ?? ""
    return link ? (
      <a key={f.file_id} href={link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-700 hover:underline">
        <ExternalLink className="w-3 h-3" />
        {f.slot_name}
        <span className="text-slate-400">v{f.current_version}</span>
      </a>
    ) : (
      <span key={f.file_id} className="flex items-center gap-1 text-xs text-slate-400">
        <ExternalLink className="w-3 h-3" /> {f.slot_name} (no link)
      </span>
    )
  })}
</div>
```

Replace with:
```tsx
<div className="flex flex-wrap gap-3">
  {initData.tech_spec_sheet && (
    initData.tech_spec_sheet.link.startsWith("http") ? (
      <a href={initData.tech_spec_sheet.link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors">
        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
        {initData.tech_spec_sheet.file_name}
        <span className="text-slate-400 ml-1">· master spec</span>
      </a>
    ) : (
      <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
        {initData.tech_spec_sheet.file_name}
        <span className="text-slate-400 ml-1">· master spec</span>
      </span>
    )
  )}
  {initData.part_specs.map(f => {
    const link = f.versions.find(v => v.version_no === f.current_version)?.link ?? ""
    return link ? (
      <a key={f.file_id} href={link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-700 hover:underline">
        <ExternalLink className="w-3 h-3" />
        {f.slot_name}
        <span className="text-slate-400">v{f.current_version}</span>
      </a>
    ) : (
      <span key={f.file_id} className="flex items-center gap-1 text-xs text-slate-400">
        <ExternalLink className="w-3 h-3" /> {f.slot_name} (no link)
      </span>
    )
  })}
</div>
```

- [ ] **Step 4: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/ntd/\[id\]/page.tsx
git commit -m "feat(ntd): show tech spec sheet in Stage 1 done-card"
```
