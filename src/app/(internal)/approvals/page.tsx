"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, XCircle, ArrowRight, ExternalLink, Package,
  Calendar, ClipboardList, AlertTriangle
} from "lucide-react"
import {
  SAMPLE_RECEIPT_KEY, MRN_APPROVAL_KEY,
  VENDOR_STATUS_KEY, VENDOR_DATE_APPROVAL_KEY,
  type VendorStatusResponse,
} from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"

// ── Mock MRN items for demo ────────────────────────────────────────────────
const MOCK_MRNS = [
  {
    npdId:       "NPD-FY-2026-0014",
    itemName:    "Hermetic Terminal — 3 Pin",
    supplier:    "MicroElectrix Systems",
    mrnNumber:   "MRN-2026-0041",
    receivedDate:"25 Apr 2026",
    receivedQty: 10,
    condition:   "Good",
    notes:       "All samples received in original packaging. No visible damage.",
    raisedBy:    "R&D User",
  },
]

// ── Mock dispatch extension items (baseline) ──────────────────────────────
const MOCK_EXTENSIONS = [
  {
    key:        "DEL-001",
    npdId:      "NPD-FY-2026-0008",
    vendor:     "Alpha Component Systems",
    oldDate:    "12 Jun 2026",
    newDate:    "18 Jun 2026",
    reason:     "Raw material delay at port. Tooling will be complete but trial run needs extra 6 days.",
  },
  {
    key:        "DEL-002",
    npdId:      "NPD-FY-2026-0015",
    vendor:     "Supreme Plastics",
    oldDate:    "05 May 2026",
    newDate:    "20 May 2026",
    reason:     "Machine breakdown on primary injection unit. Cannot run pilot lot until repaired.",
  },
]

export default function ApprovalsPage() {
  const { npds, updateNPD } = useNPDs()

  // ── MRN approval state ──────────────────────────────────────────────────
  const [mrnDecisions, setMrnDecisions] = useState<Record<string, "approved" | "rejected">>({})

  // ── Extension approval state ────────────────────────────────────────────
  const [extDecisions, setExtDecisions] = useState<Record<string, "approved" | "rejected">>({})

  // ── Live MRN items from localStorage ───────────────────────────────────
  const [liveMRNs, setLiveMRNs] = useState<{
    npdId: string; itemName: string; supplier: string;
    mrnNumber: string; receivedDate: string; receivedQty: number;
    condition: string; notes: string; raisedBy: string;
  }[]>([])

  // ── Live extension items from localStorage ──────────────────────────────
  const [liveExtensions, setLiveExtensions] = useState<{
    key: string; npdId: string; vendor: string;
    oldDate: string; newDate: string; reason: string;
  }[]>([])

  useEffect(() => {
    // Load persisted MRN decisions
    try {
      const raw = localStorage.getItem(MRN_APPROVAL_KEY)
      if (raw) setMrnDecisions(JSON.parse(raw))
    } catch {}

    // Load persisted extension decisions (merge with mock baseline)
    try {
      const raw = localStorage.getItem("approvals_delay_status")
      if (raw) {
        const parsed: Record<string, string> = JSON.parse(raw)
        const mapped: Record<string, "approved" | "rejected"> = {}
        for (const [k, v] of Object.entries(parsed)) {
          if (v === "extended")  mapped[k] = "approved"
          if (v === "rejected")  mapped[k] = "rejected"
        }
        setExtDecisions(mapped)
      }
    } catch {}

    // Build live MRN list
    try {
      const rawMRN = localStorage.getItem(SAMPLE_RECEIPT_KEY)
      const allMRN: Record<string, Record<string, string | number>> = rawMRN ? JSON.parse(rawMRN) : {}
      const items = Object.entries(allMRN).map(([npdId, data]) => {
        const npd = npds.find(n => n.id === npdId)
        return {
          npdId,
          itemName:    npd?.itemName    ?? npdId,
          supplier:    (data.supplier as string) ?? npd?.supplier ?? "—",
          mrnNumber:   (data.mrnNumber  as string) ?? "—",
          receivedDate:(data.receivedDate as string) ?? "—",
          receivedQty: (data.receivedQty as number) ?? 0,
          condition:   (data.condition  as string) ?? "—",
          notes:       (data.notes      as string) ?? "",
          raisedBy:    (data.raisedBy   as string) ?? "R&D User",
        }
      })
      setLiveMRNs(items)
    } catch {}

    // Build live extension list from VENDOR_STATUS_KEY
    try {
      const rawStatus = localStorage.getItem(VENDOR_STATUS_KEY)
      const allStatus: Record<string, Record<string, VendorStatusResponse>> = rawStatus ? JSON.parse(rawStatus) : {}
      const items: typeof liveExtensions = []
      for (const [npdId, vendors] of Object.entries(allStatus)) {
        for (const [, resp] of Object.entries(vendors)) {
          if (!resp.onTime && resp.newDate) {
            const npd = npds.find(n => n.id === npdId)
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
      setLiveExtensions(items)
    } catch {}
  }, [npds])

  const approveMRN = (npdId: string, key: string) => {
    const next = { ...mrnDecisions, [key]: "approved" as const }
    setMrnDecisions(next)
    localStorage.setItem(MRN_APPROVAL_KEY, JSON.stringify(next))
    const npd = npds.find(n => n.id === npdId)
    if (npd && npd.stage < 7) {
      updateNPD(npdId, { stage: 7, stageName: "R&D Evaluation" })
    }
  }

  const rejectMRN = (key: string) => {
    const next = { ...mrnDecisions, [key]: "rejected" as const }
    setMrnDecisions(next)
    localStorage.setItem(MRN_APPROVAL_KEY, JSON.stringify(next))
  }

  const approveExt = (key: string, npdId: string, vendor: string) => {
    const next = { ...extDecisions, [key]: "approved" as const }
    setExtDecisions(next)
    // Persist to vendor date approval key for NPD detail sync
    const raw = localStorage.getItem(VENDOR_DATE_APPROVAL_KEY)
    const all: Record<string, Record<string, "approved" | "rejected">> = raw ? JSON.parse(raw) : {}
    if (!all[npdId]) all[npdId] = {}
    all[npdId][vendor] = "approved"
    localStorage.setItem(VENDOR_DATE_APPROVAL_KEY, JSON.stringify(all))
    // Also persist old key for mock baseline
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
  const allExts    = [...MOCK_EXTENSIONS, ...liveExtensions.filter(l => !MOCK_EXTENSIONS.find(m => m.key === l.key))]
  const pendingMRN = allMRNs.filter(m => !mrnDecisions[m.mrnNumber]).length
  const pendingExt = allExts.filter(e => !extDecisions[e.key]).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approvals Queue</h1>
      </div>

      <Tabs defaultValue="mrn" className="w-full">
        <TabsList className="bg-white border border-slate-200 rounded-lg p-1">
          <TabsTrigger value="mrn" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Sample Receipt / MRN
            {pendingMRN > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{pendingMRN}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="extensions" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Dispatch Extension Queue
            {pendingExt > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{pendingExt}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── MRN / Sample Receipt Tab ──────────────────────────────────── */}
        <TabsContent value="mrn" className="mt-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-slate-500" />
                  Sample Receipt Approvals
                </span>
                {pendingMRN > 0 && (
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                    {pendingMRN} Pending
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allMRNs.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No MRN approvals pending.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left align-middle border-collapse">
                  <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">NPD / Supplier</th>
                      <th className="px-6 py-4 font-semibold">MRN Details</th>
                      <th className="px-6 py-4 font-semibold">Condition</th>
                      <th className="px-6 py-4 font-semibold w-1/3">Notes</th>
                      <th className="px-6 py-4 font-semibold text-right">R&D Head Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {allMRNs.map(mrn => {
                      const decision = mrnDecisions[mrn.mrnNumber]
                      return (
                        <tr key={mrn.mrnNumber} className="hover:bg-slate-50/50">
                          <td className="px-6 py-5 align-top">
                            <p className="font-bold text-slate-900 mb-1">{mrn.supplier}</p>
                            <Link
                              href={`/npd/${mrn.npdId}`}
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              {mrn.npdId} <ExternalLink className="w-3 h-3" />
                            </Link>
                            <p className="text-xs text-slate-500 mt-0.5">{mrn.itemName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Raised by {mrn.raisedBy}</p>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <p className="font-semibold text-slate-800">{mrn.mrnNumber}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{mrn.receivedDate}</p>
                            <p className="text-xs text-slate-500">{mrn.receivedQty} pcs received</p>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              mrn.condition === "Good"    ? "bg-emerald-100 text-emerald-700" :
                              mrn.condition === "Damaged" ? "bg-red-100 text-red-700" :
                                                           "bg-amber-100 text-amber-700"
                            }`}>
                              {mrn.condition}
                            </span>
                          </td>
                          <td className="px-6 py-5 align-top text-slate-600 text-xs italic">
                            &ldquo;{mrn.notes || "No notes."}&rdquo;
                          </td>
                          <td className="px-6 py-5 align-top text-right">
                            {!decision ? (
                              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => rejectMRN(mrn.mrnNumber)}
                                >
                                  Reject MRN
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => approveMRN(mrn.npdId, mrn.mrnNumber)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Begin Evaluation
                                </Button>
                              </div>
                            ) : decision === "approved" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approved — R&D Evaluation Started
                              </Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border-red-200">
                                <XCircle className="w-3 h-3 mr-1" /> MRN Rejected
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dispatch Extension Tab ────────────────────────────────────── */}
        <TabsContent value="extensions" className="mt-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Dispatch Extension Queue
                </span>
                {pendingExt > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    {pendingExt} Pending
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left align-middle border-collapse">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Vendor & NPD</th>
                    <th className="px-6 py-4 font-semibold">Timeline Shift</th>
                    <th className="px-6 py-4 font-semibold w-1/3">Vendor Reason</th>
                    <th className="px-6 py-4 font-semibold text-right">Sourcing Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {allExts.map(ext => {
                    const decision = extDecisions[ext.key]
                    return (
                      <tr key={ext.key} className="hover:bg-slate-50/50">
                        <td className="px-6 py-5 align-top">
                          <p className="font-bold text-slate-900 mb-1">{ext.vendor}</p>
                          <Link
                            href={`/npd/${ext.npdId}`}
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                          >
                            {ext.npdId} <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <span className="text-slate-500 line-through">{ext.oldDate}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-rose-600">{ext.newDate}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top text-slate-600 text-xs italic">
                          &ldquo;{ext.reason}&rdquo;
                        </td>
                        <td className="px-6 py-5 align-top text-right">
                          {!decision ? (
                            <div className="flex flex-col sm:flex-row gap-2 justify-end mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => rejectExt(ext.key, ext.npdId, ext.vendor)}
                              >
                                Reject Extension
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => approveExt(ext.key, ext.npdId, ext.vendor)}
                              >
                                Extend Timeline
                              </Button>
                            </div>
                          ) : decision === "approved" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Horizon Extended
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-700 border-red-200 mt-1">
                              <XCircle className="w-3 h-3 mr-1" /> Rejected by Sourcing
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
