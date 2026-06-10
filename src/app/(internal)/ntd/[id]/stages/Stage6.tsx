"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Link as LinkIcon } from "lucide-react"
import {
  getNTDInitiation,
  getNTDFinalData,
  setNTDFinalData,
  updateNTDStage,
} from "@/lib/ntd"
import type { NTDFinalDataSubmission, NTDFinalDataComponent, NTDComponent } from "@/types/ntd"

interface Stage6Props {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

interface ComponentRow {
  componentId: string
  name: string
  ppt: string
  data_3d: string
}

export default function Stage6({ ntdId, currentRole, onStageAdvance }: Stage6Props) {
  const isRnd = currentRole.startsWith("rnd") || currentRole === "super_admin"

  const [components, setComponents] = useState<ComponentRow[]>([])
  const [finalData, setFinalDataState] = useState<NTDFinalDataSubmission | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    const initiation = getNTDInitiation(ntdId)
    const comps: NTDComponent[] = initiation?.components ?? []

    const existingFinalData = getNTDFinalData(ntdId)
    setFinalDataState(existingFinalData)

    if (existingFinalData) {
      setUploaded(true)
      // Merge component names from initiation with uploaded data
      const rows: ComponentRow[] = comps.map((c) => {
        const uploaded = existingFinalData.components.find((u) => u.componentId === c.componentId)
        return {
          componentId: c.componentId,
          name: c.name,
          ppt: uploaded?.ppt ?? "",
          data_3d: uploaded?.data_3d ?? "",
        }
      })
      setComponents(rows)
    } else {
      setComponents(
        comps.map((c) => ({ componentId: c.componentId, name: c.name, ppt: "", data_3d: "" }))
      )
    }
  }, [ntdId])

  function updateRow(idx: number, field: "ppt" | "data_3d", value: string) {
    setComponents((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const allFilled = components.length > 0 && components.every((c) => c.ppt.trim() && c.data_3d.trim())

  function handleUpload() {
    const now = new Date().toISOString()
    const finalComponents: NTDFinalDataComponent[] = components.map((c) => ({
      componentId: c.componentId,
      ppt: c.ppt,
      data_3d: c.data_3d,
      uploaded_at: now,
    }))
    const submission: NTDFinalDataSubmission = {
      components: finalComponents,
      supplier_acknowledged: false,
      supplier_acknowledged_at: "",
    }
    setNTDFinalData(ntdId, submission)
    setFinalDataState(submission)
    setUploaded(true)
  }

  function handleSimulateAck() {
    if (!finalData && !uploaded) return
    const now = new Date().toISOString()
    const updated: NTDFinalDataSubmission = {
      ...(finalData ?? {
        components: [],
        supplier_acknowledged: false,
        supplier_acknowledged_at: "",
      }),
      supplier_acknowledged: true,
      supplier_acknowledged_at: now,
    }
    setNTDFinalData(ntdId, updated)
    setFinalDataState(updated)

    if (!advanced) {
      setAdvanced(true)
      updateNTDStage(ntdId, 7)
      onStageAdvance()
    }
  }

  const isAcknowledged = finalData?.supplier_acknowledged === true

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
      {/* Stage header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-blue-700">6</span>
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">R&amp;D Final Data Submission</h2>
          <p className="text-[12px] text-slate-500">
            R&amp;D uploads per-component PPT and 3D data; supplier acknowledges receipt.
          </p>
        </div>
      </div>

      {/* Component table */}
      {isRnd && !uploaded ? (
        <div>
          <p className="text-[12px] font-semibold text-slate-600 mb-2">
            Component Data Upload ({components.length} components)
          </p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 w-20">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 w-40">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">PPT Link</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">3D Data Link</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, idx) => (
                  <tr key={c.componentId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 font-mono font-medium text-slate-600">{c.componentId}</td>
                    <td className="px-3 py-2 text-slate-700">{c.name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="border border-slate-200 rounded-lg px-2 py-1 text-[12px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder="https://..."
                        value={c.ppt}
                        onChange={(e) => updateRow(idx, "ppt", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="border border-slate-200 rounded-lg px-2 py-1 text-[12px] w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder="https://..."
                        value={c.data_3d}
                        onChange={(e) => updateRow(idx, "data_3d", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <button
              onClick={handleUpload}
              disabled={!allFilled}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload All &amp; Notify Supplier
            </button>
            {!allFilled && (
              <p className="text-[11px] text-slate-400 mt-1">Fill PPT and 3D data for all components to upload.</p>
            )}
          </div>
        </div>
      ) : (
        /* Read-only uploaded view */
        <div>
          <p className="text-[12px] font-semibold text-slate-600 mb-2">
            Uploaded Components ({components.length})
          </p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 w-20">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">PPT</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">3D Data</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, idx) => (
                  <tr key={c.componentId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 font-mono font-medium text-slate-600">{c.componentId}</td>
                    <td className="px-3 py-2 text-slate-700">{c.name}</td>
                    <td className="px-3 py-2">
                      {c.ppt ? (
                        <a href={c.ppt} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {c.data_3d ? (
                        <a href={c.data_3d} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Link
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier acknowledgement section */}
      {uploaded && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          {isAcknowledged ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-emerald-700">Supplier Acknowledged</p>
                {finalData?.supplier_acknowledged_at && (
                  <p className="text-[11px] text-emerald-600">
                    {new Date(finalData.supplier_acknowledged_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[13px] text-amber-700">Awaiting supplier acknowledgement</span>
              </div>

              {/* Supplier portal link notice */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Share this URL with the supplier:</p>
                <p className="text-[12px] font-mono text-slate-700">
                  /supplier/ntd/{ntdId}
                </p>
              </div>

              {/* Simulate supplier ack (demo only) */}
              {isRnd && (
                <button
                  onClick={handleSimulateAck}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Simulate Supplier Acknowledgement (Demo)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
