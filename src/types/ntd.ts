// ============================================================
// types/ntd.ts
// NTD — New Tool Development | Amber Enterprises NPD Platform
// ============================================================

// ─── Base ────────────────────────────────────────────────────

export type NTDComponent = {
  componentId: string   // "C01", "C02" ... "C30"
  name: string          // "Core Insert 1"
}

export type ReviewVerdict = "approved" | "rejected" | "pending"
export type ComponentFinalStatus = "pending" | "under_review" | "revision_required" | "approved"
export type TestVerdict = "pass" | "fail"

// ─── Stage 1 — Tool Initiation ───────────────────────────────

export type NTDInitiationData = {
  brief_doc: string
  master_3d: string
  components: NTDComponent[]   // IMMUTABLE after Stage 1 submit
  submitted_at: string
  status: "pending" | "approved"
}

// ─── Stage 2 — Spec Sheet & Comparison ──────────────────────

export type NTDSpecComparison = {
  vendorId: string
  vendor_name: string
  spec_doc: string
  notes: string
}

export type NTDSpecData = {
  spec_sheet: string
  comparisons: NTDSpecComparison[]
  sourcing_approved: boolean
  sourcing_approved_by: string
  sourcing_approved_at: string
  rnd_approved: boolean
  rnd_approved_by: string
  rnd_approved_at: string
}

// ─── Stage 3 — RFQ Dispatch ──────────────────────────────────

export type NTDRFQVendorEntry = {
  vendor_name: string
  sent: boolean
  sent_at: string
  nda_required: boolean
  nda_signed: boolean
  rfq_doc: string
}

export type NTDRFQData = {
  [vendorId: string]: NTDRFQVendorEntry
}

// ─── Stage 4 — Quotation Review & Negotiations ───────────────

export type NTDNegotiationRound = {
  round_no: number
  notes: string
  counter_offer: number
  date: string
}

export type NTDQuotationVendorEntry = {
  quote_doc: string
  quoted_amount: number
  currency: string
  rounds: NTDNegotiationRound[]
  status: "under_review" | "negotiating" | "finalized"
}

export type NTDQuotationData = {
  [vendorId: string]: NTDQuotationVendorEntry
}

// ─── Stage 5 — Supplier Finalization ─────────────────────────

export type NTDFinalVendorData = {
  vendor_id: string
  vendor_name: string
  sourcing_approved: boolean
  sourcing_approved_by: string
  sourcing_approved_at: string
  rnd_acknowledged: boolean
  rnd_acknowledged_by: string
  rnd_acknowledged_at: string
}

// ─── Stage 6 — R&D Final Data Submission ─────────────────────

export type NTDFinalDataComponent = {
  componentId: string
  ppt: string
  data_3d: string
  uploaded_at: string
}

export type NTDFinalDataSubmission = {
  components: NTDFinalDataComponent[]
  supplier_acknowledged: boolean
  supplier_acknowledged_at: string
}

// ─── Stage 7 — DFM Per-Component Loop ────────────────────────

export type NTDReviewEntry = {
  verdict: ReviewVerdict
  comments: string
  reviewed_by: string
  reviewed_at: string
}

export type NTDDFMIteration = {
  iteration_no: number
  supplier_submission: {
    ppt: string
    data_3d: string
    submitted_at: string
  }
  rnd_review: NTDReviewEntry
  sourcing_review: NTDReviewEntry
  overall_status: "under_review" | "approved" | "revision_required"
}

export type NTDDFMComponent = {
  componentId: string
  name: string
  iterations: NTDDFMIteration[]
  final_status: ComponentFinalStatus
}

export type NTDDFMData = {
  components: NTDDFMComponent[]
  stage_complete: boolean
}

// ─── Stage 8A — Mould Design + MFA Per-Component Loop ────────

export type NTDMouldReviewEntry = NTDReviewEntry & {
  sla_deadline: string   // submitted_at + 24hrs
}

export type NTDMouldIteration = {
  iteration_no: number
  redesign_round: number
  supplier_submission: {
    mould_design_3d: string
    mfa_ppt: string
    submitted_at: string
  }
  rnd_review: NTDMouldReviewEntry
  sourcing_review: NTDMouldReviewEntry
  overall_status: "under_review" | "approved" | "revision_required"
}

export type NTDMouldComponent = {
  componentId: string
  name: string
  iterations: NTDMouldIteration[]
  final_status: ComponentFinalStatus
  locked: boolean
}

export type NTDMouldDesignData = {
  redesign_round: number          // 0 = initial, 1+ = post-trial rounds
  components: NTDMouldComponent[]
  substage_complete: boolean
}

// ─── Stage 8B — Manufacturing ─────────────────────────────────

export type NTDMfgUpdate = {
  date: string
  note: string
  posted_by: string
}

export type NTDMfgStatusData = {
  mfg_start_date: string
  eta_date: string
  updates: NTDMfgUpdate[]
  status: "in_progress" | "complete"
}

// ─── Stage 8C — Trial Samples & Testing ──────────────────────

export type NTDTestParameter<T extends Record<string, unknown> = Record<string, unknown>> = {
  verdict: TestVerdict
} & T

export type NTDComponentTestResult = {
  componentId: string
  dimensional_accuracy: NTDTestParameter<{ actual_measurement: string; spec_measurement: string }>
  surface_finish: NTDTestParameter<{ ra_value: string; visual_grade: string }>
  material_hardness: NTDTestParameter<{ reading: string; unit: "HRC" | "HB" | "other" }>
  cavity_fill_flash: NTDTestParameter<{ notes: string }>
  ejection_parting_line: NTDTestParameter<{ defect_description: string }>
  tooling_fit_assembly: NTDTestParameter<{ notes: string }>
  cycle_time: NTDTestParameter<{ actual_sec: number; target_sec: number }>
  overall_verdict: TestVerdict
  feedback_notes: string
  requires_redesign: boolean
}

export type NTDTrial = {
  trial_no: number
  initiated_at: string
  samples_received_at: string
  status: "pending" | "samples_received" | "testing" | "complete"
  result: "all_pass" | "partial_fail" | null
  components: NTDComponentTestResult[]
}

export type NTDTrialsData = {
  trials: NTDTrial[]
  stage_complete: boolean
}

// ─── Redesign Round Tracking ──────────────────────────────────

export type NTDRedesignRound = {
  round_no: number
  triggered_by_trial: number
  failed_component_ids: string[]
  re_enters: "8A_MOULD_DESIGN_ONLY"   // DFM (Stage 7) is NEVER revisited
  mould_design_redesign_round: number
  resolved_at: string
}

export type NTDRedesignData = {
  redesign_rounds: NTDRedesignRound[]
}

// ─── Stage 9 — Commissioning & Dispatch ──────────────────────

export type NTDInspectionData = {
  report_doc: string
  submitted_by: string
  submitted_at: string
}

export type NTDCommissioningData = {
  checklist_complete: boolean
  pack_list_doc: string
  invoice_doc: string
}

export type NTDShipmentData = {
  exim_docs: string[]
  mode: "sea" | "air"
  tracking_id: string
  dispatched_at: string
}

export type NTDArrivalData = {
  arrived_at: string
  plant: "Gurugram"
  rnd_head_approved: boolean
  rnd_head_approved_by: string
  rnd_head_approved_at: string
  sourcing_head_approved: boolean
  sourcing_head_approved_by: string
  sourcing_head_approved_at: string
  ntd_complete: boolean
}

// ─── Master NTD Record ────────────────────────────────────────

export type NTDRecord = {
  id: string
  typeOfWork: "NTD"
  title: string
  created_by: string
  created_at: string
  current_stage: NTDStage
  supplier?: string              // set at Stage 5
  component_count: number        // set at Stage 1, immutable
  spoc?: string                  // optional SPOC name (e.g. "Rohan Desai")
}

export type NTDStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
