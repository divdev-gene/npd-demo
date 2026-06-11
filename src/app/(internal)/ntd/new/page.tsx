"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ArrowLeft, AlertTriangle } from "lucide-react"
import { saveNTDRecord, setNTDInitiation, appendActivity, generateNTDId, createVersionedFile } from "@/lib/ntd"

interface FileSlot {
  id: string
  slotName: string
  link: string
}

export default function NTDNewPage() {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([{ id: "1", slotName: "", link: "" }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
  }, [])

  const canCreate = currentRole.startsWith("rnd") || currentRole === "super_admin"

  const addSlot = () => {
    setFileSlots(prev => [...prev, { id: String(Date.now()), slotName: "", link: "" }])
  }

  const removeSlot = (id: string) => {
    if (fileSlots.length > 1) setFileSlots(prev => prev.filter(s => s.id !== id))
  }

  const updateSlot = (id: string, field: "slotName" | "link", value: string) => {
    setFileSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Title is required"
    const hasValidSlot = fileSlots.some(s => s.slotName.trim() && s.link.trim())
    if (!hasValidSlot) e.files = "At least one file slot with a name and link is required"
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)

    const id = generateNTDId()
    const now = new Date().toISOString()

    const ntdRole = currentRole === "rnd_head" ? "rnd_head" : currentRole === "super_admin" ? "super_admin" : "rnd"

    saveNTDRecord({
      id,
      typeOfWork: "NTD",
      title: title.trim(),
      spoc: "Rohan Desai",
      created_by: currentRole,
      created_at: now,
      current_stage: 1,
      status: "active",
    })

    setNTDInitiation(id, {
      title: title.trim(),
      spoc: "Rohan Desai",
      notes: notes.trim(),
      part_specs: fileSlots
        .filter(s => s.slotName.trim() && s.link.trim())
        .map(s => createVersionedFile(s.slotName.trim(), s.link.trim(), currentRole)),
      submitted_by: currentRole,
      submitted_at: now,
    })

    appendActivity(id, currentRole, ntdRole, 1, "ntd_created", `NTD created: ${title.trim()}`)
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

        {/* Part Spec Files */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Part Spec Files <span className="text-red-500">*</span>
            </label>
            <button onClick={addSlot}
              className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add File Slot
            </button>
          </div>

          {errors.files && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errors.files}
            </p>
          )}

          <div className="space-y-2">
            {fileSlots.map((slot, i) => (
              <div key={slot.id} className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder={`Slot name (e.g. Drawing Package ${i + 1})`}
                    value={slot.slotName}
                    onChange={e => { updateSlot(slot.id, "slotName", e.target.value); setErrors(prev => ({ ...prev, files: "" })) }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="url"
                    placeholder="Drive / SharePoint link"
                    value={slot.link}
                    onChange={e => { updateSlot(slot.id, "link", e.target.value); setErrors(prev => ({ ...prev, files: "" })) }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <button
                  onClick={() => removeSlot(slot.id)}
                  disabled={fileSlots.length === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-start mt-1"
                  aria-label="Remove file slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Part spec files defined here can be revised (new versions uploaded) but the slots themselves are permanent after submission.
            </p>
          </div>
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
