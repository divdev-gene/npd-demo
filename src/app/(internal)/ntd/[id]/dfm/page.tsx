"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Package, Link2, Copy, Check as CheckIcon, ExternalLink } from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, getNTDDFM, setNTDDFM,
  getNTDInitiation,
  advanceNTDStage, appendActivity,
  createVersionedFile, addFileVersion, addFileComment, resolveComment, approveFile,
} from "@/lib/ntd"
import type { NTDRecord, NTDDFMData, NTDDFMComponent, NTDRole, NTDCommodity, NTDInitiationData } from "@/types/ntd"
import { ComponentApprovalBoard } from "@/components/ntd/ComponentApprovalBoard"

const SOURCING_SPOC_ROLES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi", "Rohan Desai"]

function toNTDRole(pocRole: string): NTDRole {
  if (pocRole === "rnd_head") return "rnd_head"
  if (pocRole === "sourcing_head") return "sourcing_head"
  if (pocRole === "super_admin") return "super_admin"
  if (pocRole === "exim") return "exim"
  if (pocRole.startsWith("rnd")) return "rnd"
  if (pocRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(pocRole)) return "sourcing"
  return "rnd"
}

export default function DFMPage() {
  const params = useParams()
  const id = params.id as string
  const [currentRole, setCurrentRole] = useState("")
  const [record, setRecord] = useState<NTDRecord | null>(null)
  const [dfmData, setDFMData] = useState<NTDDFMData | null>(null)
  const [initiationData, setInitiationData] = useState<NTDInitiationData | null>(null)
  const [selectedCommodity, setSelectedCommodity] = useState<NTDCommodity | "All">("All")

  // PO activity form
  const [poNumber, setPoNumber] = useState("")
  const [copied, setCopied] = useState(false)
  const isEditingRef = React.useRef(false)

  const reload = useCallback(() => {
    const r = getNTDRecord(id)
    if (r) setRecord(r)
    setDFMData(getDFMOrInit(id))
    const init = getNTDInitiation(id)
    if (init) setInitiationData(init)
  }, [id])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") ?? "rnd_engineer")
    reload()
    const t = setInterval(() => { if (!isEditingRef.current) reload() }, 3000)
    const onRole = () => setCurrentRole(localStorage.getItem("poc_role") ?? "")
    window.addEventListener("rolechange", onRole)
    return () => { clearInterval(t); window.removeEventListener("rolechange", onRole) }
  }, [reload])

  if (!record || !dfmData) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading...</p>
    </div>
  )

  const ntdRole = toNTDRole(currentRole)
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"
  const isSourcing = currentRole.startsWith("sourcing") || SOURCING_SPOC_ROLES.includes(currentRole) || currentRole === "super_admin"
  const approved = dfmData.components.filter(c => c.final_status === "approved").length
  const total = dfmData.components.length
  const allApproved = approved === total && total > 0

  // Commodity filter helpers
  const initComponents = initiationData?.components ?? []
  const activeCommodities = [...new Set(initComponents.map(c => c.commodity))] as NTDCommodity[]

  // Count per commodity for badge labels
  const commodityCounts = (["All", ...activeCommodities] as const).reduce<Record<string, number>>((acc, c) => {
    if (c === "All") {
      acc[c] = dfmData.components.length
    } else {
      acc[c] = dfmData.components.filter(comp =>
        initComponents.find(ic => ic.componentId === comp.componentId)?.commodity === c
      ).length
    }
    return acc
  }, {})

  // Filtered component list to pass to ComponentApprovalBoard
  const filteredComponents = selectedCommodity === "All"
    ? dfmData.components
    : dfmData.components.filter(comp =>
        initComponents.find(ic => ic.componentId === comp.componentId)?.commodity === selectedCommodity
      )

  const handleFileAction = (
    componentId: string,
    fileSlot: "ppt" | "design_3d" | "mould_3d" | "mfa_ppt" | "rnd_doc",
    action: "upload" | "revise" | "approve" | "comment" | "resolve",
    data: Record<string, unknown>
  ) => {
    const existing = getDFMOrInit(id)
    const updated: NTDDFMData = {
      ...existing,
      components: existing.components.map(comp => {
        if (comp.componentId !== componentId) return comp

        // ── R&D feedback doc upload (separate from ppt/design_3d) ──
        if (fileSlot === "rnd_doc" && action === "upload") {
          const docName = String(data.name || "R&D Doc")
          const newDoc = createVersionedFile(docName, String(data.link), currentRole)
          appendActivity(id, currentRole, ntdRole, 7, "file_uploaded",
            `R&D uploaded feedback doc "${docName}" for ${componentId}`, { component_id: componentId })
          return { ...comp, rnd_docs: [...(comp.rnd_docs ?? []), newDoc] }
        }

        const slot = fileSlot as "ppt" | "design_3d"
        let file = comp[slot]
        if (!file && action === "upload") {
          file = createVersionedFile(slot === "ppt" ? "DFM PPT" : "3D Design", String(data.link), currentRole)
        } else if (file) {
          if (action === "revise") file = addFileVersion(file, String(data.link), currentRole, data.note ? String(data.note) : undefined)
          if (action === "approve") file = approveFile(file, currentRole)
          if (action === "comment") file = addFileComment(file, currentRole, ntdRole, String(data.text), Boolean(data.req), data.attachmentLink as string | undefined, data.attachmentName as string | undefined)
          if (action === "resolve") file = resolveComment(file, String(data.cid), currentRole)
        }
        const updatedComp: NTDDFMComponent = { ...comp, [slot]: file ?? comp[slot] }

        // ── Status transitions ──
        if (updatedComp.final_status !== "approved") {
          if (updatedComp.ppt?.approved && updatedComp.design_3d?.approved) {
            updatedComp.final_status = "approved"
            updatedComp.approved_by = currentRole
            updatedComp.approved_at = new Date().toISOString()
            appendActivity(id, currentRole, ntdRole, 7, "component_approved",
              `DFM component ${componentId} approved`, { component_id: componentId })
          } else if (action === "comment" && Boolean(data.req)) {
            updatedComp.final_status = "revision_required"
          } else if ((action === "upload" || action === "revise") && updatedComp.final_status === "revision_required") {
            updatedComp.final_status = "under_review"
            updatedComp.iteration_no = (updatedComp.iteration_no ?? 1) + 1
          } else if (action === "upload" && updatedComp.ppt?.current_version > 0 && updatedComp.design_3d?.current_version > 0
            && updatedComp.final_status === "pending") {
            updatedComp.final_status = "under_review"
          }
        }

        return updatedComp
      }),
      stage_complete: existing.stage_complete,
      po_activity: existing.po_activity,
    }

    const allDone = updated.components.every(c => c.final_status === "approved")
    if (allDone && !updated.stage_complete) {
      updated.stage_complete = true
      setNTDDFM(id, updated)
      advanceNTDStage(id, 8, currentRole, ntdRole)
      appendActivity(id, currentRole, ntdRole, 7, "stage_complete", "DFM complete — all components approved")
    } else {
      setNTDDFM(id, updated)
    }
    reload()
  }

  const handleMarkPO = () => {
    if (!poNumber.trim() || !dfmData) return
    const updated: NTDDFMData = {
      ...dfmData,
      po_activity: { raised: true, po_number: poNumber.trim(), raised_by: currentRole, raised_at: new Date().toISOString() },
    }
    setNTDDFM(id, updated)
    appendActivity(id, currentRole, ntdRole, 7, "po_raised", `PO raised: ${poNumber.trim()}`)
    setPoNumber("")
    reload()
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-4">
      <Link href={`/ntd/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to NTD {record.id}
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">Stage 7 — DFM Review</h1>
            <p className="text-[11px] text-slate-500 truncate">{record.title}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {activeCommodities.length > 0 && (
              <div className="flex gap-1">
                {(["All", ...activeCommodities] as (NTDCommodity | "All")[]).map(c => (
                  <button key={c} onClick={() => setSelectedCommodity(c)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                      selectedCommodity === c
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}>
                    {c} {commodityCounts[c]}
                  </button>
                ))}
              </div>
            )}
            <div className="text-right border-l border-slate-200 pl-3">
              <p className="text-base font-bold text-slate-800">{approved}/{total}</p>
            </div>
          </div>
        </div>
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-600 rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${Math.round((approved / total) * 100)}%` : "0%" }} />
        </div>

        {allApproved && (
          <div className="mt-2 flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> All components approved
          </div>
        )}
      </div>

      <div className="flex gap-5 items-start">
        {/* Component board */}
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 p-3">
          <ComponentApprovalBoard
            components={filteredComponents}
            mode="dfm"
            role={ntdRole}
            onFileAction={handleFileAction}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 shrink-0 space-y-3">
          {/* Supplier Portal */}
          <div className="bg-white rounded-lg border border-blue-200 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800">Supplier Portal</h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Share this link with the supplier so they can upload DFM PPT and 3D Design files.
            </p>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
              <span className="flex-1 text-[11px] text-blue-700 font-mono truncate">/supplier/ntd/{id}</span>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/supplier/ntd/${id}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors shrink-0">
                {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <a href={`/supplier/ntd/${id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors">
              Open Supplier Portal <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* PO Activity */}
          <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-800">PO Activity</h3>
            </div>
            {dfmData.po_activity.raised ? (
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PO Raised
                </span>
                <p className="text-[11px] text-slate-600 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">{dfmData.po_activity.po_number}</p>
                <p className="text-[11px] text-slate-400">by {dfmData.po_activity.raised_by}</p>
              </div>
            ) : isSourcing ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">PO Number</label>
                <input type="text" autoComplete="off" value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                  onFocus={() => { isEditingRef.current = true }}
                  onBlur={() => { isEditingRef.current = false }}
                  placeholder="e.g. PO-2026-0042"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <button onClick={handleMarkPO} disabled={!poNumber.trim()}
                  className="w-full text-xs font-semibold bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors">Mark PO Raised</button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Awaiting sourcing to raise PO</p>
            )}
          </div>

          {/* Status guide */}
          <div className="bg-white rounded-lg border border-slate-200 p-2.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Status Guide</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Pending", cls: "bg-slate-100 text-slate-600" },
                { label: "Under Review", cls: "bg-amber-100 text-amber-700" },
                { label: "Revision Required", cls: "bg-red-100 text-red-700" },
                { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
              ].map(s => (
                <span key={s.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getDFMOrInit(id: string): NTDDFMData {
  const existing = getNTDDFM(id)
  if (existing) return existing
  const handoff = getNTDHandoff(id)
  if (!handoff) return {
    components: [],
    po_activity: { raised: false, po_number: "", raised_by: "", raised_at: "" },
    stage_complete: false,
  }
  const components: NTDDFMComponent[] = handoff.components.map(c => ({
    componentId: c.componentId,
    name: c.name,
    ppt: createVersionedFile("DFM PPT", "", "system"),
    design_3d: createVersionedFile("3D Design", "", "system"),
    rnd_docs: [],
    iteration_no: 1,
    final_status: "pending",
  }))
  const data: NTDDFMData = {
    components,
    po_activity: { raised: false, po_number: "", raised_by: "", raised_at: "" },
    stage_complete: false,
  }
  setNTDDFM(id, data)
  return data
}
