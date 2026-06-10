"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, AlertTriangle, ArrowLeft } from "lucide-react"
import { generateNTDId, saveNTDRecord, setNTDInitiation } from "@/lib/ntd"
import type { NTDComponent } from "@/types/ntd"

function padId(n: number): string {
  return `C${String(n).padStart(2, "0")}`
}

export default function NTDNewPage() {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState("rnd_user")

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "rnd_user")
    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRoleChange as EventListener)
    return () => window.removeEventListener("rolechange", onRoleChange as EventListener)
  }, [])

  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"

  // Form state
  const [title, setTitle] = useState("")
  const [briefDoc, setBriefDoc] = useState("")
  const [master3d, setMaster3d] = useState("")
  const [components, setComponents] = useState<{ id: string; name: string }[]>([
    { id: padId(1), name: "" },
  ])
  const [submitting, setSubmitting] = useState(false)

  if (!isRnd) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-[15px] font-bold text-slate-800">Access Denied</p>
        <p className="text-[13px] text-slate-400 mt-1 max-w-xs">
          Only R&D roles can create NTD requests.
        </p>
        <Link href="/ntd" className="mt-4 text-[13px] text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to NTD List
        </Link>
      </div>
    )
  }

  function addComponent() {
    if (components.length >= 30) return
    setComponents((prev) => [
      ...prev,
      { id: padId(prev.length + 1), name: "" },
    ])
  }

  function removeComponent(index: number) {
    if (components.length <= 1) return
    setComponents((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Re-assign IDs sequentially
      return next.map((c, i) => ({ ...c, id: padId(i + 1) }))
    })
  }

  function updateComponentName(index: number, value: string) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, name: value } : c))
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const trimmedTitle = title.trim()
    const trimmedBrief = briefDoc.trim()
    const trimmedMaster = master3d.trim()

    if (!trimmedTitle || !trimmedBrief || !trimmedMaster) return
    if (components.some((c) => !c.name.trim())) return

    setSubmitting(true)

    const id = generateNTDId()
    const now = new Date().toISOString()

    const ntdComponents: NTDComponent[] = components.map((c) => ({
      componentId: c.id,
      name: c.name.trim(),
    }))

    saveNTDRecord({
      id,
      typeOfWork: "NTD",
      title: trimmedTitle,
      created_by: currentRole,
      created_at: now,
      current_stage: 1,
      component_count: ntdComponents.length,
    })

    setNTDInitiation(id, {
      brief_doc: trimmedBrief,
      master_3d: trimmedMaster,
      components: ntdComponents,
      submitted_at: now,
      status: "pending",
    })

    router.push(`/ntd/${id}`)
  }

  const allFilled =
    title.trim() !== "" &&
    briefDoc.trim() !== "" &&
    master3d.trim() !== "" &&
    components.every((c) => c.name.trim() !== "")

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <Link
          href="/ntd"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          NTD List
        </Link>
        <h1 className="text-[16px] font-bold text-slate-900">New Tool Development</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Create a new NTD initiation request</p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

          {/* Basic info */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Tool Details</h2>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Core Insert Mould for Compressor Housing"
                required
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Tool Brief Doc (link/ref) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={briefDoc}
                onChange={(e) => setBriefDoc(e.target.value)}
                placeholder="e.g. https://drive.google.com/… or GD-BRIEF-2026-001"
                required
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Master 3D Data (link/ref) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={master3d}
                onChange={(e) => setMaster3d(e.target.value)}
                placeholder="e.g. https://drive.google.com/… or 3D-MASTER-2026-001"
                required
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          {/* Component builder */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Components</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{components.length} Component(s) Added</p>
              </div>
              <button
                type="button"
                onClick={addComponent}
                disabled={components.length >= 30}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Component
              </button>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 font-medium">
                Component list cannot be changed after submission.
              </p>
            </div>

            {/* Component rows */}
            <div className="space-y-2">
              {components.map((comp, index) => (
                <div key={comp.id} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400 w-8 shrink-0 text-right">
                    {comp.id}
                  </span>
                  <input
                    type="text"
                    value={comp.name}
                    onChange={(e) => updateComponentName(index, e.target.value)}
                    placeholder={`Component name (e.g. Core Insert ${index + 1})`}
                    required
                    className="flex-1 px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeComponent(index)}
                    disabled={components.length <= 1}
                    title="Remove component"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!allFilled || submitting}
              className="flex items-center gap-2 bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating…" : "Submit & Create NTD"}
            </button>
            <Link
              href="/ntd"
              className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
