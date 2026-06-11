"use client"
import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle2, ExternalLink, Upload } from "lucide-react"
import {
  getNTDRecord, getNTDHandoff, setNTDHandoff, getNTDDFM, setNTDDFM,
  getNTDMould, setNTDMould, getNTDMfg, setNTDMfg, getNTDTrials, setNTDTrials,
  getNTDStage11, setNTDStage11, getCurrentNTDStage,
  createVersionedFile, addFileVersion, appendActivity, getSLADeadline,
} from "@/lib/ntd"
import type { NTDDFMComponent, NTDMouldComponent, MouldReview } from "@/types/ntd"

export default function SupplierNTDPortal() {
  const params = useParams()
  const id = params.id as string
  const [stage, setStage] = useState(1)
  const [record, setRecord] = useState<ReturnType<typeof getNTDRecord>>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [dfmUploads, setDFMUploads] = useState<Record<string, { ppt: string; design_3d: string }>>({})
  const [mouldUploads, setMouldUploads] = useState<Record<string, { mould_3d: string; mfa_ppt: string }>>({})
  const [mfgStartDate, setMfgStartDate] = useState("")
  const [mfgEta, setMfgEta] = useState("")
  const [mfgUpdate, setMfgUpdate] = useState("")
  const [inspectionLink, setInspectionLink] = useState("")

  useEffect(() => {
    const r = getNTDRecord(id)
    setRecord(r)
    if (r) setStage(getCurrentNTDStage(id))
    const handoff = getNTDHandoff(id)
    if (handoff?.supplier_acknowledged) setAcknowledged(true)
    const t = setInterval(() => {
      const r2 = getNTDRecord(id)
      if (r2) setStage(getCurrentNTDStage(id))
    }, 3000)
    return () => clearInterval(t)
  }, [id])

  if (!record) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">NTD record not found.</p>
    </div>
  )

  const handoff = getNTDHandoff(id)
  const dfmData = getNTDDFM(id)
  const mouldData = getNTDMould(id)
  const mfgData = getNTDMfg(id)
  const trialsData = getNTDTrials(id)
  const s11Data = getNTDStage11(id)

  const handleAcknowledge = () => {
    if (!handoff) return
    setNTDHandoff(id, { ...handoff, supplier_acknowledged: true, supplier_acknowledged_at: new Date().toISOString() })
    appendActivity(id, "supplier", "supplier", 6, "supplier_acknowledged", "Supplier acknowledged design handoff")
    setAcknowledged(true)
  }

  const handleDFMUpload = (componentId: string) => {
    const uploads = dfmUploads[componentId]
    if (!uploads?.ppt || !uploads?.design_3d) return
    if (!dfmData) return
    const now = new Date().toISOString()
    const updated = {
      ...dfmData,
      components: dfmData.components.map((c: NTDDFMComponent) => {
        if (c.componentId !== componentId) return c
        return {
          ...c,
          ppt: c.ppt.versions.length === 0 || c.ppt.versions[0].link === ""
            ? createVersionedFile("DFM PPT", uploads.ppt, "supplier")
            : addFileVersion(c.ppt, uploads.ppt, "supplier"),
          design_3d: c.design_3d.versions.length === 0 || c.design_3d.versions[0].link === ""
            ? createVersionedFile("3D Design", uploads.design_3d, "supplier")
            : addFileVersion(c.design_3d, uploads.design_3d, "supplier"),
          final_status: "under_review" as const,
          iteration_no: c.iteration_no + 1,
        }
      })
    }
    setNTDDFM(id, updated)
    appendActivity(id, "supplier", "supplier", 7, "supplier_submitted", `DFM files uploaded for ${componentId}`, { component_id: componentId })
    setDFMUploads(prev => { const n = { ...prev }; delete n[componentId]; return n })
  }

  const handleMouldUpload = (componentId: string) => {
    const uploads = mouldUploads[componentId]
    if (!uploads?.mould_3d || !uploads?.mfa_ppt) return
    if (!mouldData) return
    const now = new Date().toISOString()
    const sla = getSLADeadline(now)
    const pendingReview: MouldReview = { verdict: "pending", comments: "", reviewed_by: "", reviewed_at: "", sla_deadline: sla }
    const updated = {
      ...mouldData,
      components: mouldData.components.map((c: NTDMouldComponent) => {
        if (c.componentId !== componentId) return c
        return {
          ...c,
          mould_3d: c.mould_3d.versions[0]?.link === ""
            ? createVersionedFile("Mould 3D", uploads.mould_3d, "supplier")
            : addFileVersion(c.mould_3d, uploads.mould_3d, "supplier"),
          mfa_ppt: c.mfa_ppt.versions[0]?.link === ""
            ? createVersionedFile("MFA PPT", uploads.mfa_ppt, "supplier")
            : addFileVersion(c.mfa_ppt, uploads.mfa_ppt, "supplier"),
          rnd_review: pendingReview,
          sourcing_review: pendingReview,
          final_status: "under_review" as const,
          iteration_no: c.iteration_no + 1,
        }
      })
    }
    setNTDMould(id, updated)
    appendActivity(id, "supplier", "supplier", 8, "supplier_submitted", `Mould design files uploaded for ${componentId}`, { component_id: componentId })
    setMouldUploads(prev => { const n = { ...prev }; delete n[componentId]; return n })
  }

  const handleMfgStart = () => {
    setNTDMfg(id, { mfg_start_date: mfgStartDate, eta_date: mfgEta, updates: [], status: "in_progress", completed_by: "", completed_at: "" })
    appendActivity(id, "supplier", "supplier", 9, "manufacturing_update", "Supplier confirmed manufacturing start")
  }

  const handleMfgUpdatePost = () => {
    if (!mfgData || !mfgUpdate.trim()) return
    setNTDMfg(id, { ...mfgData, updates: [...mfgData.updates, { update_id: String(Date.now()), date: new Date().toISOString().split("T")[0], note: mfgUpdate.trim(), doc_link: undefined, posted_by: "supplier", posted_by_role: "supplier" }] })
    appendActivity(id, "supplier", "supplier", 9, "manufacturing_update", mfgUpdate.trim())
    setMfgUpdate("")
  }

  const handleMfgComplete = () => {
    if (!mfgData) return
    setNTDMfg(id, { ...mfgData, status: "complete", completed_by: "supplier", completed_at: new Date().toISOString() })
    appendActivity(id, "supplier", "supplier", 9, "manufacturing_complete", "Supplier marked manufacturing complete")
  }

  const handleDispatchSamples = (trialNo: number) => {
    if (!trialsData) return
    setNTDTrials(id, {
      ...trialsData,
      trials: trialsData.trials.map(t => t.trial_no === trialNo
        ? { ...t, status: "samples_dispatched", samples_dispatched_at: new Date().toISOString() }
        : t)
    })
    appendActivity(id, "supplier", "supplier", 10, "samples_dispatched", `Trial T${trialNo} samples dispatched`, { trial_no: trialNo })
  }

  const handleInspectionSubmit = () => {
    if (!inspectionLink.trim()) return
    const existing = s11Data ?? { inspection: null, commissioning: null, shipment: null, exim: null, arrival: null, final_approval: null }
    setNTDStage11(id, { ...existing, inspection: { report: createVersionedFile("Inspection Report", inspectionLink.trim(), "supplier"), submitted_by: "supplier", submitted_at: new Date().toISOString() } })
    appendActivity(id, "supplier", "supplier", 11, "supplier_submitted", "Final inspection report submitted")
    setInspectionLink("")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Supplier Portal</p>
        <h1 className="text-lg font-bold mt-0.5">{record.title}</h1>
        <p className="text-sm text-blue-300">{record.id} · Stage {stage}</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Stage 6 — Acknowledge handoff */}
        {stage === 6 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Design Handoff Receipt</h2>
            {handoff && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">{handoff.component_count} component(s) · {handoff.final_designs.length} design file(s)</p>
                {handoff.final_designs.map(f => (
                  <a key={f.file_id} href={f.versions[0]?.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> {f.slot_name}
                  </a>
                ))}
              </div>
            )}
            {acknowledged
              ? <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Acknowledged</div>
              : <button onClick={handleAcknowledge} className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors">Confirm Receipt of All Files</button>}
          </div>
        )}

        {/* Stage 7 — DFM */}
        {stage === 7 && dfmData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Stage 7 — DFM Submission</h2>
            {dfmData.components.filter(c => c.final_status !== "approved").map(c => (
              <div key={c.componentId} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-slate-800">{c.componentId} — {c.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.final_status === "revision_required" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {c.final_status.replace("_", " ")}
                </span>
                <div className="space-y-2">
                  <input type="url" placeholder="DFM PPT link" value={dfmUploads[c.componentId]?.ppt ?? ""}
                    onChange={e => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], ppt: e.target.value } }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <input type="url" placeholder="3D Design link" value={dfmUploads[c.componentId]?.design_3d ?? ""}
                    onChange={e => setDFMUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], design_3d: e.target.value } }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={() => handleDFMUpload(c.componentId)}
                    disabled={!dfmUploads[c.componentId]?.ppt || !dfmUploads[c.componentId]?.design_3d}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" /> Upload Files
                  </button>
                </div>
              </div>
            ))}
            {dfmData.components.every(c => c.final_status === "approved") && (
              <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> All components approved</div>
            )}
          </div>
        )}

        {/* Stage 8 — Mould Design */}
        {stage === 8 && mouldData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Stage 8 — Mould Design Submission</h2>
            {mouldData.components.filter(c => !c.locked && c.final_status !== "approved").map(c => (
              <div key={c.componentId} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-slate-800">{c.componentId} — {c.name}</p>
                <div className="space-y-2">
                  <input type="url" placeholder="Mould 3D link" value={mouldUploads[c.componentId]?.mould_3d ?? ""}
                    onChange={e => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mould_3d: e.target.value } }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <input type="url" placeholder="MFA PPT link" value={mouldUploads[c.componentId]?.mfa_ppt ?? ""}
                    onChange={e => setMouldUploads(prev => ({ ...prev, [c.componentId]: { ...prev[c.componentId], mfa_ppt: e.target.value } }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={() => handleMouldUpload(c.componentId)}
                    disabled={!mouldUploads[c.componentId]?.mould_3d || !mouldUploads[c.componentId]?.mfa_ppt}
                    className="flex items-center gap-1.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" /> Upload Files
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stage 9 — Manufacturing */}
        {stage === 9 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Stage 9 — Manufacturing</h2>
            {!mfgData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                    <input type="date" value={mfgStartDate} onChange={e => setMfgStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">ETA Date</label>
                    <input type="date" value={mfgEta} onChange={e => setMfgEta(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
                </div>
                <button onClick={handleMfgStart} disabled={!mfgStartDate}
                  className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                  Confirm Manufacturing Start
                </button>
              </div>
            ) : mfgData.status !== "complete" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Start: {mfgData.mfg_start_date} · ETA: {mfgData.eta_date}</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Status update..." value={mfgUpdate} onChange={e => setMfgUpdate(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={handleMfgUpdatePost} disabled={!mfgUpdate.trim()}
                    className="text-sm font-semibold bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">Post</button>
                </div>
                <button onClick={handleMfgComplete}
                  className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Mark Manufacturing Complete
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Manufacturing complete</div>
            )}
          </div>
        )}

        {/* Stage 10 — Trial dispatch */}
        {stage === 10 && trialsData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Stage 10 — Sample Dispatch</h2>
            {trialsData.trials.filter(t => t.status === "pending").map(t => (
              <div key={t.trial_no} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <p className="font-semibold text-slate-800">Trial T{t.trial_no}</p>
                <button onClick={() => handleDispatchSamples(t.trial_no)}
                  className="text-sm font-semibold bg-blue-900 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors">
                  Confirm Sample Dispatch
                </button>
              </div>
            ))}
            {trialsData.trials.every(t => t.status !== "pending") && (
              <p className="text-sm text-slate-500 italic">All trial samples dispatched. Awaiting R&D testing.</p>
            )}
          </div>
        )}

        {/* Stage 11 — Inspection report */}
        {stage === 11 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Stage 11 — Final Inspection Report</h2>
            {s11Data?.inspection ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Inspection report submitted
              </div>
            ) : (
              <div className="space-y-3">
                <input type="url" placeholder="Drive link to inspection report" value={inspectionLink} onChange={e => setInspectionLink(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={handleInspectionSubmit} disabled={!inspectionLink.trim()}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors">
                  <Upload className="w-4 h-4" /> Submit Inspection Report
                </button>
              </div>
            )}
          </div>
        )}

        {stage < 6 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">NTD is at Stage {stage}. Supplier actions begin at Stage 6.</p>
          </div>
        )}
      </div>
    </div>
  )
}
