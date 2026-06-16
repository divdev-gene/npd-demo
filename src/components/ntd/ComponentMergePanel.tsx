"use client"

import { useState } from "react"
import { GitMerge, Undo2, ChevronDown, ChevronRight } from "lucide-react"
import { nanoid } from "nanoid"
import type { NTDComponent, NTDCommodity, NTDMergeRecord } from "@/types/ntd"
import { getNTDMerges, setNTDMerges, getNTDInitiation, setNTDInitiation } from "@/lib/ntd"

interface Props {
  ntdId: string
  commodity: NTDCommodity
  /** IDs currently selected for merge (controlled by parent) */
  selectedIds: Set<string>
  /** Called to clear selection after a merge */
  onClearSelection: () => void
  /** Called after merge/split so parent can reload */
  onUpdate: () => void
  /** Current user label for activity attribution */
  currentRole: string
  /** Disable when stage >= 3 (RFQ dispatched) */
  locked?: boolean
}

export default function ComponentMergePanel({
  ntdId,
  commodity,
  selectedIds,
  onClearSelection,
  onUpdate,
  currentRole,
  locked = false,
}: Props) {
  const [mergedName, setMergedName] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const mergesData = getNTDMerges(ntdId)
  const existingMerges = (mergesData?.records ?? []).filter(
    (r) => r.commodity === commodity && !r.split
  )

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleMerge() {
    if (selectedIds.size < 2 || !mergedName.trim()) return
    const init = getNTDInitiation(ntdId)
    if (!init) return

    const sourceIds = [...selectedIds]
    const maxId = Math.max(
      0,
      ...init.components.map((c) => parseInt(c.componentId.replace("C", ""), 10))
    )
    const resultId = `C${String(maxId + 1).padStart(2, "0")}`

    const mergeRecord: NTDMergeRecord = {
      merge_id: `merge_${nanoid(8)}`,
      source_ids: sourceIds,
      result_id: resultId,
      result_name: mergedName.trim(),
      commodity,
      merged_by: currentRole,
      merged_at: new Date().toISOString(),
    }

    const updatedComponents: NTDComponent[] = init.components.map((c) =>
      sourceIds.includes(c.componentId)
        ? { ...c, status: "merged" as const, merged_into: resultId }
        : c
    )
    updatedComponents.push({
      componentId: resultId,
      name: mergedName.trim(),
      commodity,
      status: "active" as const,
    })

    setNTDInitiation(ntdId, { ...init, components: updatedComponents })

    const current = getNTDMerges(ntdId)
    setNTDMerges(ntdId, {
      records: [...(current?.records ?? []), mergeRecord],
    })

    setMergedName("")
    onClearSelection()
    onUpdate()
  }

  function handleSplit(mergeId: string) {
    const init = getNTDInitiation(ntdId)
    if (!init) return
    const merges = getNTDMerges(ntdId)
    if (!merges) return

    const record = merges.records.find((r) => r.merge_id === mergeId)
    if (!record) return

    const updatedComponents: NTDComponent[] = init.components
      .filter((c) => c.componentId !== record.result_id)
      .map((c) =>
        record.source_ids.includes(c.componentId)
          ? { ...c, status: "active" as const, merged_into: undefined }
          : c
      )

    setNTDInitiation(ntdId, { ...init, components: updatedComponents })
    setNTDMerges(ntdId, {
      records: merges.records.map((r) =>
        r.merge_id === mergeId
          ? { ...r, split: { split_by: currentRole, split_at: new Date().toISOString() } }
          : r
      ),
    })

    onUpdate()
  }

  const canMerge = selectedIds.size >= 2 && selectedIds.size <= 3

  return (
    <div className="space-y-2">
      {/* Existing merges */}
      {existingMerges.map((m) => (
        <div
          key={m.merge_id}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toggleExpanded(m.merge_id)}
              className="flex items-center gap-1.5 font-medium text-amber-800"
            >
              {expanded.has(m.merge_id) ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <GitMerge className="h-3.5 w-3.5" />
              {m.result_name}
              <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700">
                MERGED
              </span>
            </button>
            {!locked && (
              <button
                type="button"
                onClick={() => handleSplit(m.merge_id)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100"
              >
                <Undo2 className="h-3 w-3" />
                Split
              </button>
            )}
          </div>
          {expanded.has(m.merge_id) && (
            <div className="mt-1.5 pl-5 text-xs text-amber-700">
              Sources: {m.source_ids.join(", ")} · Merged by {m.merged_by}
            </div>
          )}
        </div>
      ))}

      {/* Merge action bar — appears when 2-3 rows are checked */}
      {!locked && canMerge && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <GitMerge className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="shrink-0 text-xs text-indigo-700">
            Merge {selectedIds.size} into:
          </span>
          <input
            type="text"
            value={mergedName}
            onChange={(e) => setMergedName(e.target.value)}
            placeholder="New component name…"
            className="min-w-0 flex-1 rounded border border-indigo-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            disabled={!mergedName.trim()}
            onClick={handleMerge}
            className="shrink-0 rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40 hover:bg-indigo-700"
          >
            Merge
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="shrink-0 rounded px-2 py-1 text-xs text-slate-500 hover:bg-indigo-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Hint when exactly 1 is selected */}
      {!locked && selectedIds.size === 1 && (
        <p className="px-1 text-[11px] text-slate-400">
          Select 1–2 more to merge them together.
        </p>
      )}
    </div>
  )
}
