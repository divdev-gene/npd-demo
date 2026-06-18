"use client"
import { useState } from "react"
import {
  ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, Circle,
  FileText, History, Upload, ExternalLink, Plus, FolderOpen,
} from "lucide-react"
import type { NTDDFMComponent, NTDMouldComponent, NTDRole, VersionedFile } from "@/types/ntd"
import { VersionedFileInput } from "./VersionedFileInput"
import { getSLAStatus } from "@/lib/ntd"

type ComponentStatus = "pending" | "under_review" | "revision_required" | "approved"

const STATUS_META: Record<ComponentStatus, { label: string; cls: string; dot: string }> = {
  pending:           { label: "Pending",           cls: "bg-slate-100 text-slate-600",   dot: "bg-slate-300" },
  under_review:      { label: "Under Review",      cls: "bg-amber-100 text-amber-700",   dot: "bg-amber-400" },
  revision_required: { label: "Revision Required", cls: "bg-red-100 text-red-700",       dot: "bg-red-500" },
  approved:          { label: "Approved",          cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
}

type FileStatus = "empty" | "uploaded" | "needs_revision" | "approved"

function getFileStatus(file: VersionedFile | null | undefined): FileStatus {
  if (!file || file.current_version === 0 || !file.versions.find(v => v.version_no === file.current_version)?.link) return "empty"
  if (file.approved) return "approved"
  if (file.comments.some(c => c.requires_revision && !c.resolved)) return "needs_revision"
  return "uploaded"
}

const FILE_STATUS_META: Record<FileStatus, { cls: string; dot: string; label: string }> = {
  empty:          { cls: "text-slate-400", dot: "bg-slate-300",  label: "Not submitted" },
  uploaded:       { cls: "text-amber-600", dot: "bg-amber-400",  label: "Uploaded" },
  needs_revision: { cls: "text-red-600",   dot: "bg-red-500",    label: "Needs revision" },
  approved:       { cls: "text-emerald-600", dot: "bg-emerald-500", label: "Approved" },
}

function FileStatusPill({ label, status }: { label: string; status: FileStatus }) {
  const meta = FILE_STATUS_META[status]
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold ${meta.cls}`}>
      {status === "approved"
        ? <CheckCircle2 className="w-3 h-3" />
        : <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />}
      {label}
    </span>
  )
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

function relTime(iso: string) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

// ── Iteration history derived from file versions + comments ──────────────────

type IterationSnapshot = {
  iter: number
  submittedAt: string
  pptLink: string
  pptVersion: number
  d3dLink: string
  d3dVersion: number
  feedbackComments: { file: string; text: string; resolved: boolean }[]
  pptApprovedAt?: string
  d3dApprovedAt?: string
}

function buildIterationHistory(comp: NTDDFMComponent): IterationSnapshot[] {
  // Group ppt versions and design_3d versions by version_no into iterations
  const pptVersions = comp.ppt?.versions ?? []
  const d3dVersions = comp.design_3d?.versions ?? []
  const maxIter = Math.max(pptVersions.length, d3dVersions.length, 1)
  const snapshots: IterationSnapshot[] = []

  for (let i = 1; i <= maxIter; i++) {
    const pptV = pptVersions.find(v => v.version_no === i)
    const d3dV = d3dVersions.find(v => v.version_no === i)
    if (!pptV && !d3dV) continue

    const submittedAt = pptV?.uploaded_at ?? d3dV?.uploaded_at ?? ""

    // Comments that were likely created after this submission (before next one if any)
    const nextPptV = pptVersions.find(v => v.version_no === i + 1)
    const nextTime = nextPptV?.uploaded_at ? new Date(nextPptV.uploaded_at).getTime() : Infinity
    const allComments = [
      ...(comp.ppt?.comments ?? []).filter(c => {
        const t = new Date(c.created_at).getTime()
        return t >= new Date(submittedAt).getTime() && t < nextTime
      }).map(c => ({ file: "PPT", text: c.text, resolved: c.resolved })),
      ...(comp.design_3d?.comments ?? []).filter(c => {
        const t = new Date(c.created_at).getTime()
        return t >= new Date(submittedAt).getTime() && t < nextTime
      }).map(c => ({ file: "3D", text: c.text, resolved: c.resolved })),
    ]

    snapshots.push({
      iter: i,
      submittedAt,
      pptLink: pptV?.link ?? "",
      pptVersion: i,
      d3dLink: d3dV?.link ?? "",
      d3dVersion: i,
      feedbackComments: allComments,
      pptApprovedAt: i === comp.ppt?.current_version && comp.ppt?.approved ? comp.ppt.approved_at : undefined,
      d3dApprovedAt: i === comp.design_3d?.current_version && comp.design_3d?.approved ? comp.design_3d.approved_at : undefined,
    })
  }

  return snapshots.reverse() // newest first
}

// ── RND Docs panel ────────────────────────────────────────────────────────────

function RndDocsPanel({
  docs,
  canUpload,
  onUpload,
}: {
  docs: VersionedFile[]
  canUpload: boolean
  onUpload: (name: string, link: string) => void
}) {
  const [docName, setDocName] = useState("")
  const [docLink, setDocLink] = useState("")
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          R&D Reference Docs
        </p>
        {canUpload && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded-lg transition-colors">
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {canUpload && showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 space-y-1.5">
          <input type="text" autoComplete="off" placeholder="Doc name" value={docName}
            onChange={e => setDocName(e.target.value)}
            className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <input type="text" autoComplete="off" placeholder="Drive / SharePoint link" value={docLink}
            onChange={e => setDocLink(e.target.value)}
            className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <div className="flex gap-1.5">
            <button onClick={() => {
              if (docName.trim() && docLink.trim()) {
                onUpload(docName.trim(), docLink.trim())
                setDocName(""); setDocLink(""); setShowForm(false)
              }
            }} disabled={!docName.trim() || !docLink.trim()}
              className="flex items-center gap-1 text-[11px] font-semibold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white px-2.5 py-1 rounded-lg transition-colors">
              <Upload className="w-3 h-3" /> Share
            </button>
            <button onClick={() => setShowForm(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No docs shared yet</p>
      ) : (
        <div className="space-y-1">
          {docs.map(doc => {
            const link = doc.versions.find(v => v.version_no === doc.current_version)?.link ?? ""
            return (
              <div key={doc.file_id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-medium text-slate-700 flex-1 truncate">{doc.slot_name}</span>
                <span className="text-[10px] text-slate-400">v{doc.current_version}</span>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Iteration history panel ────────────────────────────────────────────────────

function IterationHistoryPanel({ comp }: { comp: NTDDFMComponent }) {
  const history = buildIterationHistory(comp)
  if (history.length === 0) return (
    <p className="text-xs text-slate-400 italic">No submission history yet</p>
  )

  return (
    <div className="space-y-3">
      {history.map(snap => (
        <div key={snap.iter} className="relative pl-5">
          {/* Timeline line */}
          <div className="absolute left-1.5 top-3 bottom-0 w-px bg-slate-200" />
          <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">Iteration {snap.iter}</span>
              <span className="text-[10px] text-slate-400">{relTime(snap.submittedAt)}</span>
            </div>

            {/* Submitted files row */}
            <div className="flex gap-3 text-xs">
              {snap.pptLink && (
                <a href={snap.pptLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-700 hover:underline">
                  <ExternalLink className="w-3 h-3" /> PPT v{snap.pptVersion}
                  {snap.pptApprovedAt && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </a>
              )}
              {snap.d3dLink && (
                <a href={snap.d3dLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-700 hover:underline">
                  <ExternalLink className="w-3 h-3" /> 3D v{snap.d3dVersion}
                  {snap.d3dApprovedAt && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </a>
              )}
            </div>

            {/* Feedback comments */}
            {snap.feedbackComments.length > 0 && (
              <div className="border-t border-slate-200 pt-2 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">R&D Feedback</p>
                {snap.feedbackComments.map((c, i) => (
                  <div key={i} className={`flex items-start gap-1.5 text-xs ${c.resolved ? "text-slate-400" : "text-slate-700"}`}>
                    <span className="font-semibold shrink-0 text-slate-500">{c.file}:</span>
                    <span className={c.resolved ? "line-through" : ""}>{c.text}</span>
                    {c.resolved && <span className="text-[9px] text-emerald-600 shrink-0">(resolved)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────────────────────

interface ComponentApprovalBoardProps {
  components: NTDDFMComponent[] | NTDMouldComponent[]
  mode: "dfm" | "mould"
  role: NTDRole
  onFileAction: (
    componentId: string,
    fileSlot: "ppt" | "design_3d" | "mould_3d" | "mfa_ppt" | "rnd_doc",
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(components.map(c => [c.componentId, c.final_status !== "approved"]))
  )
  const [activeTab, setActiveTab] = useState<Record<string, "files" | "docs" | "history">>({})
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({})

  const approved = components.filter(c => c.final_status === "approved").length
  const total = components.length
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0

  const isInternalRole = role !== "supplier" && role !== "vendor"
  const canReviewRnd = role === "rnd" || role === "rnd_head" || role === "super_admin"
  const canReviewSourcing = role === "sourcing" || role === "sourcing_head" || role === "super_admin"

  const getTab = (id: string) => activeTab[id] ?? "files"
  const setTab = (id: string, tab: "files" | "docs" | "history") =>
    setActiveTab(prev => ({ ...prev, [id]: tab }))

  return (
    <div className="space-y-2">

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
          const isExpanded = !!expanded[comp.componentId]
          const isLocked = "locked" in comp && (comp as NTDMouldComponent).locked
          const statusMeta = STATUS_META[comp.final_status]
          const tab = getTab(comp.componentId)

          // Per-file status (DFM only)
          const dfmComp = mode === "dfm" ? (comp as NTDDFMComponent) : null
          const pptStatus = dfmComp ? getFileStatus(dfmComp.ppt) : null
          const d3dStatus = dfmComp ? getFileStatus(dfmComp.design_3d) : null

          return (
            <div key={comp.componentId}
              className={`rounded-lg transition-all ${
                isApproved || isLocked
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-white border border-slate-200"
              }`}>
              {/* ── Accordion header ── */}
              <button
                onClick={() => !isApproved && !isLocked && setExpanded(prev => ({ ...prev, [comp.componentId]: !prev[comp.componentId] }))}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-colors ${
                  isApproved || isLocked
                    ? "cursor-default"
                    : isExpanded
                    ? "bg-indigo-50/50 cursor-pointer"
                    : "hover:bg-slate-100 cursor-pointer"
                }`}
                disabled={isApproved || !!isLocked}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isApproved
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-slate-400 shrink-0" />}
                  <p className="text-sm font-semibold text-slate-800">{comp.componentId} — {comp.name}</p>
                </div>

                {/* Right: file status + component badge + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {pptStatus && d3dStatus && !isApproved && (
                    <div className="hidden sm:flex items-center gap-2">
                      <FileStatusPill label="PPT" status={pptStatus} />
                      <FileStatusPill label="3D" status={d3dStatus} />
                    </div>
                  )}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusMeta.cls}`}>
                    {statusMeta.label}
                  </span>
                  {!isApproved && !isLocked && (
                    isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* ── Expanded body ── */}
              {isExpanded && !isApproved && !isLocked && (
                <div className="border-t border-slate-100">
                  {/* Tab bar */}
                  {mode === "dfm" && (
                    <div className="flex border-b border-slate-100 px-3 gap-1">
                      {(["files", "docs", "history"] as const).map(t => {
                        const icons = { files: FileText, docs: FolderOpen, history: History }
                        const labels = { files: "Files & Review", docs: "R&D Docs", history: "History" }
                        const Icon = icons[t]
                        const hasBadge = t === "docs" && dfmComp && (dfmComp.rnd_docs ?? []).length > 0
                        return (
                          <button key={t} onClick={() => setTab(comp.componentId, t)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${
                              tab === t
                                ? "border-indigo-500 text-indigo-700"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                            }`}>
                            <Icon className="w-3 h-3" />
                            {labels[t]}
                            {hasBadge && (
                              <span className="w-3.5 h-3.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                                {(dfmComp?.rnd_docs ?? []).length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="px-3 py-3">
                    {/* ─── DFM mode ─── */}
                    {mode === "dfm" && dfmComp && (() => {
                      const pptHasLink = !!(dfmComp.ppt?.versions.find(v => v.version_no === dfmComp.ppt?.current_version)?.link)
                      const d3dHasLink = !!(dfmComp.design_3d?.versions.find(v => v.version_no === dfmComp.design_3d?.current_version)?.link)
                      const filesApproved = dfmComp.ppt?.approved && dfmComp.design_3d?.approved

                      if (tab === "files") return (
                        <div className="space-y-2 bg-slate-50 rounded-lg p-2.5">
                          <VersionedFileInput
                            file={dfmComp.ppt}
                            slotName="DFM PPT"
                            role={role}
                            readOnly={isInternalRole}
                            showApproveButton={canReviewRnd && pptHasLink}
                            onUpload={(link, note) => onFileAction(comp.componentId, "ppt", "upload", { link, note })}
                            onRevise={(link, note, cid) => onFileAction(comp.componentId, "ppt", "revise", { link, note, cid })}
                            onApprove={(fid) => onFileAction(comp.componentId, "ppt", "approve", { fid })}
                            onAddComment={(text, req, al, an) => onFileAction(comp.componentId, "ppt", "comment", { text, req, attachmentLink: al, attachmentName: an })}
                            onResolveComment={(cid) => onFileAction(comp.componentId, "ppt", "resolve", { cid })}
                          />
                          <VersionedFileInput
                            file={dfmComp.design_3d}
                            slotName="3D Design"
                            role={role}
                            readOnly={isInternalRole}
                            showApproveButton={canReviewRnd && d3dHasLink}
                            onUpload={(link, note) => onFileAction(comp.componentId, "design_3d", "upload", { link, note })}
                            onRevise={(link, note, cid) => onFileAction(comp.componentId, "design_3d", "revise", { link, note, cid })}
                            onApprove={(fid) => onFileAction(comp.componentId, "design_3d", "approve", { fid })}
                            onAddComment={(text, req, al, an) => onFileAction(comp.componentId, "design_3d", "comment", { text, req, attachmentLink: al, attachmentName: an })}
                            onResolveComment={(cid) => onFileAction(comp.componentId, "design_3d", "resolve", { cid })}
                          />
                        </div>
                      )

                      if (tab === "docs") return (
                        <RndDocsPanel
                          docs={dfmComp.rnd_docs ?? []}
                          canUpload={canReviewRnd}
                          onUpload={(name, link) => onFileAction(comp.componentId, "rnd_doc", "upload", { name, link })}
                        />
                      )

                      if (tab === "history") return (
                        <IterationHistoryPanel comp={dfmComp} />
                      )

                      return null
                    })()}

                    {/* ─── Mould mode ─── */}
                    {mode === "mould" && (() => {
                      const mouldComp = comp as NTDMouldComponent
                      const latestRndSLA = mouldComp.rnd_review?.sla_deadline
                      const latestSourcingSLA = mouldComp.sourcing_review?.sla_deadline
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <VersionedFileInput
                              file={mouldComp.mould_3d}
                              slotName="Mould 3D"
                              role={role}
                              readOnly={isInternalRole}
                              onUpload={(link, note) => onFileAction(comp.componentId, "mould_3d", "upload", { link, note })}
                              onRevise={(link, note, cid) => onFileAction(comp.componentId, "mould_3d", "revise", { link, note, cid })}
                              onAddComment={(text, req, al, an) => onFileAction(comp.componentId, "mould_3d", "comment", { text, req, attachmentLink: al, attachmentName: an })}
                              onResolveComment={(cid) => onFileAction(comp.componentId, "mould_3d", "resolve", { cid })}
                            />
                            <VersionedFileInput
                              file={mouldComp.mfa_ppt}
                              slotName="MFA PPT"
                              role={role}
                              readOnly={isInternalRole}
                              onUpload={(link, note) => onFileAction(comp.componentId, "mfa_ppt", "upload", { link, note })}
                              onRevise={(link, note, cid) => onFileAction(comp.componentId, "mfa_ppt", "revise", { link, note, cid })}
                              onAddComment={(text, req, al, an) => onFileAction(comp.componentId, "mfa_ppt", "comment", { text, req, attachmentLink: al, attachmentName: an })}
                              onResolveComment={(cid) => onFileAction(comp.componentId, "mfa_ppt", "resolve", { cid })}
                            />
                          </div>

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
                                    <textarea placeholder="Review comments..." rows={2} autoComplete="off"
                                      value={reviewComments[`rnd_${comp.componentId}`] || ""}
                                      onChange={e => setReviewComments(prev => ({ ...prev, [`rnd_${comp.componentId}`]: e.target.value }))}
                                      className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => onMouldReview(comp.componentId, "rnd", "approved", reviewComments[`rnd_${comp.componentId}`] || "")}
                                        className="flex-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg transition-colors">Approve</button>
                                      <button onClick={() => onMouldReview(comp.componentId, "rnd", "rejected", reviewComments[`rnd_${comp.componentId}`] || "")}
                                        disabled={!reviewComments[`rnd_${comp.componentId}`]?.trim()}
                                        className="flex-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors">Request Revision</button>
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
                                    <textarea placeholder="Review comments..." rows={2} autoComplete="off"
                                      value={reviewComments[`sourcing_${comp.componentId}`] || ""}
                                      onChange={e => setReviewComments(prev => ({ ...prev, [`sourcing_${comp.componentId}`]: e.target.value }))}
                                      className="w-full rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => onMouldReview(comp.componentId, "sourcing", "approved", reviewComments[`sourcing_${comp.componentId}`] || "")}
                                        className="flex-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg transition-colors">Approve</button>
                                      <button onClick={() => onMouldReview(comp.componentId, "sourcing", "rejected", reviewComments[`sourcing_${comp.componentId}`] || "")}
                                        disabled={!reviewComments[`sourcing_${comp.componentId}`]?.trim()}
                                        className="flex-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors">Request Revision</button>
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
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
