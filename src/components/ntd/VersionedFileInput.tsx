"use client"
import { useState } from "react"
import { ExternalLink, ChevronDown, ChevronUp, Upload, CheckCircle2, History, MessageSquare, Plus, Check, Paperclip, X } from "lucide-react"
import type { VersionedFile, NTDRole } from "@/types/ntd"

interface VersionedFileInputProps {
  file: VersionedFile | null
  slotName: string
  onUpload: (link: string, note?: string) => void
  onRevise: (link: string, note?: string, commentId?: string) => void
  onApprove?: (fileId: string) => void
  onAddComment?: (text: string, requiresRevision: boolean, attachmentLink?: string, attachmentName?: string) => void
  onResolveComment?: (commentId: string) => void
  // readOnly = supplier cannot upload/revise; internal roles can still approve + comment
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
  const [uploadFileName, setUploadFileName] = useState("")
  const [showRevise, setShowRevise] = useState(false)
  const [reviseLink, setReviseLink] = useState("")
  const [reviseNote, setReviseNote] = useState("")
  const [reviseFileName, setReviseFileName] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [requiresRevision, setRequiresRevision] = useState(false)
  const [commentAttachLink, setCommentAttachLink] = useState("")
  const [commentAttachName, setCommentAttachName] = useState("")
  const isInternalRole = role !== "supplier" && role !== "vendor"
  const currentVersion = file?.versions.find(v => v.version_no === file.current_version)
  const currentLink = currentVersion?.link ?? ""
  // A revision-required comment only blocks approval if it was added AFTER the current version
  // was uploaded — meaning the supplier hasn't yet addressed it. Comments predating the current
  // upload were addressed by the re-upload and no longer block.
  const hasBlockingRevision = file?.comments.some(c => {
    if (!c.requires_revision || c.resolved) return false
    if (!currentVersion?.uploaded_at) return true
    return new Date(c.created_at) > new Date(currentVersion.uploaded_at)
  }) ?? false

  const canUploadNew = !readOnly

  // No file uploaded yet
  if (!file) {
    if (!canUploadNew) return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase">{slotName}</p>
        <p className="text-xs text-slate-400 italic mt-0.5">Awaiting supplier upload</p>
      </div>
    )
    return (
      <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 space-y-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase">{slotName}</p>
        <div className="flex items-center gap-2">
          {uploadFileName ? (
            <div className="flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2 py-1 flex-1 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-xs text-blue-700 truncate flex-1">{uploadFileName}</span>
              <button onClick={() => { setUploadLink(""); setUploadFileName(""); setUploadNote("") }}><X className="w-3 h-3 text-slate-400" /></button>
            </div>
          ) : (
            <input type="text" autoComplete="off" placeholder="Paste Drive / SharePoint link" value={uploadLink}
              onChange={e => setUploadLink(e.target.value)}
              className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          )}
          <button onClick={() => {
            if (uploadFileName) { setUploadLink(""); setUploadFileName(""); setUploadNote("") }
            else { setUploadLink("attached"); setUploadFileName("Attached"); setUploadNote("Attached") }
          }}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded transition-colors border ${
              uploadFileName ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 hover:text-slate-700 border-slate-200"
            }`}>
            {uploadFileName ? <Check className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
            {uploadFileName ? "Attached" : "Attach"}
          </button>
          <button onClick={() => { if (uploadLink.trim()) { onUpload(uploadLink.trim(), uploadNote || undefined); setUploadLink(""); setUploadNote(""); setUploadFileName("") } }}
            disabled={!uploadLink.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white px-3 py-1.5 rounded transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
      </div>
    )
  }

  // File exists — show current version, actions
  const canApproveHere = showApproveButton && isInternalRole && !file.approved && !hasBlockingRevision && onApprove
  const canComment = isInternalRole && onAddComment
  const canUploadRevise = !readOnly && !file.approved
  const pendingComments = file.comments.filter(c => !c.resolved).length

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 space-y-2">
      {/* File info row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[11px] font-bold uppercase tracking-wider shrink-0 ${file.approved ? "text-emerald-600" : "text-slate-500"}`}>{slotName}</span>
          {currentLink ? (
            <a href={currentLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 text-xs hover:underline truncate max-w-[180px]">
              {currentLink.startsWith("data:") ? <Paperclip className="w-3 h-3 shrink-0" /> : <ExternalLink className="w-3 h-3 shrink-0" />}
              <span className="truncate">{currentVersion?.upload_note ?? (currentLink.startsWith("data:") ? "File" : "Link")}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic">Not submitted</span>
          )}
          {file.current_version > 0 && (
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">v{file.current_version}</span>
          )}
          {file.approved && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {pendingComments > 0 && (
            <button onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-2 py-1 rounded transition-colors">
              <MessageSquare className="w-3 h-3" /> {pendingComments}
            </button>
          )}
          {!file.approved && canApproveHere && (
            <button onClick={() => onApprove!(file.file_id)}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {!file.approved && canUploadRevise && !showRevise && (
            <button onClick={() => setShowRevise(true)}
              className="flex items-center gap-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded transition-colors shadow-sm">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          )}
          {!file.approved && canUploadRevise && showRevise && (
            <button onClick={() => setShowRevise(false)}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">Cancel</button>
          )}
          <button onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors">
            <MessageSquare className="w-3.5 h-3.5" /> Comment
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors">
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      {/* Upload form */}
      {showRevise && canUploadRevise && (
        <div className="flex items-center gap-2">
          {reviseFileName ? (
            <div className="flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 px-2 py-1 flex-1 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-xs text-blue-700 truncate flex-1">{reviseFileName}</span>
              <button onClick={() => { setReviseLink(""); setReviseFileName(""); setReviseNote("") }}><X className="w-3 h-3 text-slate-400" /></button>
            </div>
          ) : (
            <input type="text" autoComplete="off" placeholder="Paste new version link" value={reviseLink}
              onChange={e => setReviseLink(e.target.value)}
              className="flex-1 min-w-0 rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          )}
          <button onClick={() => {
            if (reviseFileName) { setReviseLink(""); setReviseFileName(""); setReviseNote("") }
            else { setReviseLink("attached"); setReviseFileName("Attached"); setReviseNote("Attached") }
          }}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded transition-colors border ${
              reviseFileName ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 hover:text-slate-700 border-slate-200"
            }`}>
            {reviseFileName ? <Check className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
            {reviseFileName ? "Attached" : "Attach"}
          </button>
          <button onClick={() => { if (reviseLink.trim()) { onRevise(reviseLink.trim(), reviseNote || undefined); setReviseLink(""); setReviseNote(""); setReviseFileName(""); setShowRevise(false) } }}
            disabled={!reviseLink.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white px-3 py-1.5 rounded transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="bg-slate-50 rounded px-2 py-1.5 space-y-1">
          {[...file.versions].reverse().map(v => (
            <div key={v.version_no} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 py-0.5 rounded">v{v.version_no}</span>
              <span className="text-slate-500 truncate">{v.uploaded_by}</span>
              <span className="text-slate-400">· {relativeTime(v.uploaded_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="space-y-1.5 pl-1 border-l-2 border-slate-100">
          {file.comments.map(c => (
            <div key={c.comment_id} className={`text-[11px] ${c.requires_revision && !c.resolved ? "border-l-2 border-red-400 pl-2" : "pl-2"}`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${ROLE_COLORS[c.author_role]}`}>{c.author}</span>
                {c.requires_revision && !c.resolved && <span className="text-[10px] font-bold text-red-600">Requires revision</span>}
                {c.resolved && <span className="text-[10px] text-emerald-600">Resolved</span>}
                <span className="text-[10px] text-slate-400">{relativeTime(c.created_at)}</span>
              </div>
              <p className="text-slate-600 mt-0.5">{c.text}</p>
              {!c.resolved && isInternalRole && onResolveComment && (
                <button onClick={() => onResolveComment(c.comment_id)}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 font-semibold">Resolve</button>
              )}
            </div>
          ))}
          {canComment && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
              <textarea autoComplete="off" value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={requiresRevision} onChange={e => setRequiresRevision(e.target.checked)}
                      className="rounded border-slate-300" />
                    Requires Revision
                  </label>
                  <button onClick={() => {
                    if (commentAttachName) { setCommentAttachLink(""); setCommentAttachName("") }
                    else { setCommentAttachLink("attached"); setCommentAttachName("Attached") }
                  }}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors border ${
                      commentAttachName ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-500 hover:text-slate-700 border-slate-200"
                    }`}>
                    {commentAttachName ? <Check className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                    {commentAttachName ? "Attached" : "Attach"}
                  </button>
                </div>
                <button onClick={() => {
                  if (newComment.trim()) {
                    onAddComment(newComment.trim(), requiresRevision, commentAttachLink.trim() || undefined, commentAttachName || undefined)
                    setNewComment(""); setRequiresRevision(false); setCommentAttachLink(""); setCommentAttachName("")
                  }
                }} disabled={!newComment.trim()}
                  className="flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-3 py-1.5 rounded transition-colors">Post</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
