"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, Circle } from "lucide-react"
import type { NTDDFMComponent, NTDMouldComponent, NTDRole } from "@/types/ntd"
import { VersionedFileInput } from "./VersionedFileInput"
import { getSLAStatus } from "@/lib/ntd"

type ComponentStatus = "pending" | "under_review" | "revision_required" | "approved"

const STATUS_BADGE: Record<ComponentStatus, { label: string; cls: string }> = {
  pending:           { label: "Pending",          cls: "bg-slate-100 text-slate-600" },
  under_review:      { label: "Under Review",     cls: "bg-amber-100 text-amber-700" },
  revision_required: { label: "Revision Required",cls: "bg-red-100 text-red-700" },
  approved:          { label: "Approved",         cls: "bg-emerald-100 text-emerald-700" },
}

function SLABadge({ deadline }: { deadline: string }) {
  const status = getSLAStatus(deadline)
  const diff = new Date(deadline).getTime() - Date.now()
  const hrs = Math.floor(Math.abs(diff) / 3600000)
  const mins = Math.floor((Math.abs(diff) % 3600000) / 60000)
  const label = diff < 0 ? `${hrs}h ${mins}m overdue` : `${hrs}h ${mins}m left`
  const cls = status === "overdue" ? "bg-red-100 text-red-700" : status === "warning" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
  return (
    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
      <Clock className="w-3 h-3" /> {label}
    </span>
  )
}

interface ComponentApprovalBoardProps {
  components: NTDDFMComponent[] | NTDMouldComponent[]
  mode: "dfm" | "mould"
  role: NTDRole
  onFileAction: (
    componentId: string,
    fileSlot: "ppt" | "design_3d" | "mould_3d" | "mfa_ppt",
    action: "upload" | "revise" | "approve" | "comment" | "resolve",
    data: Record<string, unknown>
  ) => void
  onMouldReview?: (
    componentId: string,
    reviewer: "rnd" | "sourcing",
    verdict: "approved" | "rejected",
    comments: string
  ) => void
  showSLATimer?: boolean
  redesignRound?: number
  triggeredByTrial?: number
}

export function ComponentApprovalBoard({
  components,
  mode,
  role,
  onFileAction,
  onMouldReview,
  showSLATimer = false,
  redesignRound = 0,
  triggeredByTrial,
}: ComponentApprovalBoardProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({})

  const approved = components.filter(c => c.final_status === "approved").length
  const total = components.length
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0

  const isInternalRole = role !== "supplier" && role !== "vendor"
  const canReviewRnd = role === "rnd" || role === "rnd_head" || role === "super_admin"
  const canReviewSourcing = role === "sourcing" || role === "sourcing_head" || role === "super_admin"

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {approved} / {total} Components Approved
          </p>
          <span className="text-xs text-slate-500">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {redesignRound > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800">
            Redesign Round {redesignRound}{triggeredByTrial ? ` — triggered by Trial T${triggeredByTrial}` : ""}
          </p>
        </div>
      )}

      {/* Component list */}
      <div className="space-y-2">
        {components.map(comp => {
          const isApproved = comp.final_status === "approved"
          const isExpanded = expanded[comp.componentId]
          const badge = STATUS_BADGE[comp.final_status]
          const isLocked = "locked" in comp && (comp as NTDMouldComponent).locked

          return (
            <div key={comp.componentId}
              className={`rounded-xl border transition-all ${isApproved || isLocked ? "border-emerald-200 bg-emerald-50 opacity-60" : "border-slate-200 bg-white"}`}>
              {/* Accordion header */}
              <button
                onClick={() => !isApproved && !isLocked && setExpanded(prev => ({ ...prev, [comp.componentId]: !prev[comp.componentId] }))}
                className={`w-full flex items-center justify-between px-4 py-3 text-left ${isApproved || isLocked ? "cursor-default" : "hover:bg-slate-50"} rounded-xl transition-colors`}
                disabled={isApproved || isLocked === true}
              >
                <div className="flex items-center gap-3">
                  {isApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-400" />}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{comp.componentId} — {comp.name}</p>
                    <p className="text-[10px] text-slate-400">Iteration {comp.iteration_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  {!isApproved && !isLocked && (isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && !isApproved && !isLocked && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
                  {mode === "dfm" && (() => {
                    const dfmComp = comp as NTDDFMComponent
                    const canAct = !isInternalRole
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <VersionedFileInput
                          file={dfmComp.ppt}
                          slotName="DFM PPT"
                          role={role}
                          readOnly={isInternalRole}
                          showApproveButton={false}
                          onUpload={(link, note) => onFileAction(comp.componentId, "ppt", "upload", { link, note })}
                          onRevise={(link, note, cid) => onFileAction(comp.componentId, "ppt", "revise", { link, note, cid })}
                          onAddComment={(text, req) => onFileAction(comp.componentId, "ppt", "comment", { text, req })}
                          onResolveComment={(cid) => onFileAction(comp.componentId, "ppt", "resolve", { cid })}
                        />
                        <VersionedFileInput
                          file={dfmComp.design_3d}
                          slotName="3D Design"
                          role={role}
                          readOnly={isInternalRole}
                          showApproveButton={isInternalRole}
                          onUpload={(link, note) => onFileAction(comp.componentId, "design_3d", "upload", { link, note })}
                          onRevise={(link, note, cid) => onFileAction(comp.componentId, "design_3d", "revise", { link, note, cid })}
                          onApprove={(fid) => onFileAction(comp.componentId, "design_3d", "approve", { fid })}
                          onAddComment={(text, req) => onFileAction(comp.componentId, "design_3d", "comment", { text, req })}
                          onResolveComment={(cid) => onFileAction(comp.componentId, "design_3d", "resolve", { cid })}
                        />
                      </div>
                    )
                  })()}

                  {mode === "mould" && (() => {
                    const mouldComp = comp as NTDMouldComponent
                    const latestRndSLA = mouldComp.rnd_review?.sla_deadline
                    const latestSourcingSLA = mouldComp.sourcing_review?.sla_deadline
                    return (
                      <div className="space-y-4">
                        {/* Files */}
                        <div className="grid grid-cols-2 gap-3">
                          <VersionedFileInput
                            file={mouldComp.mould_3d}
                            slotName="Mould 3D"
                            role={role}
                            readOnly={isInternalRole}
                            onUpload={(link, note) => onFileAction(comp.componentId, "mould_3d", "upload", { link, note })}
                            onRevise={(link, note, cid) => onFileAction(comp.componentId, "mould_3d", "revise", { link, note, cid })}
                            onAddComment={(text, req) => onFileAction(comp.componentId, "mould_3d", "comment", { text, req })}
                            onResolveComment={(cid) => onFileAction(comp.componentId, "mould_3d", "resolve", { cid })}
                          />
                          <VersionedFileInput
                            file={mouldComp.mfa_ppt}
                            slotName="MFA PPT"
                            role={role}
                            readOnly={isInternalRole}
                            onUpload={(link, note) => onFileAction(comp.componentId, "mfa_ppt", "upload", { link, note })}
                            onRevise={(link, note, cid) => onFileAction(comp.componentId, "mfa_ppt", "revise", { link, note, cid })}
                            onAddComment={(text, req) => onFileAction(comp.componentId, "mfa_ppt", "comment", { text, req })}
                            onResolveComment={(cid) => onFileAction(comp.componentId, "mfa_ppt", "resolve", { cid })}
                          />
                        </div>

                        {/* Review panels (internal only) */}
                        {isInternalRole && onMouldReview && (
                          <div className="grid grid-cols-2 gap-3">
                            {/* R&D Review */}
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">R&D Review</p>
                                {showSLATimer && latestRndSLA && <SLABadge deadline={latestRndSLA} />}
                              </div>
                              {mouldComp.rnd_review?.verdict === "approved" ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved by {mouldComp.rnd_review.reviewed_by}
                                </span>
                              ) : mouldComp.rnd_review?.verdict === "rejected" ? (
                                <span className="text-xs font-semibold text-red-700">Rejected — revision requested</span>
                              ) : canReviewRnd ? (
                                <div className="space-y-1.5">
                                  <textarea
                                    placeholder="Review comments..."
                                    value={reviewComments[`rnd_${comp.componentId}`] || ""}
                                    onChange={e => setReviewComments(prev => ({ ...prev, [`rnd_${comp.componentId}`]: e.target.value }))}
                                    rows={2}
                                    className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => onMouldReview(comp.componentId, "rnd", "approved", reviewComments[`rnd_${comp.componentId}`] || "")}
                                      className="flex-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg transition-colors">
                                      Approve
                                    </button>
                                    <button onClick={() => onMouldReview(comp.componentId, "rnd", "rejected", reviewComments[`rnd_${comp.componentId}`] || "")}
                                      disabled={!reviewComments[`rnd_${comp.componentId}`]?.trim()}
                                      className="flex-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors">
                                      Request Revision
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-indigo-600 italic">Awaiting R&D review</p>
                              )}
                            </div>

                            {/* Sourcing Review */}
                            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Sourcing Review</p>
                                {showSLATimer && latestSourcingSLA && <SLABadge deadline={latestSourcingSLA} />}
                              </div>
                              {mouldComp.sourcing_review?.verdict === "approved" ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved by {mouldComp.sourcing_review.reviewed_by}
                                </span>
                              ) : mouldComp.sourcing_review?.verdict === "rejected" ? (
                                <span className="text-xs font-semibold text-red-700">Rejected — revision requested</span>
                              ) : canReviewSourcing ? (
                                <div className="space-y-1.5">
                                  <textarea
                                    placeholder="Review comments..."
                                    value={reviewComments[`sourcing_${comp.componentId}`] || ""}
                                    onChange={e => setReviewComments(prev => ({ ...prev, [`sourcing_${comp.componentId}`]: e.target.value }))}
                                    rows={2}
                                    className="w-full rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => onMouldReview(comp.componentId, "sourcing", "approved", reviewComments[`sourcing_${comp.componentId}`] || "")}
                                      className="flex-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg transition-colors">
                                      Approve
                                    </button>
                                    <button onClick={() => onMouldReview(comp.componentId, "sourcing", "rejected", reviewComments[`sourcing_${comp.componentId}`] || "")}
                                      disabled={!reviewComments[`sourcing_${comp.componentId}`]?.trim()}
                                      className="flex-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors">
                                      Request Revision
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-teal-600 italic">Awaiting Sourcing review</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
