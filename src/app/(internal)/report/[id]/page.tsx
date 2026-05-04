"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Download,
  MapPin, User, Package, FlaskConical, Truck, Building2,
  ChevronRight, ChevronDown, ArrowLeft, Star, FileText,
} from "lucide-react"
import { useNPDs } from "@/lib/npdContext"
import {
  SUPPLIER_DISPATCH_KEY, DELIVERY_DETAILS_KEY, PLANT_SUPPLIER_RESP_KEY,
  PLANT_ACCEPTANCE_KEY, PART_ASSIGNMENT_KEY, RND_EVAL_KEY,
  LIVE_QUOTATIONS_KEY, ENQUIRY_SENT_KEY, NPD_STAGES,
  DEFAULT_RND_CONTACT, getTestsByCategory,
  type NPDRecord,
} from "@/lib/mockData"
import { downloadMISReport } from "@/lib/reportGenerator"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
type ReportData = {
  dispatch:     { vendorName: string; dispatchDate: string; docs: string[]; submittedAt: string } | null
  delivDets:    { location: string; requiredQty: string; setAt: string } | null
  plantSupp:    { deliveryDate: string; sampleQty: number; submittedAt: string } | null
  plantAccept:  { verdict: "accepted" | "not_good"; remarks: string; verdictAt: string } | null
  partAssign:   { partNumber: string; assignedAt: string } | null
  rndEval:      { startedAt: string; results: Record<string, string>; submittedAt: string } | null
  liveQuotes:   Record<string, any>
  sentVendors:  string[]
  tqrStatus:    string
}

function readLS<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback }
  catch { return fallback }
}

function loadReport(npdId: string): ReportData {
  return {
    dispatch:    readLS<Record<string, any>>(SUPPLIER_DISPATCH_KEY, {})[npdId] ?? null,
    delivDets:   readLS<Record<string, any>>(DELIVERY_DETAILS_KEY, {})[npdId] ?? null,
    plantSupp:   readLS<Record<string, any>>(PLANT_SUPPLIER_RESP_KEY, {})[npdId] ?? null,
    plantAccept: readLS<Record<string, any>>(PLANT_ACCEPTANCE_KEY, {})[npdId] ?? null,
    partAssign:  readLS<Record<string, any>>(PART_ASSIGNMENT_KEY, {})[npdId] ?? null,
    rndEval:     readLS<Record<string, any>>(RND_EVAL_KEY, {})[npdId] ?? null,
    liveQuotes:  readLS<Record<string, any>>(LIVE_QUOTATIONS_KEY, {})[npdId] ?? {},
    sentVendors: readLS<Record<string, string[]>>(ENQUIRY_SENT_KEY, {})[npdId] ?? [],
    tqrStatus:   readLS<Record<string, string>>("tqr_status_v1", {})[npdId] ?? "",
  }
}

// ── Small primitives ───────────────────────────────────────────────────────
function Field({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-0.5">{label}</p>
      <p className={cn("text-[13px] font-semibold leading-snug break-words", mono ? "font-mono" : "", accent ?? "text-slate-800")}>
        {value || "—"}
      </p>
    </div>
  )
}

function SectionCard({ icon: Icon, title, color, children, defaultOpen = true }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn("w-full flex items-center gap-2.5 px-5 py-3.5 border-b text-left transition-colors hover:brightness-95", color)}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <h3 className="text-[13px] font-bold tracking-tight flex-1">{title}</h3>
        {open
          ? <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
          : <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  )
}

function FieldGrid({ cols = 3, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-x-8 gap-y-4",
      cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
    )}>
      {children}
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

// ── Stage Timeline ─────────────────────────────────────────────────────────
function StageTimeline({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {NPD_STAGES.map((name, i) => {
        const stageNum  = i + 1
        const done      = stageNum < current
        const active    = stageNum === current
        const upcoming  = stageNum > current
        return (
          <div key={name} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                done    ? "bg-emerald-500 border-emerald-500 text-white"
                : active  ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-400"
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : stageNum}
              </div>
              <span className={cn(
                "text-[9px] font-semibold text-center leading-tight max-w-[60px]",
                active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-300"
              )}>
                {name.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
            {i < NPD_STAGES.length - 1 && (
              <div className={cn("w-8 h-0.5 mb-4 mx-0.5", done ? "bg-emerald-400" : "bg-slate-100")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── TAT Badge ──────────────────────────────────────────────────────────────
function TATBadge({ health, daysRemaining, total }: { health: string; daysRemaining: number; total: number }) {
  const cfg = {
    green: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "On Track" },
    amber: { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   label: "At Risk"  },
    red:   { bg: "bg-red-50 border-red-200",         text: "text-red-700",     label: "Due Today"},
    black: { bg: "bg-red-50 border-red-200",         text: "text-red-700",     label: "Overdue"  },
  }[health] ?? { bg: "bg-slate-50 border-slate-200", text: "text-slate-700", label: "—" }

  const pct = Math.max(0, Math.min(100, Math.round(((total - Math.max(0, daysRemaining)) / total) * 100)))

  return (
    <div className={cn("rounded-xl border px-4 py-3 space-y-2", cfg.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={cn("w-4 h-4", cfg.text)} />
          <span className={cn("text-[12px] font-bold", cfg.text)}>{cfg.label}</span>
        </div>
        <span className={cn("text-[11px] font-mono font-bold", cfg.text)}>
          {health === "black" ? `+${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`} / {total}d
        </span>
      </div>
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", health === "green" ? "bg-emerald-500" : health === "amber" ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Score Meter ────────────────────────────────────────────────────────────
function ScoreMeter({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 8 ? "#10b981" : value >= 6 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[13px] font-bold font-mono w-8 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { id: npdId } = useParams() as { id: string }
  const { npds }      = useNPDs()
  const router        = useRouter()

  const [npd,  setNpd]  = useState<NPDRecord | null>(null)
  const [data, setData] = useState<ReportData | null>(null)

  useEffect(() => {
    const found = npds.find(n => n.id === npdId) ?? null
    setNpd(found)
    setData(loadReport(npdId))
  }, [npdId, npds])

  if (!npd || !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading report…</div>
    )
  }

  const tests      = getTestsByCategory(npd.itemCategory)
  const firstQuote = Object.values(data.liveQuotes)[0] as any
  const committedDate = firstQuote?.formValues?.["Dispatch Date"] ?? "—"
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="text-slate-200">|</span>
        <span className="text-[12px] text-slate-400">NPD Sourcing Report</span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-[12px] font-bold text-slate-700">{npdId}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => { downloadMISReport([npd]).catch(console.error) }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download .xlsx
          </button>
        </div>
      </div>

      {/* ── Report Header ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 flex items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <img src="/amber-logo.png" alt="Amber" className="h-8 w-auto object-contain brightness-0 invert opacity-90 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1">NPD Sourcing Report</p>
              <h1 className="text-[22px] font-black text-white leading-tight tracking-tight">{npd.itemName}</h1>
              <p className="text-slate-400 text-[13px] mt-1">{npd.itemCategory} · {npd.productLine}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Report ID</p>
            <p className="text-[15px] font-mono font-bold text-white">{npdId}</p>
            <p className="text-[11px] text-slate-500 mt-1">Generated {today}</p>
          </div>
        </div>

        {/* Stage timeline inside header card */}
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Pipeline Progress</p>
          <StageTimeline current={npd.stage} />
        </div>

        {/* TAT + priority row */}
        <div className="px-8 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <TATBadge health={npd.tatHealth} daysRemaining={npd.tatDaysRemaining} total={npd.totalTat} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Priority</p>
              <p className={cn("text-[13px] font-bold mt-0.5", npd.priority === "Critical" ? "text-red-600" : npd.priority === "High" ? "text-amber-600" : "text-slate-700")}>{npd.priority}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-[13px] font-bold text-slate-700 mt-0.5">{npd.stage} / {NPD_STAGES.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: Project Initiation ─────────────────────────────── */}
      <SectionCard icon={FileText} title="Section 1 — Project Initiation & Requirements" color="border-violet-100 bg-violet-50/60 text-violet-800">
        <FieldGrid cols={4}>
          <Field label="Project ID"        value={npdId} mono accent="text-blue-700" />
          <Field label="Location"          value={npd.rAndDDivision} />
          <Field label="Sample Location"   value={data.delivDets?.location ?? npd.rAndDDivision} />
          <Field label="Owner / SPOC"      value={npd.spoc} />
          <Field label="Product Line"      value={npd.productLine} />
          <Field label="Item Name"         value={npd.itemName} />
          <Field label="Item Category"     value={npd.itemCategory} />
          <Field label="Type of Work"      value={npd.typeOfWork} />
          <Field label="Desired TAT"       value={`${npd.totalTat} days`} />
          <Field label="Desired Qty"       value={data.delivDets?.requiredQty ? `${data.delivDets.requiredQty} pcs` : "—"} />
          <Field label="Spec Sheet"        value="Not Attached" />
          <Field label="Drawing No."       value="—" />
        </FieldGrid>
      </SectionCard>

      {/* ── Section 2: Supplier Allocation & Samples ──────────────────── */}
      <SectionCard icon={Truck} title="Section 2 — Supplier Allocation & Samples" color="border-blue-100 bg-blue-50/60 text-blue-800">
        <FieldGrid cols={3}>
          <Field label="Allocated Supplier"        value={npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : "—"} />
          <Field label="RFQ Sent To"               value={data.sentVendors.length > 0 ? data.sentVendors.join(", ") : npd.supplier ?? "—"} />
          <Field label="Quotations Received"       value={Object.keys(data.liveQuotes).length > 0 ? `${Object.keys(data.liveQuotes).length} vendor(s)` : "—"} />
          <Field label="Sample Submission Date (Committed)" value={committedDate} />
          <Field label="Tool / Jig Required"       value="No" />
          <Field label="Lead Time"                 value={`${npd.totalTat} days`} />
        </FieldGrid>

        {data.dispatch && (
          <>
            <Divider label="Dispatch Details" />
            <FieldGrid cols={4}>
              <Field label="Dispatching Supplier"  value={data.dispatch.vendorName} />
              <Field label="Dispatch Date (Actual)"value={data.dispatch.dispatchDate} />
              <Field label="Sample Qty Dispatched" value={data.plantSupp?.sampleQty ? `${data.plantSupp.sampleQty} pcs` : data.delivDets?.requiredQty ? `${data.delivDets.requiredQty} pcs` : "—"} />
              <Field label="Proof of Dispatch"     value={data.dispatch.docs.length > 0 ? data.dispatch.docs[0] : "Submitted"} />
              <Field label="Supplier Confirmed Delivery Date" value={data.plantSupp?.deliveryDate ?? "—"} />
              <Field label="TAT from Allocation"   value={npd.totalTat > 0 ? `${npd.totalTat - Math.max(0, npd.tatDaysRemaining)} / ${npd.totalTat} days used` : "—"} />
              <Field label="Arrival Date"          value={data.plantAccept?.verdictAt ?? data.plantSupp?.submittedAt ?? "—"} />
              <Field label="Delivery Status"       value={npd.stageName} />
            </FieldGrid>
          </>
        )}

        {!data.dispatch && (
          <p className="text-[12px] text-slate-400 italic mt-1">Dispatch not yet recorded for this NPD.</p>
        )}
      </SectionCard>

      {/* ── Section 3: R&D Testing & Approval ─────────────────────────── */}
      <SectionCard icon={FlaskConical} title="Section 3 — R&D Testing & Approval" color="border-emerald-100 bg-emerald-50/60 text-emerald-800">
        <FieldGrid cols={3}>
          <Field label="R&D SPOC"          value={DEFAULT_RND_CONTACT.name} />
          <Field label="Test Start Date"   value={data.rndEval?.startedAt ? new Date(data.rndEval.startedAt).toLocaleDateString("en-IN") : "—"} />
          <Field label="Test Type"         value={tests.length > 0 ? [...new Set(tests.map(t => t.testType))].join(", ") : "—"} />
          <Field label="3rd Party Test"    value="Not Required" />
          <Field label="TQR Status"        value={
            data.tqrStatus === "fully_approved" ? "Approved by R&D Head" :
            data.tqrStatus === "approved_by_user" ? "Approved by R&D User — Awaiting Head" :
            data.tqrStatus === "rejected" ? "Failed Tests & Evaluation" :
            data.tqrStatus === "head_sent_back" ? "Sent Back for Re-testing" :
            data.tqrStatus === "head_rejected_supplier" ? "Supplier Rejected by R&D Head" :
            data.rndEval?.submittedAt ? "Evaluation Submitted" :
            data.rndEval?.startedAt ? "In Progress" : "Pending"
          } accent={
            data.tqrStatus === "fully_approved" ? "text-emerald-600" :
            data.tqrStatus === "rejected" || data.tqrStatus === "head_rejected_supplier" ? "text-red-600" :
            data.tqrStatus === "approved_by_user" ? "text-blue-600" : "text-slate-500"
          } />
          <Field label="Approved / Not Approved" value={
            data.tqrStatus === "fully_approved" ? "Approved" :
            data.tqrStatus === "rejected" || data.tqrStatus === "head_rejected_supplier" ? "Not Approved" :
            data.plantAccept?.verdict === "accepted" ? "Approved" :
            data.plantAccept?.verdict === "not_good" ? "Not Approved" :
            npd.stage >= 7 ? "Pending" : "—"
          } accent={
            (data.tqrStatus === "fully_approved" || data.plantAccept?.verdict === "accepted") ? "text-emerald-600" :
            (data.tqrStatus === "rejected" || data.tqrStatus === "head_rejected_supplier" || data.plantAccept?.verdict === "not_good") ? "text-red-600" : "text-slate-500"
          } />
        </FieldGrid>

        {tests.length > 0 && (
          <>
            <Divider label="Test Results" />
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {["Test Name", "Type", "Unit", "Expected Range", "Result"].map(h => (
                      <th key={h} className={cn("py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider", h === "Test Name" ? "text-left" : "text-center")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, i) => {
                    const result = data.rndEval?.results?.[t.testName] ?? "—"
                    return (
                      <tr key={t.testName} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{t.testName}</td>
                        <td className="px-4 py-2.5 text-center text-[11px] text-slate-500">{t.testType}</td>
                        <td className="px-4 py-2.5 text-center text-[11px] text-slate-500">{t.unit}</td>
                        <td className="px-4 py-2.5 text-center text-[11px] text-slate-500">{t.expectedRange ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("text-[12px] font-semibold", result !== "—" ? "text-slate-900" : "text-slate-300")}>{result}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {npd.tqrScore && (
          <>
            <Divider label="TQR Scores" />
            <div className="space-y-2 max-w-sm">
              <ScoreMeter label="Technology (T)" value={npd.tqrScore.t} />
              <ScoreMeter label="Quality (Q)"    value={npd.tqrScore.q} />
              <ScoreMeter label="Reliability (R)"value={npd.tqrScore.r} />
              <div className="pt-1 border-t border-slate-100 mt-1">
                <ScoreMeter label="TQR Composite"  value={npd.tqrScore.composite} />
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Section 4: Closure ────────────────────────────────────────── */}
      <SectionCard icon={Package} title="Section 4 — Part Assignment & Closure" color="border-amber-100 bg-amber-50/60 text-amber-800">
        <FieldGrid cols={3}>
          <Field label="Part Code No."        value={data.partAssign?.partNumber ?? "—"} mono accent="text-blue-700" />
          <Field label="Cost Derivation from AICM" value={npd.cost != null ? `₹ ${npd.cost.toFixed(2)}` : "—"} accent="text-emerald-700" />
          <Field label="Assigned On"          value={data.partAssign?.assignedAt ?? "—"} />
        </FieldGrid>

        {data.plantAccept && (
          <>
            <Divider label="Plant Verdict" />
            <div className={cn(
              "rounded-xl border p-4 flex items-center gap-3 mt-2",
              data.plantAccept.verdict === "accepted" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            )}>
              {data.plantAccept.verdict === "accepted"
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                : <XCircle      className="w-5 h-5 text-red-500 shrink-0" />}
              <div>
                <p className={cn("text-sm font-bold", data.plantAccept.verdict === "accepted" ? "text-emerald-800" : "text-red-800")}>
                  {data.plantAccept.verdict === "accepted" ? "Accepted — Approved for Production" : "Not Good — Returned for Revision"}
                </p>
                {data.plantAccept.remarks && (
                  <p className="text-xs text-slate-500 italic mt-0.5">{data.plantAccept.remarks}</p>
                )}
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 px-1">
        <span>Amber Enterprises India Limited · NPD Sourcing Tracker MIS</span>
        <span>Generated on {today} · {npdId}</span>
      </div>

    </div>
  )
}
