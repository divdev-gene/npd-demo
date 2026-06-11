"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ArrowLeft, AlertTriangle } from "lucide-react"
import { saveNTDRecord, setNTDInitiation, appendActivity, generateNTDId, createVersionedFile } from "@/lib/ntd"
import { NTD_COMMODITIES, type NTDCommodity } from "@/types/ntd"

interface ComponentRow {
  id: string
  name: string
  commodity: NTDCommodity
  specSlotName: string
  specLink: string
}

export default function NTDNewPage() {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [componentRows, setComponentRows] = useState<ComponentRow[]>([
    { id: "C01", name: "", commodity: "Sheet Metal", specSlotName: "", specLink: "" }
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
  }, [])

  const canCreate = currentRole.startsWith("rnd") || currentRole === "super_admin"

  const addComponentRow = () => {
    const nextNum = componentRows.length + 1
    const id = `C${String(nextNum).padStart(2, "0")}`
    setComponentRows(prev => [...prev, { id, name: "", commodity: "Sheet Metal", specSlotName: "", specLink: "" }])
  }

  const removeComponentRow = (rowId: string) => {
    if (componentRows.length > 1) setComponentRows(prev => prev.filter(r => r.id !== rowId))
  }

  const updateComponentRow = (rowId: string, field: keyof ComponentRow, value: string) => {
    setComponentRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Title is required"
    const hasValidComponent = componentRows.some(r => r.name.trim())
    if (!hasValidComponent) e.components = "At least one component with a name is required"
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)

    const id = generateNTDId()
    const now = new Date().toISOString()

    const ntdRole = currentRole === "rnd_head" ? "rnd_head" : currentRole === "super_admin" ? "super_admin" : "rnd"

    const validComponents = componentRows.filter(r => r.name.trim())
    const ntdComponents = validComponents.map(r => ({
      componentId: r.id,
      name: r.name.trim(),
      commodity: r.commodity,
    }))

    const partSpecs = validComponents
      .filter(r => r.specSlotName.trim() && r.specLink.trim())
      .map(r => createVersionedFile(r.specSlotName.trim(), r.specLink.trim(), currentRole))

    // Stage 1 is auto-submitted at creation — no approval gate, advance immediately to Stage 2
    saveNTDRecord({
      id,
      typeOfWork: "NTD",
      title: title.trim(),
      spoc: "Rohan Desai",
      created_by: currentRole,
      created_at: now,
      current_stage: 2,
      status: "active",
    })

    setNTDInitiation(id, {
      title: title.trim(),
      spoc: "Rohan Desai",
      notes: notes.trim(),
      components: ntdComponents,
      part_specs: partSpecs,
      submitted_by: currentRole,
      submitted_at: now,
    })

    appendActivity(id, currentRole, ntdRole, 1, "ntd_created",
      `NTD created: "${title.trim()}" — ${ntdComponents.length} component(s) across ${[...new Set(ntdComponents.map(c => c.commodity))].join(", ")}`)
    appendActivity(id, currentRole, ntdRole, 2, "stage_advanced", "Stage 1 auto-submitted — advanced to Stage 2 (Spec & Sign-off)")
    router.push(`/ntd/${id}`)
  }

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
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      {/* Back link */}
      <Link href="/ntd" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Tool Development
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Tool Development</h1>
        <p className="text-slate-500 text-sm mt-1">Create a new NTD record and define initial part spec files.</p>
      </div>

      {/* SPOC pill */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">SPOC assigned:</span>
        <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">Rohan Desai · Others</span>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tool Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: "" })) }}
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

        {/* Component rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Components <span className="text-red-500">*</span>
            </label>
            <button type="button" onClick={addComponentRow}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Component
            </button>
          </div>

          {errors.components && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.components}
            </p>
          )}

          {componentRows.map((row) => (
            <div key={row.id} className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{row.id}</span>
                {componentRows.length > 1 && (
                  <button type="button" onClick={() => removeComponentRow(row.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Component Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" autoComplete="off"
                    placeholder="e.g. Core Insert"
                    value={row.name}
                    onChange={e => updateComponentRow(row.id, "name", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Commodity <span className="text-red-500">*</span>
                  </label>
                  <select value={row.commodity}
                    onChange={e => updateComponentRow(row.id, "commodity", e.target.value as NTDCommodity)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    {NTD_COMMODITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spec File Name</label>
                  <input type="text" autoComplete="off"
                    placeholder="e.g. Core Insert Drawing"
                    value={row.specSlotName}
                    onChange={e => updateComponentRow(row.id, "specSlotName", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spec File Link</label>
                  <input type="text" autoComplete="off"
                    placeholder="Drive / SharePoint URL"
                    value={row.specLink}
                    onChange={e => updateComponentRow(row.id, "specLink", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <Link href="/ntd" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
        >
          {submitting ? "Creating..." : "Create NTD Record →"}
        </button>
      </div>
    </div>
  )
}
