"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ArrowLeft, AlertTriangle, FileSpreadsheet, X, CheckCircle2, Paperclip } from "lucide-react"
import { saveNTDRecord, setNTDInitiation, appendActivity, generateNTDId, createVersionedFile } from "@/lib/ntd"
import { NTD_COMMODITIES, type NTDCommodity, type NTDInitiationData } from "@/types/ntd"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ComponentRow {
  id: string
  partName: string
  referenceNo: string
  drgNo: string
  partSize: string
  material: string
  qps: string
  drwgWeight: string
  specLink: string
  attachmentName?: string
}

type RowsByCommodity = Record<NTDCommodity, ComponentRow[]>
type SpecSlot = { file_name: string; link: string; autoFilledCount?: number }

// Shared cell input style with visible borders for clarity
const cellInput =
  "w-full min-w-0 bg-white border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"

const DEMO_BY_COMMODITY: Record<NTDCommodity, string[]> = {
  "Sheet Metal": ["Core Insert", "Cavity Plate"],
  "Plastics":    ["Ejector Pin", "Runner System"],
  "EPS":         ["Guide Pillar"],
}

// Visual identity per commodity — gives each section an instant colour anchor
const COMMODITY_META: Record<NTDCommodity, {
  borderAccent: string
  headerBg: string
  countBadge: string
  addBtn: string
}> = {
  "Sheet Metal": {
    borderAccent: "border-l-blue-400",
    headerBg:     "bg-blue-50/70",
    countBadge:   "bg-blue-100 text-blue-700",
    addBtn:       "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200",
  },
  "Plastics": {
    borderAccent: "border-l-violet-400",
    headerBg:     "bg-violet-50/70",
    countBadge:   "bg-violet-100 text-violet-700",
    addBtn:       "text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200",
  },
  "EPS": {
    borderAccent: "border-l-teal-400",
    headerBg:     "bg-teal-50/70",
    countBadge:   "bg-teal-100 text-teal-700",
    addBtn:       "text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200",
  },
}

function makeId(n: number) { return `C${String(n).padStart(2, "0")}` }

function reassignIds(byComm: RowsByCommodity): RowsByCommodity {
  let counter = 1
  const result = {} as RowsByCommodity
  for (const c of NTD_COMMODITIES) {
    result[c] = (byComm[c] ?? []).map(r => ({ ...r, id: makeId(counter++) }))
  }
  return result
}

function nextId(byComm: RowsByCommodity): string {
  const all = NTD_COMMODITIES.flatMap(c => byComm[c] ?? [])
  return makeId(Math.max(0, ...all.map(r => parseInt(r.id.slice(1)))) + 1)
}

const INITIAL_ROWS: RowsByCommodity = {
  "Sheet Metal": [{ id: "C01", partName: "", referenceNo: "", drgNo: "", partSize: "", material: "", qps: "", drwgWeight: "", specLink: "", attachmentName: "" }],
  "Plastics":    [{ id: "C02", partName: "", referenceNo: "", drgNo: "", partSize: "", material: "", qps: "", drwgWeight: "", specLink: "", attachmentName: "" }],
  "EPS":         [{ id: "C03", partName: "", referenceNo: "", drgNo: "", partSize: "", material: "", qps: "", drwgWeight: "", specLink: "", attachmentName: "" }],
}

export default function NTDNewPage() {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [rowsByCommodity, setRowsByCommodity] = useState<RowsByCommodity>(INITIAL_ROWS)
  const [techSpecSheets, setTechSpecSheets] = useState<Partial<Record<NTDCommodity, SpecSlot>>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
  }, [])

  const canCreate = currentRole.startsWith("rnd") || currentRole === "super_admin"

  // ── Per-commodity row helpers ──────────────────────────────────
  const addRow = (commodity: NTDCommodity) => {
    setRowsByCommodity(prev => {
      const id = nextId(prev)
      return { ...prev, [commodity]: [...(prev[commodity] ?? []), { id, partName: "", referenceNo: "", drgNo: "", partSize: "", material: "", qps: "", drwgWeight: "", specLink: "", attachmentName: "" }] }
    })
  }

  const removeRow = (commodity: NTDCommodity, rowId: string) => {
    setRowsByCommodity(prev => {
      const updated = prev[commodity].filter(r => r.id !== rowId)
      return reassignIds({ ...prev, [commodity]: updated })
    })
  }

  const updateRow = (commodity: NTDCommodity, rowId: string, field: keyof Omit<ComponentRow, "id">, value: string) => {
    setRowsByCommodity(prev => ({
      ...prev,
      [commodity]: prev[commodity].map(r => r.id === rowId ? { ...r, [field]: value } : r),
    }))
  }

  // ── Per-commodity bulk fill ────────────────────────────────────
  const handleBulkFill = (commodity: NTDCommodity) => {
    setRowsByCommodity(prev => {
      const demoRows = DEMO_BY_COMMODITY[commodity].map(name => ({ id: "", partName: name, referenceNo: "", drgNo: "", partSize: "", material: "", qps: "", drwgWeight: "", specLink: "", attachmentName: "" }))
      return reassignIds({ ...prev, [commodity]: demoRows })
    })
    setTechSpecSheets(prev => ({
      ...prev,
      [commodity]: {
        file_name: `TechSpec_${commodity.replace(/\s+/g, "")}.xlsx`,
        link: "",
        autoFilledCount: DEMO_BY_COMMODITY[commodity].length,
      },
    }))
    setErrors(prev => ({ ...prev, components: "" }))
  }

  const removeTechSpec = (commodity: NTDCommodity) => {
    setTechSpecSheets(prev => { const n = { ...prev }; delete n[commodity]; return n })
    setRowsByCommodity(prev => reassignIds({ ...prev, [commodity]: [{ id: "", partName: "", referenceNo: "", drgNo: "", partSize: "", material: "", qps: "", drwgWeight: "", specLink: "", attachmentName: "" }] }))
  }

  // ── Validation ─────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Project title is required"
    const allRows = NTD_COMMODITIES.flatMap(c => rowsByCommodity[c] ?? [])
    if (!allRows.some(r => r.partName.trim())) e.components = "At least one component name is required"
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

    const ntdComponents = NTD_COMMODITIES.flatMap(commodity =>
      (rowsByCommodity[commodity] ?? [])
        .filter(r => r.partName.trim())
        .map(r => ({
          componentId: r.id,
          name: r.partName.trim(),
          commodity,
          referenceNo: r.referenceNo.trim(),
          drgNo: r.drgNo.trim(),
          partSize: r.partSize.trim(),
          material: r.material.trim(),
          qps: r.qps.trim(),
          drwgWeight: r.drwgWeight.trim(),
        }))
    )

    const partSpecs = NTD_COMMODITIES.flatMap(commodity =>
      (rowsByCommodity[commodity] ?? [])
        .filter(r => r.partName.trim() && r.specLink.trim())
        .map(r => createVersionedFile(r.partName.trim(), r.specLink.trim(), currentRole))
    )

    saveNTDRecord({
      id, typeOfWork: "NTD", title: title.trim(), spoc: "Rohan Desai",
      created_by: currentRole, created_at: now, current_stage: 2, status: "active",
    })

    const specSheetsPayload: NTDInitiationData["tech_spec_sheets"] = {}
    for (const [commodity, slot] of Object.entries(techSpecSheets) as [NTDCommodity, SpecSlot][]) {
      specSheetsPayload[commodity] = { file_name: slot.file_name, link: slot.link, uploaded_at: now, uploaded_by: currentRole }
    }

    setNTDInitiation(id, {
      title: title.trim(), spoc: "Rohan Desai", notes: notes.trim(),
      components: ntdComponents, part_specs: partSpecs,
      ...(Object.keys(specSheetsPayload).length > 0 ? { tech_spec_sheets: specSheetsPayload } : {}),
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

  const totalComponents = NTD_COMMODITIES.reduce((n, c) => n + (rowsByCommodity[c]?.length ?? 0), 0)
  const namedComponents = NTD_COMMODITIES.reduce(
    (n, c) => n + (rowsByCommodity[c]?.filter(r => r.partName.trim()).length ?? 0), 0
  )

  return (
    <div className="max-w-full px-4 py-6 space-y-5">

      {/* ── Back nav + page header ── */}
      <div className="space-y-2">
        <Link
          href="/ntd"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tool Development
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">New Tool Development</h1>
            <p className="text-slate-500 text-sm mt-1">
              Name the project, then add components per commodity. Spec links and file attachments are optional at this stage.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              SPOC: Rohan Desai
            </span>
            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">
              Stage 1 → 2 on submit
            </span>
          </div>
        </div>
      </div>

      {/* ── Project info card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Project Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="ntd-title"
              className="text-xs font-semibold text-slate-600 flex items-center gap-1"
            >
              Project Title
              <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="ntd-title"
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: "" })) }}
              placeholder="e.g. Core Insert Mould — Line 3"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "title-error" : undefined}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                errors.title ? "border-red-300 bg-red-50/40" : "border-slate-200 hover:border-slate-300"
              }`}
            />
            {errors.title && (
              <p id="title-error" className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="ntd-notes" className="text-xs font-semibold text-slate-600">
              Project Description
              <span className="ml-1.5 text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="ntd-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Background context, scope, special requirements…"
              rows={2}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Component validation error ── */}
      {errors.components && (
        <div
          role="alert"
          className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          {errors.components}
        </div>
      )}

      {/* ── One table per commodity ── */}
      {NTD_COMMODITIES.map(commodity => {
        const rows = rowsByCommodity[commodity] ?? []
        const slot = techSpecSheets[commodity]
        const meta = COMMODITY_META[commodity]
        const namedInSection = rows.filter(r => r.partName.trim()).length

        return (
          <div
            key={commodity}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${meta.borderAccent} shadow-sm overflow-hidden`}
          >
            {/* Commodity header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b border-slate-100 ${meta.headerBg}`}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-800">{commodity}</span>
                {/* Named / total count — always visible */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.countBadge}`}>
                  {namedInSection} / {rows.length}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {namedInSection === 1 ? "component named" : "components named"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Tech spec loader / chip */}
                {slot ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-700 font-medium max-w-[120px] truncate">{slot.file_name}</span>
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      {slot.autoFilledCount} filled
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTechSpec(commodity)}
                      aria-label={`Remove spec sheet for ${commodity}`}
                      className="text-emerald-400 hover:text-emerald-700 ml-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBulkFill(commodity)}
                    title={`Demo: auto-fills ${DEMO_BY_COMMODITY[commodity].length} sample components for ${commodity}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Load Spec Sheet
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => addRow(commodity)}
                  className={`flex items-center gap-1 text-xs font-semibold border px-3 py-1.5 rounded-lg transition-colors ${meta.addBtn}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Component
                </button>
              </div>
            </div>

            {/* Component Table - Full Width */}
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="w-[4%] text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">ID</TableHead>
                  <TableHead className="w-[16%] text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part Name</TableHead>
                  <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ref. No.</TableHead>
                  <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drg. No.</TableHead>
                  <TableHead className="w-[8%] text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Size (mm)</TableHead>
                  <TableHead className="w-[14%] text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material</TableHead>
                  <TableHead className="w-[6%] text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">QPS</TableHead>
                  <TableHead className="w-[8%] text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Wt. (gms)</TableHead>
                  <TableHead className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spec Link</TableHead>
                  <TableHead className="w-[4%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-20 text-center text-sm text-slate-400 italic">
                      No components yet — click "Add Component" or load a spec sheet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/40" : ""}`}
                    >
                      {/* ID */}
                      <TableCell className="px-3 py-2 text-center">
                        <span
                          aria-label={`Component ID ${row.id}`}
                          className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block"
                        >
                          {row.id}
                        </span>
                      </TableCell>

                      {/* Part Name */}
                      <TableCell className="px-3 py-2">
                        <input
                          id={`partName-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="Part name"
                          value={row.partName}
                          onChange={e => updateRow(commodity, row.id, "partName", e.target.value)}
                          aria-label={`Part name for ${row.id}`}
                          className={`${cellInput} w-full`}
                        />
                      </TableCell>

                      {/* Reference No. */}
                      <TableCell className="px-3 py-2">
                        <input
                          id={`referenceNo-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="Ref #"
                          value={row.referenceNo}
                          onChange={e => updateRow(commodity, row.id, "referenceNo", e.target.value)}
                          aria-label={`Reference number for ${row.id}`}
                          className={`${cellInput} w-full`}
                        />
                      </TableCell>

                      {/* Drg. No. */}
                      <TableCell className="px-3 py-2">
                        <input
                          id={`drgNo-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="Drg #"
                          value={row.drgNo}
                          onChange={e => updateRow(commodity, row.id, "drgNo", e.target.value)}
                          aria-label={`Drawing number for ${row.id}`}
                          className={`${cellInput} w-full`}
                        />
                      </TableCell>

                      {/* Part Size (mm) */}
                      <TableCell className="px-3 py-2 text-center">
                        <input
                          id={`partSize-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="mm"
                          value={row.partSize}
                          onChange={e => updateRow(commodity, row.id, "partSize", e.target.value)}
                          aria-label={`Part size for ${row.id}`}
                          className={`${cellInput} w-full text-center`}
                        />
                      </TableCell>

                      {/* Material */}
                      <TableCell className="px-3 py-2">
                        <input
                          id={`material-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="Material"
                          value={row.material}
                          onChange={e => updateRow(commodity, row.id, "material", e.target.value)}
                          aria-label={`Material for ${row.id}`}
                          className={`${cellInput} w-full`}
                        />
                      </TableCell>

                      {/* QPS */}
                      <TableCell className="px-3 py-2 text-center">
                        <input
                          id={`qps-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="QPS"
                          value={row.qps}
                          onChange={e => updateRow(commodity, row.id, "qps", e.target.value)}
                          aria-label={`QPS for ${row.id}`}
                          className={`${cellInput} w-full text-center`}
                        />
                      </TableCell>

                      {/* Drwg Weight (gms) */}
                      <TableCell className="px-3 py-2 text-center">
                        <input
                          id={`drwgWeight-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                          type="text"
                          autoComplete="off"
                          placeholder="gms"
                          value={row.drwgWeight}
                          onChange={e => updateRow(commodity, row.id, "drwgWeight", e.target.value)}
                          aria-label={`Drawing weight for ${row.id}`}
                          className={`${cellInput} w-full text-center`}
                        />
                      </TableCell>

                      {/* Spec Link + Attachment */}
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`spec-${commodity.replace(/\s+/g, "-")}-${row.id}`}
                            type="text"
                            autoComplete="off"
                            placeholder="Drive / SharePoint URL"
                            value={row.specLink}
                            onChange={e => updateRow(commodity, row.id, "specLink", e.target.value)}
                            aria-label={`Spec link for component ${row.id}`}
                            className={`${cellInput} flex-1 min-w-0`}
                          />

                          {/* Icon-only attach - POC demo click */}
                          <button
                            type="button"
                            onClick={() => {
                              const demoFileNames = ["spec.pdf", "drawing.dwg", "model.step", "doc.pdf"]
                              const randomFile = demoFileNames[Math.floor(Math.random() * demoFileNames.length)]
                              updateRow(commodity, row.id, "attachmentName", randomFile)
                            }}
                            title={row.attachmentName ? `Attached: ${row.attachmentName}` : "Click to attach (demo)"}
                            className={`shrink-0 cursor-pointer p-1.5 rounded-md transition-colors relative ${
                              row.attachmentName
                                ? "bg-violet-100 text-violet-600 hover:bg-violet-200"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                         
                          </button>

                          {/* Clear attachment */}
                          {row.attachmentName && (
                            <button
                              type="button"
                              onClick={() => updateRow(commodity, row.id, "attachmentName", "")}
                              title={`Remove ${row.attachmentName}`}
                              aria-label={`Remove attachment from component ${row.id}`}
                              className="shrink-0 text-slate-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Filename chip */}
                   
                      </TableCell>

                      {/* Delete row */}
                      <TableCell className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(commodity, row.id)}
                          aria-label={`Remove component ${row.id} from ${commodity}`}
                          className="inline-flex items-center justify-center p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )
      })}

      {/* ── Submit footer ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
        <div className="flex items-center gap-4">
          <Link
            href="/ntd"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <span className="text-xs text-slate-400">
            {namedComponents} of {totalComponents} component{totalComponents !== 1 ? "s" : ""} named
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 active:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {submitting ? "Creating…" : "Create NTD Record →"}
        </button>
      </div>

    </div>
  )
}
