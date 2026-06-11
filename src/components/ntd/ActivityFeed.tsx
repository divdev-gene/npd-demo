"use client"
import { useState, useEffect } from "react"
import { getActivityLog } from "@/lib/ntd"
import type { ActivityEntry, NTDActionType, NTDRole } from "@/types/ntd"
import { CheckCircle2, XCircle, Upload, ChevronDown, ChevronUp } from "lucide-react"

const ROLE_COLORS: Record<NTDRole, string> = {
  rnd: "bg-indigo-100 text-indigo-800",
  sourcing: "bg-teal-100 text-teal-800",
  rnd_head: "bg-amber-100 text-amber-800",
  sourcing_head: "bg-blue-100 text-blue-800",
  exim: "bg-red-100 text-red-800",
  super_admin: "bg-purple-100 text-purple-800",
  supplier: "bg-slate-100 text-slate-700",
  vendor: "bg-slate-100 text-slate-700",
}

const ACTION_TYPE_LABELS: Partial<Record<NTDActionType, string>> = {
  ntd_created: "Created",
  stage_advanced: "Stage Advanced",
  file_uploaded: "File Uploaded",
  file_revised: "File Revised",
  comment_added: "Comment",
  file_approved: "File Approved",
  component_approved: "Component Approved",
  component_rejected: "Component Rejected",
  stage_complete: "Stage Complete",
  supplier_submitted: "Supplier Submitted",
  quotation_submitted: "Quotation",
  supplier_selected: "Supplier Selected",
  trial_initiated: "Trial Initiated",
  trial_result: "Trial Result",
  redesign_triggered: "Redesign",
  manufacturing_update: "Mfg Update",
  manufacturing_complete: "Mfg Complete",
  ntd_complete: "NTD Complete",
  dual_signed: "Dual Sign-off",
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getEntryBorder(entry: ActivityEntry): string {
  const { action_type } = entry
  if (["file_approved", "component_approved", "stage_complete", "ntd_complete", "dual_signed", "manufacturing_complete"].includes(action_type))
    return "border-l-2 border-emerald-400"
  if (["component_rejected", "redesign_triggered"].includes(action_type))
    return "border-l-2 border-red-400"
  if (["file_uploaded", "file_revised", "supplier_submitted"].includes(action_type))
    return "border-l-2 border-blue-400"
  return "border-l-2 border-transparent"
}

function EntryIcon({ action_type }: { action_type: NTDActionType }) {
  if (["file_approved", "component_approved", "stage_complete", "ntd_complete", "dual_signed"].includes(action_type))
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
  if (["component_rejected", "redesign_triggered"].includes(action_type))
    return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
  if (["file_uploaded", "file_revised"].includes(action_type))
    return <Upload className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
  return <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
}

export function ActivityFeed({ ntdId }: { ntdId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [stageFilter, setStageFilter] = useState<number | "all">("all")
  const [roleFilter, setRoleFilter] = useState<NTDRole | "all">("all")
  const [actionFilter, setActionFilter] = useState<NTDActionType | "all">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = () => setEntries([...getActivityLog(ntdId).entries].reverse())
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [ntdId])

  const filtered = entries.filter(e => {
    if (stageFilter !== "all" && e.stage !== stageFilter) return false
    if (roleFilter !== "all" && e.actor_role !== roleFilter) return false
    if (actionFilter !== "all" && e.action_type !== actionFilter) return false
    return true
  })

  const stages = Array.from(new Set(entries.map(e => e.stage))).sort((a, b) => a - b)
  const roles = Array.from(new Set(entries.map(e => e.actor_role)))
  const actions = Array.from(new Set(entries.map(e => e.action_type)))

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <select value={String(stageFilter)} onChange={e => setStageFilter(e.target.value === "all" ? "all" : Number(e.target.value) as number)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s} value={s}>Stage {s}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as NTDRole | "all")}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value as NTDActionType | "all")}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{ACTION_TYPE_LABELS[a] ?? a}</option>)}
        </select>
        {filtered.length !== entries.length && (
          <span className="text-xs text-slate-400 self-center">{filtered.length} of {entries.length}</span>
        )}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          {entries.length === 0 ? "No activity yet" : "No entries match the current filters"}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(entry => (
            <div key={entry.id}
              className={`flex gap-3 px-3 py-2 rounded-r-lg bg-white hover:bg-slate-50 transition-colors ${getEntryBorder(entry)}`}>
              <EntryIcon action_type={entry.action_type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[entry.actor_role]}`}>
                    {entry.actor}
                  </span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    Stage {entry.stage}{entry.substage ? entry.substage : ""}
                  </span>
                  {ACTION_TYPE_LABELS[entry.action_type] && (
                    <span className="text-[10px] text-slate-500">{ACTION_TYPE_LABELS[entry.action_type]}</span>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto" title={entry.timestamp}>
                    {relativeTime(entry.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5">{entry.description}</p>
                {entry.payload && Object.keys(entry.payload).length > 0 && (
                  <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mt-0.5 transition-colors">
                    {expandedId === entry.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Details
                  </button>
                )}
                {expandedId === entry.id && entry.payload && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(entry.payload).filter(([, v]) => v != null).map(([k, v]) => (
                      <span key={k} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
