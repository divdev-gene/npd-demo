// ============================================================
// lib/ntd.ts
// NTD localStorage helpers | Amber Enterprises NPD Platform
// ============================================================

import type {
  NTDRecord,
  NTDStage,
  NTDInitiationData,
  NTDSpecData,
  NTDRFQData,
  NTDQuotationData,
  NTDFinalVendorData,
  NTDFinalDataSubmission,
  NTDDFMData,
  NTDMouldDesignData,
  NTDMfgStatusData,
  NTDTrialsData,
  NTDRedesignData,
  NTDInspectionData,
  NTDCommissioningData,
  NTDShipmentData,
  NTDArrivalData,
} from "@/types/ntd"

// ─── Key Builders ─────────────────────────────────────────────

export const NTD_KEYS = {
  records:       ()          => `ntd_records`,
  record:        (id: string) => `ntd_record_${id}`,
  initiation:    (id: string) => `ntd_initiation_${id}`,
  spec:          (id: string) => `ntd_spec_${id}`,
  rfq:           (id: string) => `ntd_rfq_${id}`,
  quotation:     (id: string) => `ntd_quotation_${id}`,
  finalVendor:   (id: string) => `ntd_final_vendor_${id}`,
  finalData:     (id: string) => `ntd_final_data_${id}`,
  dfm:           (id: string) => `ntd_dfm_${id}`,
  mouldDesign:   (id: string) => `ntd_mould_design_${id}`,
  mfgStatus:     (id: string) => `ntd_mfg_status_${id}`,
  trials:        (id: string) => `ntd_trials_${id}`,
  redesign:      (id: string) => `ntd_redesign_${id}`,
  inspection:    (id: string) => `ntd_inspection_${id}`,
  commissioning: (id: string) => `ntd_commissioning_${id}`,
  shipment:      (id: string) => `ntd_shipment_${id}`,
  arrival:       (id: string) => `ntd_arrival_${id}`,
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

// ─── NTD Record List ──────────────────────────────────────────

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

export function updateNTDStage(id: string, stage: NTDStage): void {
  const record = getNTDRecord(id)
  if (!record) return
  saveNTDRecord({ ...record, current_stage: stage })
}

// ─── Stage Data Getters & Setters ─────────────────────────────

export const getNTDInitiation    = (id: string) => lsGet<NTDInitiationData>(NTD_KEYS.initiation(id))
export const setNTDInitiation    = (id: string, data: NTDInitiationData) => lsSet(NTD_KEYS.initiation(id), data)

export const getNTDSpec          = (id: string) => lsGet<NTDSpecData>(NTD_KEYS.spec(id))
export const setNTDSpec          = (id: string, data: NTDSpecData) => lsSet(NTD_KEYS.spec(id), data)

export const getNTDRFQ           = (id: string) => lsGet<NTDRFQData>(NTD_KEYS.rfq(id))
export const setNTDRFQ           = (id: string, data: NTDRFQData) => lsSet(NTD_KEYS.rfq(id), data)

export const getNTDQuotation     = (id: string) => lsGet<NTDQuotationData>(NTD_KEYS.quotation(id))
export const setNTDQuotation     = (id: string, data: NTDQuotationData) => lsSet(NTD_KEYS.quotation(id), data)

export const getNTDFinalVendor   = (id: string) => lsGet<NTDFinalVendorData>(NTD_KEYS.finalVendor(id))
export const setNTDFinalVendor   = (id: string, data: NTDFinalVendorData) => lsSet(NTD_KEYS.finalVendor(id), data)

export const getNTDFinalData     = (id: string) => lsGet<NTDFinalDataSubmission>(NTD_KEYS.finalData(id))
export const setNTDFinalData     = (id: string, data: NTDFinalDataSubmission) => lsSet(NTD_KEYS.finalData(id), data)

export const getNTDDFM           = (id: string) => lsGet<NTDDFMData>(NTD_KEYS.dfm(id))
export const setNTDDFM           = (id: string, data: NTDDFMData) => lsSet(NTD_KEYS.dfm(id), data)

export const getNTDMouldDesign   = (id: string) => lsGet<NTDMouldDesignData>(NTD_KEYS.mouldDesign(id))
export const setNTDMouldDesign   = (id: string, data: NTDMouldDesignData) => lsSet(NTD_KEYS.mouldDesign(id), data)

export const getNTDMfgStatus     = (id: string) => lsGet<NTDMfgStatusData>(NTD_KEYS.mfgStatus(id))
export const setNTDMfgStatus     = (id: string, data: NTDMfgStatusData) => lsSet(NTD_KEYS.mfgStatus(id), data)

export const getNTDTrials        = (id: string) => lsGet<NTDTrialsData>(NTD_KEYS.trials(id))
export const setNTDTrials        = (id: string, data: NTDTrialsData) => lsSet(NTD_KEYS.trials(id), data)

export const getNTDRedesign      = (id: string) => lsGet<NTDRedesignData>(NTD_KEYS.redesign(id))
export const setNTDRedesign      = (id: string, data: NTDRedesignData) => lsSet(NTD_KEYS.redesign(id), data)

export const getNTDInspection    = (id: string) => lsGet<NTDInspectionData>(NTD_KEYS.inspection(id))
export const setNTDInspection    = (id: string, data: NTDInspectionData) => lsSet(NTD_KEYS.inspection(id), data)

export const getNTDCommissioning = (id: string) => lsGet<NTDCommissioningData>(NTD_KEYS.commissioning(id))
export const setNTDCommissioning = (id: string, data: NTDCommissioningData) => lsSet(NTD_KEYS.commissioning(id), data)

export const getNTDShipment      = (id: string) => lsGet<NTDShipmentData>(NTD_KEYS.shipment(id))
export const setNTDShipment      = (id: string, data: NTDShipmentData) => lsSet(NTD_KEYS.shipment(id), data)

export const getNTDArrival       = (id: string) => lsGet<NTDArrivalData>(NTD_KEYS.arrival(id))
export const setNTDArrival       = (id: string, data: NTDArrivalData) => lsSet(NTD_KEYS.arrival(id), data)

// ─── Stage Gate Logic ─────────────────────────────────────────

export function isNTDStageUnlocked(id: string, stage: NTDStage): boolean {
  switch (stage) {
    case 1:
      return true

    case 2: {
      const init = getNTDInitiation(id)
      return init?.status === "approved"
    }

    case 3: {
      const spec = getNTDSpec(id)
      return !!(spec?.sourcing_approved && spec?.rnd_approved)
    }

    case 4: {
      const rfq = getNTDRFQ(id)
      if (!rfq) return false
      return Object.values(rfq).some((v) => v.sent)
    }

    case 5: {
      const quotation = getNTDQuotation(id)
      if (!quotation) return false
      return Object.values(quotation).some((v) => v.status === "finalized")
    }

    case 6: {
      const vendor = getNTDFinalVendor(id)
      return !!(vendor?.sourcing_approved && vendor?.rnd_acknowledged)
    }

    case 7: {
      const finalData = getNTDFinalData(id)
      return !!(finalData?.supplier_acknowledged)
    }

    case 8: {
      const dfm = getNTDDFM(id)
      return dfm?.stage_complete === true
    }

    case 9: {
      const trials = getNTDTrials(id)
      return trials?.stage_complete === true
    }

    default:
      return false
  }
}

export function getCurrentNTDStage(id: string): NTDStage {
  const record = getNTDRecord(id)
  return record?.current_stage ?? 1
}

// ─── Stage 8 Sub-Stage Logic ──────────────────────────────────

export function getNTDSubStage8Status(id: string): "8A" | "8B" | "8C" {
  const mould = getNTDMouldDesign(id)
  if (!mould?.substage_complete) return "8A"

  const mfg = getNTDMfgStatus(id)
  if (mfg?.status !== "complete") return "8B"

  return "8C"
}

// ─── DFM Helpers ──────────────────────────────────────────────

export function getDFMProgress(id: string): { approved: number; total: number } {
  const dfm = getNTDDFM(id)
  if (!dfm) return { approved: 0, total: 0 }
  const approved = dfm.components.filter((c) => c.final_status === "approved").length
  return { approved, total: dfm.components.length }
}

export function getDFMComponentsForSupplier(id: string) {
  const dfm = getNTDDFM(id)
  if (!dfm) return []
  return dfm.components.filter(
    (c) => c.final_status === "pending" || c.final_status === "revision_required"
  )
}

// ─── Mould Design Helpers ─────────────────────────────────────

export function getMouldDesignProgress(id: string): { approved: number; total: number } {
  const mould = getNTDMouldDesign(id)
  if (!mould) return { approved: 0, total: 0 }
  const approved = mould.components.filter((c) => c.final_status === "approved").length
  return { approved, total: mould.components.length }
}

export function getSLAStatus(slaDeadline: string): "ok" | "warning" | "overdue" {
  const now = Date.now()
  const deadline = new Date(slaDeadline).getTime()
  const diff = deadline - now
  if (diff < 0) return "overdue"
  if (diff < 4 * 60 * 60 * 1000) return "warning"
  return "ok"
}

// ─── Trial Helpers ────────────────────────────────────────────

export function getTrialProgress(id: string): { passed: number; total: number } {
  const trials = getNTDTrials(id)
  if (!trials || trials.trials.length === 0) return { passed: 0, total: 0 }

  const allTrials = trials.trials
  const record = getNTDRecord(id)
  const total = record?.component_count ?? 0

  const passedIds = new Set<string>()
  for (const trial of allTrials) {
    for (const comp of trial.components) {
      if (comp.overall_verdict === "pass") passedIds.add(comp.componentId)
    }
  }

  return { passed: passedIds.size, total }
}

export function getFailedComponentIdsFromTrial(id: string, trialNo: number): string[] {
  const trials = getNTDTrials(id)
  if (!trials) return []
  const trial = trials.trials.find((t) => t.trial_no === trialNo)
  if (!trial) return []
  return trial.components
    .filter((c) => c.overall_verdict === "fail")
    .map((c) => c.componentId)
}

export function getNextTrialNo(id: string): number {
  const trials = getNTDTrials(id)
  if (!trials || trials.trials.length === 0) return 1
  return Math.max(...trials.trials.map((t) => t.trial_no)) + 1
}

// ─── Stage 9 Completion Check ─────────────────────────────────

export function isNTDComplete(id: string): boolean {
  const arrival = getNTDArrival(id)
  return arrival?.ntd_complete === true
}

// ─── ID Generator ─────────────────────────────────────────────

export function generateNTDId(): string {
  return `NTD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}
