// ============================================================
// lib/ntd.ts
// NTD localStorage helpers v2 | Amber Enterprises NPD Platform
// ============================================================

import { nanoid } from "nanoid"
import type {
  NTDRecord,
  NTDStage,
  NTDActivityLog,
  ActivityEntry,
  NTDActionType,
  NTDRole,
  VersionedFile,
  FileVersion,
  FileComment,
  NTDInitiationData,
  NTDSpecData,
  NTDRFQData,
  NTDQuotationData,
  NTDSelectionData,
  NTDHandoffData,
  NTDDFMData,
  NTDMouldData,
  NTDMfgData,
  NTDTrialsData,
  NTDRedesignData,
  NTDStage11Data,
} from "@/types/ntd"

// ─── Key Builders ─────────────────────────────────────────────

export const NTD_KEYS = {
  records:     ()          => `ntd_records`,
  record:      (id: string) => `ntd_record_${id}`,
  activity:    (id: string) => `ntd_activity_${id}`,
  initiation:  (id: string) => `ntd_initiation_${id}`,
  spec:        (id: string) => `ntd_spec_${id}`,
  rfq:         (id: string) => `ntd_rfq_${id}`,
  quotation:   (id: string) => `ntd_quotation_${id}`,
  selection:   (id: string) => `ntd_selection_${id}`,
  handoff:     (id: string) => `ntd_handoff_${id}`,
  dfm:         (id: string) => `ntd_dfm_${id}`,
  mould:       (id: string) => `ntd_mould_${id}`,
  mfg:         (id: string) => `ntd_mfg_${id}`,
  trials:      (id: string) => `ntd_trials_${id}`,
  redesign:    (id: string) => `ntd_redesign_${id}`,
  stage11:     (id: string) => `ntd_stage11_${id}`,
} as const

// ─── Generic Helpers ──────────────────────────────────────────

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function lsSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── ID & Token Generators ────────────────────────────────────

export function generateNTDId(): string {
  return `NTD-${Date.now()}-${nanoid(5).toUpperCase()}`
}

export function generateVendorToken(): string {
  return nanoid(8).toUpperCase()
}

export function generateFileId(): string {
  return `file_${nanoid(8)}`
}

export function generateCommentId(): string {
  return `comment_${nanoid(8)}`
}

export function generateActivityId(): string {
  return `act_${nanoid(10)}`
}

// ─── VersionedFile Helpers ────────────────────────────────────

export function createVersionedFile(slotName: string, link: string, uploadedBy: string): VersionedFile {
  return {
    file_id: generateFileId(),
    slot_name: slotName,
    versions: [
      {
        version_no: 1,
        link,
        uploaded_by: uploadedBy,
        uploaded_at: new Date().toISOString(),
      },
    ],
    current_version: 1,
    comments: [],
    approved: false,
  }
}

export function addFileVersion(
  file: VersionedFile,
  link: string,
  uploadedBy: string,
  uploadNote?: string,
  triggeredByCommentId?: string
): VersionedFile {
  const newVersion: FileVersion = {
    version_no: file.current_version + 1,
    link,
    uploaded_by: uploadedBy,
    uploaded_at: new Date().toISOString(),
    upload_note: uploadNote,
    triggered_by_comment_id: triggeredByCommentId,
  }
  return {
    ...file,
    versions: [...file.versions, newVersion],
    current_version: newVersion.version_no,
    approved: false,        // revision resets approval
    approved_by: undefined,
    approved_at: undefined,
  }
}

export function approveFile(file: VersionedFile, approvedBy: string): VersionedFile {
  return {
    ...file,
    approved: true,
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  }
}

export function addFileComment(
  file: VersionedFile,
  author: string,
  authorRole: NTDRole,
  text: string,
  requiresRevision: boolean
): VersionedFile {
  const comment: FileComment = {
    comment_id: generateCommentId(),
    author,
    author_role: authorRole,
    text,
    created_at: new Date().toISOString(),
    requires_revision: requiresRevision,
    resolved: false,
  }
  return {
    ...file,
    comments: [...file.comments, comment],
  }
}

export function resolveComment(file: VersionedFile, commentId: string, resolvedBy: string): VersionedFile {
  return {
    ...file,
    comments: file.comments.map((c) =>
      c.comment_id === commentId
        ? { ...c, resolved: true, resolved_by: resolvedBy, resolved_at: new Date().toISOString() }
        : c
    ),
  }
}

export function getLatestFileLink(file: VersionedFile): string {
  const v = file.versions.find((v) => v.version_no === file.current_version)
  return v?.link ?? ""
}

export function hasUnresolvedRevisionComments(file: VersionedFile): boolean {
  return file.comments.some((c) => c.requires_revision && !c.resolved)
}

// ─── Activity Log ─────────────────────────────────────────────

export function getActivityLog(ntdId: string): NTDActivityLog {
  return lsGet<NTDActivityLog>(NTD_KEYS.activity(ntdId)) ?? { entries: [] }
}

export function appendActivity(
  ntdId: string,
  actor: string,
  actorRole: NTDRole,
  stage: number,
  actionType: NTDActionType,
  description: string,
  payload?: ActivityEntry["payload"],
  substage?: "8A" | "8B"
): void {
  const log = getActivityLog(ntdId)
  const entry: ActivityEntry = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    actor,
    actor_role: actorRole,
    stage,
    substage,
    action_type: actionType,
    description,
    payload,
  }
  lsSet(NTD_KEYS.activity(ntdId), { entries: [...log.entries, entry] })
}

// ─── NTD Record CRUD ──────────────────────────────────────────

export function getAllNTDRecords(): NTDRecord[] {
  return lsGet<NTDRecord[]>(NTD_KEYS.records()) ?? []
}

export function getNTDRecord(id: string): NTDRecord | null {
  return lsGet<NTDRecord>(NTD_KEYS.record(id))
}

export function saveNTDRecord(record: NTDRecord): void {
  lsSet(NTD_KEYS.record(record.id), record)
  const all = getAllNTDRecords()
  const idx = all.findIndex((r) => r.id === record.id)
  if (idx >= 0) all[idx] = record
  else all.push(record)
  lsSet(NTD_KEYS.records(), all)
}

export function advanceNTDStage(id: string, toStage: NTDStage, actor: string, actorRole: NTDRole): void {
  const record = getNTDRecord(id)
  if (!record) return
  saveNTDRecord({ ...record, current_stage: toStage })
  appendActivity(id, actor, actorRole, toStage, "stage_advanced", `Advanced to Stage ${toStage}`)
}

// ─── Stage Data Getters & Setters ─────────────────────────────

export const getNTDInitiation  = (id: string) => lsGet<NTDInitiationData>(NTD_KEYS.initiation(id))
export const setNTDInitiation  = (id: string, d: NTDInitiationData) => lsSet(NTD_KEYS.initiation(id), d)

export const getNTDSpec        = (id: string) => lsGet<NTDSpecData>(NTD_KEYS.spec(id))
export const setNTDSpec        = (id: string, d: NTDSpecData) => lsSet(NTD_KEYS.spec(id), d)

export const getNTDRFQ         = (id: string) => lsGet<NTDRFQData>(NTD_KEYS.rfq(id))
export const setNTDRFQ         = (id: string, d: NTDRFQData) => lsSet(NTD_KEYS.rfq(id), d)

export const getNTDQuotation   = (id: string) => lsGet<NTDQuotationData>(NTD_KEYS.quotation(id))
export const setNTDQuotation   = (id: string, d: NTDQuotationData) => lsSet(NTD_KEYS.quotation(id), d)

export const getNTDSelection   = (id: string) => lsGet<NTDSelectionData>(NTD_KEYS.selection(id))
export const setNTDSelection   = (id: string, d: NTDSelectionData) => lsSet(NTD_KEYS.selection(id), d)

export const getNTDHandoff     = (id: string) => lsGet<NTDHandoffData>(NTD_KEYS.handoff(id))
export const setNTDHandoff     = (id: string, d: NTDHandoffData) => lsSet(NTD_KEYS.handoff(id), d)

export const getNTDDFM         = (id: string) => lsGet<NTDDFMData>(NTD_KEYS.dfm(id))
export const setNTDDFM         = (id: string, d: NTDDFMData) => lsSet(NTD_KEYS.dfm(id), d)

export const getNTDMould       = (id: string) => lsGet<NTDMouldData>(NTD_KEYS.mould(id))
export const setNTDMould       = (id: string, d: NTDMouldData) => lsSet(NTD_KEYS.mould(id), d)

export const getNTDMfg         = (id: string) => lsGet<NTDMfgData>(NTD_KEYS.mfg(id))
export const setNTDMfg         = (id: string, d: NTDMfgData) => lsSet(NTD_KEYS.mfg(id), d)

export const getNTDTrials      = (id: string) => lsGet<NTDTrialsData>(NTD_KEYS.trials(id))
export const setNTDTrials      = (id: string, d: NTDTrialsData) => lsSet(NTD_KEYS.trials(id), d)

export const getNTDRedesign    = (id: string) => lsGet<NTDRedesignData>(NTD_KEYS.redesign(id))
export const setNTDRedesign    = (id: string, d: NTDRedesignData) => lsSet(NTD_KEYS.redesign(id), d)

export const getNTDStage11     = (id: string) => lsGet<NTDStage11Data>(NTD_KEYS.stage11(id))
export const setNTDStage11     = (id: string, d: NTDStage11Data) => lsSet(NTD_KEYS.stage11(id), d)

// ─── Stage Gate Logic ─────────────────────────────────────────

export function isNTDStageUnlocked(id: string, stage: NTDStage): boolean {
  switch (stage) {
    case 1:
      return true

    case 2: {
      const init = getNTDInitiation(id)
      return !!init?.submitted_at
    }

    case 3: {
      const spec = getNTDSpec(id)
      return !!(spec?.sourcing_signed && spec?.rnd_signed)
    }

    case 4: {
      const rfq = getNTDRFQ(id)
      if (!rfq) return false
      return Object.values(rfq.vendors).some((v) => v.sent)
    }

    case 5: {
      const q = getNTDQuotation(id)
      if (!q) return false
      return Object.values(q).some((v) => v.status === "finalized")
    }

    case 6: {
      const sel = getNTDSelection(id)
      return !!(sel?.sourcing_approved && sel?.rnd_acknowledged)
    }

    case 7: {
      const handoff = getNTDHandoff(id)
      return !!(handoff?.supplier_acknowledged)
    }

    case 8: {
      const dfm = getNTDDFM(id)
      return dfm?.stage_complete === true
    }

    case 9: {
      const mould = getNTDMould(id)
      return !!(mould?.stage_complete && mould?.joint_review?.approved)
    }

    case 10: {
      const mfg = getNTDMfg(id)
      return mfg?.status === "complete"
    }

    case 11: {
      const trials = getNTDTrials(id)
      return trials?.stage_complete === true
    }

    default:
      return false
  }
}

export function getCurrentNTDStage(id: string): NTDStage {
  return getNTDRecord(id)?.current_stage ?? 1
}

// ─── Stage 8 Sub-Stage ────────────────────────────────────────

export function getMouldSubStage(id: string): "8A" | "8B" {
  const mould = getNTDMould(id)
  if (!mould) return "8A"
  const allApproved = mould.components.every((c) => c.final_status === "approved")
  if (!allApproved) return "8A"
  return "8B"
}

// ─── DFM Progress ─────────────────────────────────────────────

export function getDFMProgress(id: string): { approved: number; total: number } {
  const dfm = getNTDDFM(id)
  if (!dfm) return { approved: 0, total: 0 }
  return {
    approved: dfm.components.filter((c) => c.final_status === "approved").length,
    total: dfm.components.length,
  }
}

export function getDFMComponentsForSupplier(id: string) {
  const dfm = getNTDDFM(id)
  if (!dfm) return []
  // Supplier sees ONLY non-approved components
  return dfm.components.filter((c) => c.final_status !== "approved")
}

// ─── Mould Progress ───────────────────────────────────────────

export function getMouldProgress(id: string): { approved: number; total: number } {
  const mould = getNTDMould(id)
  if (!mould) return { approved: 0, total: 0 }
  return {
    approved: mould.components.filter((c) => c.final_status === "approved").length,
    total: mould.components.length,
  }
}

export function getSLAStatus(slaDeadline: string): "ok" | "warning" | "overdue" {
  const diff = new Date(slaDeadline).getTime() - Date.now()
  if (diff < 0) return "overdue"
  if (diff < 4 * 60 * 60 * 1000) return "warning"
  return "ok"
}

export function getSLADeadline(submittedAt: string): string {
  return new Date(new Date(submittedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
}

// ─── Trials ───────────────────────────────────────────────────

export function getTrialProgress(id: string): { passed: number; total: number } {
  const trials = getNTDTrials(id)
  const record = getNTDRecord(id)
  if (!trials || !record) return { passed: 0, total: 0 }

  const passedIds = new Set<string>()
  for (const trial of trials.trials) {
    for (const comp of trial.components) {
      if (comp.overall_verdict === "pass") passedIds.add(comp.componentId)
    }
  }
  return { passed: passedIds.size, total: record.component_count ?? 0 }
}

export function getFailedComponentsFromTrial(id: string, trialNo: number): string[] {
  const trials = getNTDTrials(id)
  if (!trials) return []
  const trial = trials.trials.find((t) => t.trial_no === trialNo)
  if (!trial) return []
  return trial.components.filter((c) => c.overall_verdict === "fail").map((c) => c.componentId)
}

export function getNextTrialNo(id: string): number {
  const trials = getNTDTrials(id)
  if (!trials || trials.trials.length === 0) return 1
  return Math.max(...trials.trials.map((t) => t.trial_no)) + 1
}

export function canInitiateNewTrial(id: string): boolean {
  const trials = getNTDTrials(id)
  if (!trials || trials.trials.length === 0) return true

  const lastTrial = trials.trials[trials.trials.length - 1]
  if (lastTrial.result !== "partial_fail") return false

  // Check all failed components have completed Stage 8A redesign loop
  const redesign = getNTDRedesign(id)
  if (!redesign) return false

  const latestRound = redesign.redesign_rounds[redesign.redesign_rounds.length - 1]
  if (!latestRound) return false

  return !!latestRound.resolved_at
}

// ─── Stage 11 Sub-step Progress ───────────────────────────────

export function getStage11CurrentSubstep(id: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const s11 = getNTDStage11(id)
  if (!s11) return 1
  if (!s11.inspection) return 1
  if (!s11.commissioning) return 2
  if (!s11.shipment) return 3
  if (!s11.exim?.cleared) return 4
  if (!s11.arrival) return 5
  return 6
}

// ─── Completion ───────────────────────────────────────────────

export function isNTDComplete(id: string): boolean {
  return getNTDStage11(id)?.final_approval?.ntd_complete === true
}

// ─── Vendor Token Lookup ──────────────────────────────────────

export function getVendorByToken(ntdId: string, token: string) {
  const rfq = getNTDRFQ(ntdId)
  if (!rfq) return null
  const entry = Object.entries(rfq.vendors).find(([, v]) => v.token === token)
  if (!entry) return null
  return { vendorId: entry[0], ...entry[1] }
}
