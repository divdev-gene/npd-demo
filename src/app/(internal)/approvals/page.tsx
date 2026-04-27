"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  CheckCircle2, XCircle, ArrowRight, ExternalLink, Package,
  Calendar, ClipboardList, AlertTriangle, Clock
} from "lucide-react"
import {
  SAMPLE_RECEIPT_KEY, MRN_APPROVAL_KEY,
  VENDOR_STATUS_KEY, VENDOR_DATE_APPROVAL_KEY,
  type VendorStatusResponse,
} from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"

const MOCK_MRNS = [
  {
    npdId:        "NPD-FY-2026-0014",
    itemName:     "Hermetic Terminal — 3 Pin",
    supplier:     "MicroElectrix Systems",
    mrnNumber:    "MRN-2026-0041",
    receivedDate: "25 Apr 2026",
    receivedQty:  10,
    condition:    "Good",
    notes:        "All samples received in original packaging. No visible damage.",
    raisedBy:     "R&D User",
  },
]

const MOCK_EXTENSIONS = [
  {
    key:     "DEL-001",
    npdId:   "NPD-FY-2026-0008",
    vendor:  "Alpha Component Systems",
    oldDate: "12 Jun 2026",
    newDate: "18 Jun 2026",
    reason:  "Raw material delay at port. Tooling will be complete but trial run needs extra 6 days.",
  },
  {
    key:     "DEL-002",
    npdId:   "NPD-FY-2026-0015",
    vendor:  "Supreme Plastics",
    oldDate: "05 May 2026",
    newDate: "20 May 2026",
    reason:  "Machine breakdown on primary injection unit. Cannot run pilot lot until repaired.",
  },
]

type Tab = "mrn" | "extensions"

export default function ApprovalsPage() {
  const { npds, updateNPD } = useNPDs()
  const [activeTab,    setActiveTab]    = useState<Tab>("mrn")
  const [mrnDecisions, setMrnDecisions] = useState<Record<string, "approved" | "rejected">>({})
  const [extDecisions, setExtDecisions] = useState<Record<string, "approved" | "rejected">>({})
  const [liveMRNs,     setLiveMRNs]     = useState<typeof MOCK_MRNS>([])
  const [liveExts,     setLiveExts]     = useState<typeof MOCK_EXTENSIONS>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MRN_APPROVAL_KEY)
      if (raw) setMrnDecisions(JSON.parse(raw))
    } catch {}

    try {
      const raw = localStorage.getItem("approvals_delay_status")
      if (raw) {
        const parsed: Record<string, string> = JSON.parse(raw)
        const mapped: Record<string, "approved" | "rejected"> = {}
        for (const [k, v] of Object.entries(parsed)) {
          if (v === "extended") mapped[k] = "approved"
          if (v === "rejected") mapped[k] = "rejected"
        }
        setExtDecisions(mapped)
      }
    } catch {}

    try {
      const rawMRN = localStorage.getItem(SAMPLE_RECEIPT_KEY)
      const allMRN: Record<string, Record<string, string | number>> = rawMRN ? JSON.parse(rawMRN) : {}
      const items = Object.entries(allMRN).map(([npdId, data]) => {
        const npd = npds.find(n => n.id === npdId)
        return {
          npdId,
          itemName:     npd?.itemName ?? npdId,
          supplier:     (data.supplier as string) ?? npd?.supplier ?? "—",
          mrnNumber:    (data.mrnNumber as string) ?? "—",
          receivedDate: (data.receivedDate as string) ?? "—",
          receivedQty:  (data.receivedQty as number) ?? 0,
          condition:    (data.condition as string) ?? "—",
          notes:        (data.notes as string) ?? "",
          raisedBy:     (data.raisedBy as string) ?? "R&D User",
        }
      })
      setLiveMRNs(items)
    } catch {}

    try {
      const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
      const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
      const items: typeof MOCK_EXTENSIONS = []
      for (const [npdId, vendors] of Object.entries(allStatus)) {
        for (const [, resp] of Object.entries(vendors)) {
          if (!resp.onTime && resp.newDate) {
            items.push({
              key:     `LIVE-${npdId}-${resp.vendorName}`,
              npdId,
              vendor:  resp.vendorName,
              oldDate: "Committed date",
              newDate: new Date(resp.newDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
              reason:  resp.notes ?? "No reason provided.",
            })
          }
        }
      }
      setLiveExts(items)
    } catch {}
  }, [npds])

  const approveMRN = (npdId: string, key: string) => {
    const next = { ...mrnDecisions, [key]: "approved" as const }
    setMrnDecisions(next)
    localStorage.setItem(MRN_APPROVAL_KEY, JSON.stringify(next))
    const npd = npds.find(n => n.id === npdId)
    if (npd && npd.stage < 7) updateNPD(npdId, { stage: 7, stageName: "R&D Evaluation" })
  }

  const rejectMRN = (key: string) => {
    const next = { ...mrnDecisions, [key]: "rejected" as const }
    setMrnDecisions(next)
    localStorage.setItem(MRN_APPROVAL_KEY, JSON.stringify(next))
  }

  const approveExt = (key: string, npdId: string, vendor: string) => {
    const next = { ...extDecisions, [key]: "approved" as const }
    setExtDecisions(next)
    const raw = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const all: Record<string, Record<string, "approved" | "rejected">> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]) all[npdId] = {}
    all[npdId][vendor] = "approved"
    localStorage.setItem(VENDOR_DATE_APPROVAL_KEY, JSON.stringify(all))
    const rawOld = localStorage.getItem("approvals_delay_status")
    const allOld: Record<string, string> = rawOld ? JSON.parse(rawOld) : {}
    allOld[key] = "extended"
    localStorage.setItem("approvals_delay_status", JSON.stringify(allOld))
  }

  const rejectExt = (key: string, npdId: string, vendor: string) => {
    const next = { ...extDecisions, [key]: "rejected" as const }
    setExtDecisions(next)
    const raw = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const all: Record<string, Record<string, "approved" | "rejected">> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]) all[npdId] = {}
    all[npdId][vendor] = "rejected"
    localStorage.setItem(VENDOR_DATE_APPROVAL_KEY, JSON.stringify(all))
    const rawOld = localStorage.getItem("approvals_delay_status")
    const allOld: Record<string, string> = rawOld ? JSON.parse(rawOld) : {}
    allOld[key] = "rejected"
    localStorage.setItem("approvals_delay_status", JSON.stringify(allOld))
  }

  const allMRNs    = [...MOCK_MRNS, ...liveMRNs.filter(l => !MOCK_MRNS.find(m => m.npdId === l.npdId))]
  const allExts    = [...MOCK_EXTENSIONS, ...liveExts.filter(l => !MOCK_EXTENSIONS.find(m => m.key === l.key))]
  const pendingMRN = allMRNs.filter(m => !mrnDecisions[m.mrnNumber]).length
  const pendingExt = allExts.filter(e => !extDecisions[e.key]).length

  const TABS: { id: Tab; label: string; icon: typeof Package; pending: number }[] = [
    { id: "mrn",        label: "Sample Receipt / MRN",   icon: Package,  pending: pendingMRN },
    { id: "extensions", label: "Dispatch Extensions",    icon: Calendar, pending: pendingExt },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Approvals Queue</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Actions pending your review as R&D Head / Sourcing Lead.</p>
        </div>
        {(pendingMRN + pendingExt) > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {pendingMRN + pendingExt} pending
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: active ? "#FFFFFF" : "transparent",
                color: active ? "#0F172A" : "#64748B",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.pending > 0 && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: tab.id === "mrn" ? "#EF4444" : "#F59E0B" }}
                >
                  {tab.pending}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── MRN Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "mrn" && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between" style={{ background: "#FAFAFA" }}>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-bold text-slate-800">Sample Receipt Approvals</span>
            </div>
            {pendingMRN > 0 && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                {pendingMRN} pending review
              </span>
            )}
          </div>

          {allMRNs.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-slate-400">No MRN approvals pending</p>
              <p className="text-[12px] text-slate-400 mt-0.5">MRNs raised by R&D will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {allMRNs.map(mrn => {
                const decision = mrnDecisions[mrn.mrnNumber]
                return (
                  <div key={mrn.mrnNumber} className="px-5 py-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="w-4 h-4 text-blue-700" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-[14px] font-bold text-slate-900 leading-tight">{mrn.supplier}</p>
                            <p className="text-[12px] text-slate-500 mt-0.5">{mrn.itemName}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Link href={`/npd/${mrn.npdId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900">
                                {mrn.npdId} <ExternalLink className="w-3 h-3" />
                              </Link>
                              <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{mrn.mrnNumber}</span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                mrn.condition === "Good"    ? "bg-emerald-50 text-emerald-700" :
                                mrn.condition === "Damaged" ? "bg-red-50 text-red-700" :
                                                             "bg-amber-50 text-amber-700"
                              }`}>
                                {mrn.condition}
                              </span>
                              <span className="text-[11px] text-slate-400">{mrn.receivedQty} pcs · {mrn.receivedDate}</span>
                            </div>
                            {mrn.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-2 max-w-xl">
                                &ldquo;{mrn.notes}&rdquo;
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1">Raised by {mrn.raisedBy}</p>
                          </div>

                          {/* Action */}
                          <div className="shrink-0">
                            {!decision ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => rejectMRN(mrn.mrnNumber)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                                <button
                                  onClick={() => approveMRN(mrn.npdId, mrn.mrnNumber)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Begin Eval
                                </button>
                              </div>
                            ) : decision === "approved" ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved · R&D Eval Started
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                                <XCircle className="w-3.5 h-3.5" /> MRN Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Extensions Tab ───────────────────────────────────────────────── */}
      {activeTab === "extensions" && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between" style={{ background: "#FAFAFA" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[13px] font-bold text-slate-800">Dispatch Extension Requests</span>
            </div>
            {pendingExt > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {pendingExt} pending review
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-50">
            {allExts.map(ext => {
              const decision = extDecisions[ext.key]
              return (
                <div key={ext.key} className="px-5 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-[14px] font-bold text-slate-900 leading-tight">{ext.vendor}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Link href={`/npd/${ext.npdId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900">
                              {ext.npdId} <ExternalLink className="w-3 h-3" />
                            </Link>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400 line-through">{ext.oldDate}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-bold text-rose-600">{ext.newDate}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 italic mt-2 max-w-xl">
                            &ldquo;{ext.reason}&rdquo;
                          </p>
                        </div>

                        {/* Action */}
                        <div className="shrink-0">
                          {!decision ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => rejectExt(ext.key, ext.npdId, ext.vendor)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                              <button
                                onClick={() => approveExt(ext.key, ext.npdId, ext.vendor)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Extend Timeline
                              </button>
                            </div>
                          ) : decision === "approved" ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Timeline Extended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
