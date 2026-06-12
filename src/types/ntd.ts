// ============================================================
// types/ntd.ts
// NTD — New Tool Development v2 | Amber Enterprises NPD Platform
// ============================================================

// ─── Commodity ────────────────────────────────────────────────
export const NTD_COMMODITIES = ["Sheet Metal", "Plastics", "EPS"] as const
export type NTDCommodity = typeof NTD_COMMODITIES[number]

// ─── Roles ───────────────────────────────────────────────────

export type NTDRole =
  | "rnd"
  | "sourcing"
  | "rnd_head"
  | "sourcing_head"
  | "exim"
  | "super_admin"
  | "supplier"
  | "vendor"

// ─── Versioned File ───────────────────────────────────────────
// Used everywhere a file/link is stored. Old versions NEVER deleted.

export type FileVersion = {
  version_no: number
  link: string                        // Drive / SharePoint URL
  uploaded_by: string
  uploaded_at: string
  upload_note?: string
  triggered_by_comment_id?: string    // which comment caused this revision
}

export type FileComment = {
  comment_id: string
  author: string
  author_role: NTDRole
  text: string
  created_at: string
  requires_revision: boolean          // true = blocks approval
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
}

export type VersionedFile = {
  file_id: string                     // uuid, unique per logical file slot
  slot_name: string                   // display label e.g. "Core Insert 3D"
  versions: FileVersion[]
  current_version: number
  comments: FileComment[]
  approved: boolean
  approved_by?: string
  approved_at?: string
}

// ─── Activity Log ─────────────────────────────────────────────
// Append-only. NEVER modify or delete entries.

export type NTDActionType =
  | "ntd_created"
  | "stage_advanced"
  | "file_uploaded"
  | "file_revised"
  | "comment_added"
  | "comment_resolved"
  | "file_approved"
  | "file_rejected"
  | "component_approved"
  | "component_rejected"
  | "stage_complete"
  | "supplier_submitted"
  | "query_posted"
  | "quotation_submitted"
  | "negotiation_round"
  | "supplier_selected"
  | "supplier_acknowledged"
  | "po_raised"
  | "samples_received"
  | "samples_dispatched"
  | "trial_initiated"
  | "trial_result"
  | "redesign_triggered"
  | "manufacturing_update"
  | "manufacturing_complete"
  | "shipment_update"
  | "exim_update"
  | "dual_signed"
  | "ntd_complete"

export type ActivityEntry = {
  id: string
  timestamp: string
  actor: string
  actor_role: NTDRole
  stage: number
  substage?: "8A" | "8B"
  action_type: NTDActionType
  description: string
  payload?: {
    file_id?: string
    file_name?: string
    version_no?: number
    component_id?: string
    iteration_no?: number
    verdict?: string
    comment_id?: string
    trial_no?: number
    vendor_id?: string
    round_no?: number
  }
}

export type NTDActivityLog = {
  entries: ActivityEntry[]
}

// ─── Component ────────────────────────────────────────────────
// Defined in Stage 6. IMMUTABLE after Stage 6 submit.

export type NTDComponent = {
  componentId: string    // "C01", "C02"...
  name: string
  commodity: NTDCommodity
}

// ─── Master NTD Record ────────────────────────────────────────

export type NTDRecord = {
  id: string
  typeOfWork: "NTD"
  title: string
  spoc: "Rohan Desai"
  created_by: string
  created_at: string
  current_stage: NTDStage
  supplier?: string           // set at Stage 5
  selectedSuppliers?: Record<string, string>   // commodity → vendor_name, set at Stage 5
  component_count?: number    // set at Stage 6
  status: "active" | "complete"
}

export type NTDStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

// ─── Stage 1 — Tool Initiation ────────────────────────────────

export type NTDInitiationData = {
  title: string
  spoc: "Rohan Desai"
  notes: string
  components: NTDComponent[]          // captured at creation; commodity-tagged
  part_specs: VersionedFile[]
  tech_spec_sheet?: {                  // flat (not VersionedFile) — creation-time doc, no revision history needed
    file_name: string
    link: string                       // Drive/SharePoint URL or base64 data URL
    uploaded_at: string
    uploaded_by: string
  }
  submitted_by: string
  submitted_at: string
}

// ─── Stage 2 — RFQ Spec Sheet ─────────────────────────────────

export type NTDSpecComparison = {
  row_id: string
  vendor_name: string
  spec_doc_link: string
  notes: string
}

export type NTDStage2Query = {
  query_id: string
  text: string
  raised_by: string
  raised_at: string
  resolved: boolean
  response?: string
  resolved_by?: string
  resolved_at?: string
}

export type NTDSpecData = {
  spec_sheet: VersionedFile
  comparisons: NTDSpecComparison[]
  queries: NTDStage2Query[]
  sourcing_signed: boolean
  sourcing_signed_by: string
  sourcing_signed_at: string
}

// ─── Stage 3 — RFQ Dispatch ───────────────────────────────────

export type NTDRFQVendor = {
  vendor_name: string
  is_catalog: boolean
  token: string               // 8-char random, generated once, never changes
  nda_required: boolean
  nda_signed: boolean
  sent: boolean
  sent_at: string
  sent_by: string
  commodity: NTDCommodity              // which commodity pool this vendor belongs to
}

export type NTDRFQData = {
  vendors: {
    [vendorId: string]: NTDRFQVendor
  }
}

// ─── Stage 4 — Quotation & Negotiations ───────────────────────

export type RFQMessage = {
  message_id: string
  author_name: string
  author_type: "vendor" | "internal"
  text: string
  counter_offer?: number
  created_at: string
}

export type VendorQuotation = {
  amount: number
  currency: string
  lead_time_days: number
  doc_link: string
  notes: string
  submitted_at: string
  last_updated_at: string
}

export type NTDQuotationData = {
  [vendorId: string]: {
    quotation?: VendorQuotation
    thread: RFQMessage[]
    status: "sent" | "quotation_received" | "negotiating" | "finalized"
  }
}

// ─── Stage 5 — Supplier Selection ─────────────────────────────

export type NTDCommoditySelection = {
  vendor_id: string
  vendor_name: string
}

export type NTDSelectionData = {
  selections: Record<string, NTDCommoditySelection>   // key = commodity
  sourcing_approved: boolean
  sourcing_approved_by: string
  sourcing_approved_at: string
  rnd_acknowledged: boolean
  rnd_acknowledged_by: string
  rnd_acknowledged_at: string
}

// ─── Stage 6 — Final Design Handoff ───────────────────────────

export type NTDHandoffData = {
  components: NTDComponent[]           // IMMUTABLE after submit
  component_count: number
  final_designs: VersionedFile[]
  submitted_by: string
  submitted_at: string
  supplier_acknowledged: boolean
  supplier_acknowledged_at: string
  supplier_acknowledged_by_commodity?: Record<string, boolean>  // commodity → acked
}

// ─── Stage 7 — DFM Loop ───────────────────────────────────────

export type NTDDFMComponent = {
  componentId: string
  name: string
  ppt: VersionedFile
  design_3d: VersionedFile
  rnd_docs: VersionedFile[]          // R&D feedback / reference docs shared back to supplier
  iteration_no: number
  final_status: "pending" | "under_review" | "revision_required" | "approved"
  approved_by?: string
  approved_at?: string
}

export type NTDDFMData = {
  components: NTDDFMComponent[]
  po_activity: {
    raised: boolean
    po_number: string
    raised_by: string
    raised_at: string
  }
  stage_complete: boolean
}

// ─── Stage 8 — Mould Design + MFA ────────────────────────────

export type MouldReview = {
  verdict: "approved" | "rejected" | "pending"
  comments: string
  reviewed_by: string
  reviewed_at: string
  sla_deadline: string         // submitted_at + 24hrs
}

export type NTDMouldComponent = {
  componentId: string
  name: string
  mould_3d: VersionedFile
  mfa_ppt: VersionedFile
  rnd_review: MouldReview
  sourcing_review: MouldReview
  iteration_no: number
  final_status: "pending" | "under_review" | "revision_required" | "approved"
  locked: boolean
}

export type NTDJointReview = {
  feedback: string
  feedback_by: string
  feedback_at: string
  supplier_deadline: string    // feedback_at + 24hrs
  supplier_files: VersionedFile[]
  supplier_uploaded_at: string
  approved: boolean
  approved_by: string
  approved_at: string
}

export type NTDMouldData = {
  redesign_round: number       // 0 = initial, 1+ = post-trial
  components: NTDMouldComponent[]
  joint_review: NTDJointReview | null
  stage_complete: boolean
}

// ─── Stage 9 — Manufacturing ──────────────────────────────────

export type MfgUpdate = {
  update_id: string
  date: string
  note: string
  doc_link?: string
  posted_by: string
  posted_by_role: string
}

export type NTDMfgData = {
  mfg_start_date: string
  eta_date: string
  updates: MfgUpdate[]
  status: "not_started" | "in_progress" | "complete"
  completed_by: string
  completed_at: string
}

// ─── Stage 10 — Trials ────────────────────────────────────────

export type TestResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  verdict: "pass" | "fail"
} & T

export type ComponentTestResult = {
  componentId: string
  dimensional_accuracy:   TestResult<{ actual: string; spec: string }>
  surface_finish:         TestResult<{ ra_value: string; visual_grade: string }>
  material_hardness:      TestResult<{ reading: string; unit: "HRC" | "HB" | "other" }>
  cavity_fill_flash:      TestResult<{ notes: string }>
  ejection_parting_line:  TestResult<{ defect_desc: string }>
  tooling_fit_assembly:   TestResult<{ notes: string }>
  cycle_time:             TestResult<{ actual_sec: number; target_sec: number }>
  overall_verdict:        "pass" | "fail"
  feedback_ppt_link:      string          // required if fail
  requires_redesign:      boolean
}

export type NTDTrial = {
  trial_no: number
  initiated_at: string
  initiated_by: string
  samples_dispatched_at: string
  samples_received_at: string
  status: "pending" | "samples_dispatched" | "samples_received" | "testing" | "complete"
  result: "all_pass" | "partial_fail" | null
  components: ComponentTestResult[]
}

export type NTDTrialsData = {
  trials: NTDTrial[]
  stage_complete: boolean
}

export type NTDRedesignRound = {
  round_no: number
  triggered_by_trial: number
  failed_component_ids: string[]
  re_enters: "STAGE_8A_MOULD_DESIGN_ONLY"
  mould_redesign_round_ref: number
  resolved_at: string
}

export type NTDRedesignData = {
  redesign_rounds: NTDRedesignRound[]
}

// ─── Stage 11 — Commissioning & Dispatch ─────────────────────

export type EximUpdate = {
  update_id: string
  status_label: string
  note: string
  doc?: VersionedFile
  updated_by: string
  updated_at: string
}

export type NTDStage11Data = {
  inspection: Record<string, {          // key = commodity
    report: VersionedFile
    submitted_by: string
    submitted_at: string
  }> | null
  commissioning: {
    checklist_items: { label: string; checked: boolean }[]
    pack_list: VersionedFile
    invoice: VersionedFile
    completed_by: string
    completed_at: string
  } | null
  shipment: {
    exim_docs: VersionedFile[]
    mode: "sea" | "air"
    tracking_id: string
    dispatched_at: string
    dispatched_by: string
  } | null
  exim: {
    updates: EximUpdate[]
    cleared: boolean
    cleared_at: string
  } | null
  arrival: {
    arrived_at: string
    confirmed_by: string
  } | null
  final_approval: {
    rnd_head_approved: boolean
    rnd_head_by: string
    rnd_head_at: string
    sourcing_head_approved: boolean
    sourcing_head_by: string
    sourcing_head_at: string
    ntd_complete: boolean
  } | null
}
