"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Clock, Plus } from "lucide-react"
import { getNTDMfgStatus, setNTDMfgStatus } from "@/lib/ntd"
import type { NTDMfgStatusData } from "@/types/ntd"

// ─── Props ────────────────────────────────────────────────────

interface Stage8BProps {
  ntdId: string
  currentRole: string
  onStageAdvance: () => void
}

// ─── Component ────────────────────────────────────────────────

export default function Stage8B({ ntdId, currentRole, onStageAdvance }: Stage8BProps) {
  const [mfgData, setMfgData] = useState<NTDMfgStatusData | null>(null)
  const [startDate, setStartDate] = useState("")
  const [etaDate, setEtaDate] = useState("")
  const [updateNote, setUpdateNote] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const data = getNTDMfgStatus(ntdId)
    setMfgData(data)
  }, [ntdId])

  function handleConfirmStart() {
    if (!startDate || !etaDate) return
    setSaving(true)
    const data: NTDMfgStatusData = {
      mfg_start_date: startDate,
      eta_date: etaDate,
      updates: [],
      status: "in_progress",
    }
    setNTDMfgStatus(ntdId, data)
    setMfgData(data)
    setSaving(false)
  }

  function handlePostUpdate() {
    if (!updateNote.trim() || !mfgData) return
    const now = new Date().toISOString()
    const updated: NTDMfgStatusData = {
      ...mfgData,
      updates: [
        ...mfgData.updates,
        { date: now, note: updateNote.trim(), posted_by: currentRole },
      ],
    }
    setNTDMfgStatus(ntdId, updated)
    setMfgData(updated)
    setUpdateNote("")
  }

  function handleMarkComplete() {
    if (!mfgData) return
    const updated: NTDMfgStatusData = { ...mfgData, status: "complete" }
    setNTDMfgStatus(ntdId, updated)
    setMfgData(updated)
    onStageAdvance()
  }

  // ── Not started ──────────────────────────────────────────────

  if (!mfgData) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-blue-700">8B</span>
          </div>
          <h3 className="text-[13px] font-bold text-slate-800">Manufacturing</h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 ml-auto">
            Locked until 8A complete
          </span>
        </div>
        <p className="text-[12px] text-slate-500">
          Manufacturing begins after all mould design components are approved.
        </p>

        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 space-y-3">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            Confirm Manufacturing Start
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ETA Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
                value={etaDate}
                onChange={(e) => setEtaDate(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleConfirmStart}
            disabled={saving || !startDate || !etaDate}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Confirm Manufacturing Start"}
          </button>
        </div>
      </div>
    )
  }

  // ── Complete ─────────────────────────────────────────────────

  if (mfgData.status === "complete") {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-sm p-5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[13px] font-bold text-emerald-800">
            8B — Manufacturing Complete
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-[12px] text-slate-500">
          <span>
            Started:{" "}
            <span className="font-medium text-slate-700">{mfgData.mfg_start_date}</span>
          </span>
          <span>
            ETA: <span className="font-medium text-slate-700">{mfgData.eta_date}</span>
          </span>
          <span>
            Updates:{" "}
            <span className="font-medium text-slate-700">{mfgData.updates.length}</span>
          </span>
        </div>
        <p className="text-[11px] text-emerald-600">Trial samples dispatch now available (8C).</p>
      </div>
    )
  }

  // ── In progress ──────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-blue-100 bg-white shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-blue-700">8B</span>
        </div>
        <h3 className="text-[13px] font-bold text-slate-800">Manufacturing — In Progress</h3>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      </div>

      {/* Dates */}
      <div className="flex flex-wrap gap-4 text-[12px] text-slate-500">
        <span>
          Started:{" "}
          <span className="font-medium text-slate-700">{mfgData.mfg_start_date}</span>
        </span>
        <span>
          ETA: <span className="font-medium text-slate-700">{mfgData.eta_date}</span>
        </span>
      </div>

      {/* Updates feed */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Status Updates
        </p>

        {mfgData.updates.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic">No updates posted yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...mfgData.updates].reverse().map((u, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[12px]"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-semibold text-slate-700">{u.posted_by}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(u.date).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600">{u.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Post update form */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="Post a manufacturing update…"
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && updateNote.trim()) handlePostUpdate()
            }}
          />
          <button
            onClick={handlePostUpdate}
            disabled={!updateNote.trim()}
            className="px-3 py-2 rounded-lg text-[12px] font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Post
          </button>
        </div>
      </div>

      {/* Mark complete */}
      <div className="border-t border-slate-100 pt-3">
        <button
          onClick={handleMarkComplete}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          Mark Manufacturing Complete
        </button>
        <p className="text-[11px] text-slate-400 mt-1">
          This will unlock Stage 8C — Trial Samples &amp; Testing.
        </p>
      </div>
    </div>
  )
}
