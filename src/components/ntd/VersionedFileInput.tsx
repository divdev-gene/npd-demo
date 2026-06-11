"use client"
import { useState } from "react"
import { ExternalLink, ChevronDown, ChevronUp, Upload, CheckCircle2, History, MessageSquare, Plus, Check } from "lucide-react"
import type { VersionedFile, NTDRole } from "@/types/ntd"

interface VersionedFileInputProps {
  file: VersionedFile | null
  slotName: string
  onUpload: (link: string, note?: string) => void
  onRevise: (link: string, note?: string, commentId?: string) => void
  onApprove?: (fileId: string) => void
  onAddComment?: (text: string, requiresRevision: boolean) => void
  onResolveComment?: (commentId: string) => void
  readOnly?: boolean
  showApproveButton?: boolean
  role: NTDRole
}

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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function VersionedFileInput({
  file,
  slotName,
  onUpload,
  onRevise,
  onApprove,
  onAddComment,
  onResolveComment,
  readOnly = false,
  showApproveButton = false,
  role,
}: VersionedFileInputProps) {
  const [uploadLink, setUploadLink] = useState("")
  const [uploadNote, setUploadNote] = useState("")
  const [showRevise, setShowRevise] = useState(false)
  const [reviseLink, setReviseLink] = useState("")
  const [reviseNote, setReviseNote] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [requiresRevision, setRequiresRevision] = useState(false)

  const isInternalRole = role !== "supplier" && role !== "vendor"
  const hasUnresolvedRevision = file?.comments.some(c => c.requires_revision && !c.resolved) ?? false
  const currentLink = file?.versions.find(v => v.version_no === file.current_version)?.link ?? ""

  if (!file) {
    if (readOnly) return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{slotName}</p>
        <p className="text-xs text-slate-400 italic mt-0.5">No file uploaded</p>
      </div>
    )
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{slotName}</p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste Drive / SharePoint link"
            value={uploadLink}
            onChange={e => setUploadLink(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => { if (uploadLink.trim()) { onUpload(uploadLink.trim(), uploadNote || undefined); setUploadLink(""); setUploadNote("") } }}
            disabled={!uploadLink.trim()}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white ${file.approved ? "border-emerald-300" : hasUnresolvedRevision ? "border-red-300" : "border-slate-200"}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{slotName}</p>
          <a href={currentLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-700 text-xs font-medium hover:underline truncate max-w-[180px]">
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{currentLink}</span>
          </a>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0">
            v{file.current_version}
          </span>
          {file.approved && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setShowHistory(!showHistory)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Version history">
            <History className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowComments(!showComments)}
            className={`p-1 rounded hover:bg-slate-100 transition-colors ${file.comments.length > 0 ? "text-amber-600" : "text-slate-400 hover:text-slate-600"}`}
            title="Comments">
            <MessageSquare className="w-3.5 h-3.5" />
            {file.comments.filter(c => !c.resolved).length > 0 && (
              <span className="ml-0.5 text-[9px] font-bold">{file.comments.filter(c => !c.resolved).length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Version history */}
      {showHistory && (
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Version History</p>
          {[...file.versions].reverse().map(v => (
            <div key={v.version_no} className="flex items-start gap-2 text-xs">
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">v{v.version_no}</span>
              <div className="min-w-0">
                <a href={v.link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate block max-w-[200px]">{v.link}</a>
                <p className="text-slate-400">{v.uploaded_by} · {relativeTime(v.uploaded_at)}
                  {v.upload_note && <> · <span className="italic">{v.upload_note}</span></>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="px-3 py-2 border-b border-slate-100 space-y-2">
          {file.comments.length === 0 && (
            <p className="text-xs text-slate-400 italic">No comments yet</p>
          )}
          {file.comments.map(c => (
            <div key={c.comment_id}
              className={`rounded-lg p-2 text-xs ${c.requires_revision && !c.resolved ? "border-l-2 border-red-400 bg-red-50" : "bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[c.author_role]}`}>{c.author}</span>
                  {c.requires_revision && !c.resolved && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Revision Required</span>
                  )}
                  {c.resolved && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Resolved
                    </span>
                  )}
                </div>
                <span className="text-slate-400 text-[10px]" title={c.created_at}>{relativeTime(c.created_at)}</span>
              </div>
              <p className="text-slate-700">{c.text}</p>
              {!c.resolved && isInternalRole && onResolveComment && (
                <button onClick={() => onResolveComment(c.comment_id)}
                  className="mt-1 text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold">
                  Mark Resolved
                </button>
              )}
            </div>
          ))}
          {!readOnly && onAddComment && (
            <div className="space-y-1.5 pt-1">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={requiresRevision} onChange={e => setRequiresRevision(e.target.checked)}
                    className="rounded border-slate-300" />
                  Requires Revision
                </label>
                <button onClick={() => { if (newComment.trim()) { onAddComment(newComment.trim(), requiresRevision); setNewComment(""); setRequiresRevision(false) } }}
                  disabled={!newComment.trim()}
                  className="text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg transition-colors">
                  <Plus className="w-3 h-3 inline mr-1" />Comment
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions row */}
      {!readOnly && !file.approved && (
        <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
          {!showRevise ? (
            <button onClick={() => setShowRevise(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors">
              <Upload className="w-3 h-3" /> Upload New Version
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <input type="url" placeholder="New version link" value={reviseLink}
                onChange={e => setReviseLink(e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input type="text" placeholder="Note (optional)" value={reviseNote}
                onChange={e => setReviseNote(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => { if (reviseLink.trim()) { onRevise(reviseLink.trim(), reviseNote || undefined); setReviseLink(""); setReviseNote(""); setShowRevise(false) } }}
                disabled={!reviseLink.trim()}
                className="flex items-center gap-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors shrink-0">
                <Upload className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setShowRevise(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
            </div>
          )}
          {showApproveButton && !hasUnresolvedRevision && isInternalRole && onApprove && (
            <button onClick={() => onApprove(file.file_id)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors">
              <CheckCircle2 className="w-3 h-3" /> Approve
            </button>
          )}
        </div>
      )}
    </div>
  )
}
