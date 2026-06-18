# Database Schema Reference — NPD / NCD / ECN / NTD / AS

> Amber Enterprises NPD Platform — Entity & Relationship Reference for DB Schema Design

---

## 1. Work Types (Top-Level)

| Type | Code | Stages | Description |
|------|------|--------|-------------|
| New Product Development | `NPD` | 9 | Full product lifecycle. Can be a **Bundle** parent containing NCD child items. |
| New Component Development | `NCD` | 9 | Standalone component or child of an NPD Bundle. |
| Engineering Change Notice | `ECN` | 8 | Change to an existing component. Abbreviated flow. |
| New Tool Development | `NTD` | 11 | New tooling / die / fixture. Separate detailed workflow. |
| Alternative Supplier | `AS` | 8 | Qualify an alternative vendor for an existing component. |
| PP (Pre-Production) Repeat | `PP` | 9 | Repeat run using existing tooling. Reuses NPD stage machine. |
| Compliance / Regulatory | `CR` | 6 | Certification, regulatory approval workflow. |

---

## 2. Core Entity: `npd_record`

Central record that stores all fields common to NPD, NCD, ECN, and AS. Each "type of work" uses a subset of these fields.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (PK) | Auto-generated: `NPD-FY-2026-0001`, `ECN-FY-2026-0001`, `AS-FY-2026-0001` |
| `type_of_work` | `enum: NCD | NPD | ECN | NTD | ALT_SUPPLIER | COMPLIANCE | PP_REPEAT` | Determines workflow |
| `status` | `enum: active | complete` | NTD only |
| `title` / `item_name` | `string` | Display name |
| `item_category` | `string` | Commodity/category |
| `product_line` | `string` | Product line |
| `r_and_d_division` | `string` | Location |
| `division` | `string?` | Division display name (denormalized) |
| `stage` | `int` | Current workflow stage number (1-based) |
| `stage_name` | `string` | Denormalized stage label |
| `tat_health` | `enum: green | amber | red | black` | TAT status indicator |
| `tat_days_remaining` | `int` | Days remaining in TAT |
| `total_tat` | `int` | Total TAT in days |
| `spoc` | `string` | Sourcing SPOC name |
| `supplier` | `string` | Assigned supplier name |
| `priority` | `string` | Normal / High / Critical |
| `grade_a` | `boolean` | Priority flag |
| `tqr_score` | `json?` | TQR composite score `{t, q, r, composite}` |
| `cost` | `decimal?` | Final cost |
| `raised_by` | `string` | Creator role/user |
| `drive_link` | `string?` | Google Drive folder link |
| `sample_qty` | `int?` | Desired sample quantity |
| `created_at` | `datetime` | Timestamp |
| `manufacturing_location` | `string?` | Plant location |
| `remarks` | `text?` | Free text |
| `tat_development` | `int?` | Development phase TAT |
| `tat_production` | `int?` | Production phase TAT |
| `existing_part_number` | `string?` | For NCD/ECN referencing existing part |
| `ecn_part_number` | `string?` | ECN-specific |
| `ecn_part_name` | `string?` | ECN-specific |
| `ecn_change_description` | `text?` | ECN-specific |
| `revision_number` | `string?` | Revision tracking |
| `cpl_sheet_link` | `string?` | CPL sheet link |
| `component_count` | `int?` | NTD only — set at Stage 6 |
| `selected_suppliers` | `json?` | NTD only — `{commodity: vendor_name}` |
| `is_bundle` | `boolean` | NPD only — parent bundle flag |
| `parent_id` | `string?` (FK → `npd_record.id`) | NCD child to NPD bundle parent |
| `bundle_item_name` | `string?` | Per-item name within a bundle |

---

## 3. Stage Machines

### 3a. NPD / NCD Stages

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Request Initialisation | Enquiry sent to vendors, quotes received |
| 2 | Supplier Sourcing and Confirm | Supplier selection, NDA, feasibility |
| 3 | Supplier Dispatch | Supplier dispatches samples |
| 4 | Design and Feasibility | Part assignment, plant evaluation |
| 5 | RND Testing & TQR | Physical testing, TQR scoring |
| 6 | DQA Testing | Supplier docs, dimensional QC |
| 7 | RND Approval | Final approval by R&D |
| 8 | PP Pricing | Production pricing negotiation |
| 9 | NPD Summary & Closure | Final sign-off |

### 3b. ECN Stages

| Stage | Name | Description |
|-------|------|-------------|
| 1 | ECN Request Initialisation | Change request submission |
| 2 | Sourcing Review & RFQ | R&D approval, RFQ dispatch |
| 3 | Supplier Sample Dispatch | Supplier quote, dispatch |
| 4 | R&D Testing | Price estimation, testing |
| 5 | DQA Testing | Dimensional & quality tests |
| 6 | R&D Head Approval | Head approval |
| 7 | Plant Evaluation & Testing | Plant-level evaluation |
| 8 | ECN Summary & Closure | Final closure |

### 3c. Alternative Supplier (AS) Stages

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Sourcing Request Initiation | Reason, supplier proposal |
| 2 | R&D Review & Approval | R&D reviews justification |
| 3 | Supplier Sample Dispatch | Quote, negotiation, dispatch |
| 4 | R&D Testing | Physical testing |
| 5 | DQA Testing | Dimensional QC |
| 6 | R&D Head Approval | Head-level verdict |
| 7 | Plant Evaluation & Testing | Plant-level evaluation |
| 8 | AS Summary & Closure | Final closure |

### 3d. NTD Stages (separate system)

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Initiation | Tool creation, component data, spec sheets |
| 2 | Spec & Sign-off | Component review, sourcing extras, queries |
| 3 | RFQ Dispatch | Vendor pool, RFQ links |
| 4 | Quotation Review | Vendor quotes, component pricing, negotiation |
| 5 | Supplier Selection | Per-commodity vendor selection, R&D ack |
| 6 | Design Handoff | Final designs, supplier acknowledgement |
| 7 | DFM | DFM review loop (ppt, 3D design) |
| 8 | Mould Design | Mould 3D, MFA PPT, joint review |
| 9 | Manufacturing | Per-commodity mfg tracking, phases |
| 10 | Trials | Sample testing, trial results, redesign |
| 11 | Commissioning | Inspection, shipment, EXIM, arrival, final sign-off |

### 3e. Compliance / Regulatory Stages

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Initiation | Initial request creation |
| 2 | Evaluation | Requirement evaluation |
| 3 | Lab Assignment | Assign testing lab |
| 4 | Document Submission | Submit compliance docs |
| 5 | Certification Verification | Verify certification |
| 6 | Closure | Final closure |

### 3f. PP (Pre-Production) Repeat

Reuses the NPD stage machine (9 stages) as defined in Section 3a. No separate stage progression logic.

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Initiation | Tool creation, component data, spec sheets |
| 2 | Spec & Sign-off | Component review, sourcing extras, queries |
| 3 | RFQ Dispatch | Vendor pool, RFQ links |
| 4 | Quotation Review | Vendor quotes, component pricing, negotiation |
| 5 | Supplier Selection | Per-commodity vendor selection, R&D ack |
| 6 | Design Handoff | Final designs, supplier acknowledgement |
| 7 | DFM | DFM review loop (ppt, 3D design) |
| 8 | Mould Design | Mould 3D, MFA PPT, joint review |
| 9 | Manufacturing | Per-commodity mfg tracking, phases |
| 10 | Trials | Sample testing, trial results, redesign |
| 11 | Commissioning | Inspection, shipment, EXIM, arrival, final sign-off |

---

## 4. Stage Data Entities (per-type)

### 4a. NPD / NCD Stage Data (stored in localStorage, keyed by NPD ID)

Each stage stores its own JSON blob. Keys are documented in `mockData.ts`.

| localStorage Key | Stage | Data Stored |
|-----------------|-------|-------------|
| `enquiry_sent_vendors_v1` | 1 | `string[]` of vendor names who received enquiry |
| `live_quotations_v1` | 1 | `Record<npdId, Record<vendorName, LiveQuotation>>` — full quote forms |
| `sourcing_approval_v1` | 2 | `{vendorName, approvedBy, approvedAt}` |
| `nda_status_v1` | 2 | `Record<npdId, Record<vendorName, {signed, fileLink}>>` |
| `vendor_status_v1` | 2 | Feasibility confirmations with deadline negotiation |
| `supplier_dispatch_submitted_v1` | 3 | Supplier dispatch date, tracking |
| `delivery_acceptance_v1` | 3 | Sample receipt confirmation |
| `part_assignment_v1` | 4 | Part number assignment |
| `plant_supplier_response_v1` | 4 | Plant evaluation of supplier samples |
| `plant_acceptance_v1` | 4 | Plant acceptance/rejection verdict |
| `rejected_parts_v1` | 4 | Rejected parts log |
| `rnd_eval_results_v1` | 5 | R&D test results, TQR |
| `dqa_tests_v1` | 6 | Dimensional QC results |
| `sourcing_delivery_details_v1` | 8 | Production delivery details |
| `fpa_data_v1` | 8 | FPA (Final Price Approval) data |
| `sample_cost_v1` | 8 | Sample cost details |
| `mrn_approval_v1` | 8 | MRN approval |
| `sample_receipt_v1` | 3 | Sample receipt confirmation |
| `tat_extension_request_v1` | 2 | TAT extension requests `{days, reason, requestedAt, decision?, decidedAt?}` |
| `requested_vendors_v1` | 2 | Manually requested new vendors `{name, contact, email, phone}[]` |
| `multi_dispatch_v1` | 3 | Multi-supplier dispatch tracking `{dispatchDate, docs[], submittedAt}` |
| `vendor_samples_v1` | 2+ | Per-vendor sample tracking `Record<npdId, boolean>` |
| `vendor_tests_v1` | 5 | Per-vendor test results `{results, status, submittedAt?}` |
| `vendor_verdicts_v1` | 5 | Per-vendor acceptance verdicts `{verdict, remarks, at}` |
| `final_vendor_v1` | 5 | Final vendor selection per NPD ID |
| `npd_bundle_v1` | 1 | NPD bundle parent→children mapping |
| `aicm_fetch_v1` | 1 | AICM data fetch record |
| `vendor_quote_approvals_v1` | 1 | Vendor quote approval decisions `Record<npdId, Record<vendorName, {approved}>>` |
| `supplier_form_config_v1` | Config | Dynamic supplier form question configuration `FormQuestion[]` |
| `supplier_submitted_docs_v1` | 3 | Documents submitted by supplier per NPD |
| `composed_emails_v1` | Config | Pre-composed email drafts per NPD |
| `vendor_date_approval_v1` | 2 | Vendor date approval decisions `Record<npdId, {decision, decidedAt}>` |
| `vendor_status_template_v1` | Config | Email template for vendor status checks |
| `push_notifications_v1` | Global | Push notification queue `PushNotification[]` |
| `price_negotiation_v1` | 8 | Price negotiation record (shared NPD/ECN/AS) `NegotiationRecord` |
| `ncd_pp_pricing_v1` | 8 | NCD-specific PP pricing data |

### 4b. ECN Stage Data

| localStorage Key | Stage | Data Stored |
|-----------------|-------|-------------|
| `ecn_stage1_v1` | 1 | `{submittedAt, fileLink?, partDetails}` |
| `ecn_rnd_approval_v1` | 2 | `{approved, approvedBy, approvedAt, fileLink}` |
| `ecn_initial_quote_v1` | 3 | `{vendorName, price, currency, submittedAt}` |
| `ecn_negotiation_v1` | 3 | `NegotiationRecord` (rounds, approvals) |
| `ecn_sourcing_dispatch_v1` | 3 | `{dispatchDate, submittedAt, eta?}` |
| `ecn_price_estimation_v1` | 4 | `{startedAt, results}` |
| `ecn_dqa_tests_v1` | 5 | `{results[], submittedAt}` |
| `ecn_head_approval_v1` | 6 | `{approved, approvedAt, note}` |
| `ecn_plant_eval_v1` | 7 | `{results, submittedAt}` |
| `ecn_pp_pricing_v1` | 8 | PP pricing data |
| `ecn_pp_rnd_approval_v1` | 8 | PP R&D approval |
| `ecn_pp_negotiation_v1` | 8 | PP negotiation rounds |

### 4c. AS (Alternative Supplier) Stage Data

| localStorage Key | Stage | Data Stored |
|-----------------|-------|-------------|
| `as_stage1_v1` | 1 | `ASStage1Data` (supplier, reason, change objective, cost checklist) |
| `as_rnd_approval_v1` | 2 | `{approved, approvedBy, approvedAt}` |
| `ecn_initial_quote_v1` | 3 | Initial quote (shared with ECN) |
| `ecn_negotiation_v1` | 3 | Negotiation (shared with ECN) |
| `ecn_price_estimation_v1` | 4 | R&D tests (shared key) |
| `ecn_dqa_tests_v1` | 5 | DQA tests (shared key) |
| `ecn_head_approval_v1` | 6 | Head approval (shared key) |
| `as_plant_eval_v1` | 7 | Plant evaluation (separate from ECN) |
| `as_pp_pricing_v1` | 8 | PP pricing |
| `as_pp_sourcing_approved_v1` | 8 | Sourcing approval |
| `as_pp_rnd_approval_v1` | 8 | R&D approval |

### 4d. NTD Stage Data (separate typed system)

Full TypeScript interfaces in `src/types/ntd.ts`:

| Stage | Type | Key Fields |
|-------|------|------------|
| 1 | `NTDInitiationData` | `title, spoc, notes, components[], part_specs[], tech_spec_sheets{}, semi_Progressive{}, submitted_by, submitted_at` |
| 2 | `NTDSpecData` + `NTDMergesData` | `spec_sheet, comparisons[], queries[], sourcing_signed, ...` + merge records `{source_ids[], result_id, commodity, merged_by}` |
| 3 | `NTDRFQData` | `vendors: {[vendorId]: {vendor_name, is_catalog, token, nda_required, nda_signed, sent, sent_at, sent_by, commodity}}` |
| 4 | `NTDQuotationData` + `NTDCompNegotiationStore` | `[vendorId]: {quotation?, thread[], status, category_selections?}` + internal `Record<vendorId, Record<componentId, {selected_category, base_price}>>` |
| 5 | `NTDSelectionData` | `selections: {[commodity]: {vendor_id, vendor_name}}, sourcing_approved, rnd_acknowledged` |
| 6 | `NTDHandoffData` | `components[], component_count, final_designs[], submitted_by, supplier_acknowledged` |
| 7 | `NTDDFMData` | `components[] (with ppt, design_3d, rnd_docs[], iteration_no, final_status), po_activity, stage_complete` |
| 8 | `NTDMouldData` | `redesign_round, components[] (mould_3d, mfa_ppt, reviews), joint_review?, stage_complete` |
| 9 | `NTDMfgData` | `mfg_start_date, eta_date, updates[], status, completed_by, phases[]` |
| 10 | `NTDTrialsData` + `NTDRedesignData` | `trials[] (samples_dispatch/receive, test results, verdicts), stage_complete` + redesign rounds `{triggered_by_trial, failed_component_ids[], re_enters: STAGE_8A_MOULD_DESIGN_ONLY}` |
| 11 | `NTDStage11Data` | `inspection, commissioning, shipment, exim, arrival, final_approval` |

---

## 5. Vendor / Supplier Entity

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | Company name |
| `tier` | `enum: Tier 1 | Tier 2 | Tier 3 | New` | Supplier tier |
| `commodity_match` | `int` | Commodity match % |
| `audit_score` | `int` | Audit score |
| `certifications` | `string[]` | ISO/IATF/CE certs |
| `status` | `enum: verified | audit_overdue | new` | Verification status |
| `spoc_name` | `string?` | Contact person |
| `spoc_email` | `string?` | Contact email |
| `spoc_phone` | `string?` | Contact phone |
| `is_requested` | `boolean?` | Manually requested vendor |

Commodity categories: `Plastics, Sheet Metal, Electronics & Electrical, Compressors & Motors, EPS, Packaging & Others, Others, Commodity-Based Component Development, Compliance & Regulatory`

---

## 6. Shared / Common Entities

### 6a. Activity Log (`NTDActivityLog`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID |
| `timestamp` | `datetime` | When it happened |
| `actor` | `string` | User name or role |
| `actor_role` | `enum: rnd, sourcing, rnd_head, sourcing_head, exim, super_admin, supplier, vendor` | Role |
| `stage` | `int` | Which stage |
| `substage` | `string?` | E.g., `"8A"`, `"8B"` for NTD mould |
| `action_type` | `enum` | See action types below |
| `description` | `text` | Human-readable |
| `payload` | `json?` | Structured metadata `{file_id, component_id, trial_no, vendor_id, verdict, ...}` |

**Action Types** (NTD): `ntd_created, stage_advanced, file_uploaded, file_revised, comment_added, comment_resolved, file_approved, file_rejected, component_approved, component_rejected, stage_complete, supplier_submitted, query_posted, quotation_submitted, negotiation_round, supplier_selected, supplier_acknowledged, po_raised, samples_received, samples_dispatched, trial_initiated, trial_result, redesign_triggered, manufacturing_update, manufacturing_complete, shipment_update, exim_update, dual_signed, ntd_complete`

### 6b. Versioned File

| Field | Type | Notes |
|-------|------|-------|
| `file_id` | `string` (PK) | UUID |
| `slot_name` | `string` | Display label |
| `versions` | `FileVersion[]` | Array of version entries |
| `current_version` | `int` | Pointer to latest |
| `comments` | `FileComment[]` | Review comments |
| `approved` | `boolean` | Approval state |
| `approved_by` | `string?` | Approver |
| `approved_at` | `datetime?` | Approval timestamp |

**FileVersion**:
| Field | Type |
|-------|------|
| `version_no` | `int` |
| `link` | `string` | Drive/SharePoint URL or data URL |
| `uploaded_by` | `string` |
| `uploaded_at` | `datetime` |
| `upload_note` | `string?` |
| `triggered_by_comment_id` | `string?` |

**FileComment**:
| Field | Type |
|-------|------|
| `comment_id` | `string` |
| `author` | `string` |
| `author_role` | `NTDRole` |
| `text` | `text` |
| `created_at` | `datetime` |
| `requires_revision` | `boolean` |
| `resolved` | `boolean` |
| `resolved_by` | `string?` |
| `resolved_at` | `datetime?` |
| `attachment_link` | `string?` |
| `attachment_name` | `string?` |

### 6c. Negotiation Record (ECN/AS/PP shared)

| Field | Type |
|-------|------|
| `rounds` | `NegotiationRound[]` |
| `approved_at` | `datetime?` |
| `approved_by` | `string?` |
| `final_price` | `string?` |
| `final_currency` | `enum: INR, USD, EUR` |
| `rejected_at` | `datetime?` |

**NegotiationRound**:
| Field | Type |
|-------|------|
| `round` | `int` |
| `target_price` | `string` |
| `currency` | `enum` |
| `sent_at` | `datetime` |
| `sent_by` | `string` |
| `supplier_response` | `json?` | `{price, currency, docs[], submittedAt}` |

### 6d. Live Quotation (NPD Stage 1)

| Field | Type | Notes |
|-------|------|-------|
| `vendor_name` | `string` | |
| `status` | `enum: submitted, re_negotiation` | |
| `form_values` | `json` | Key-value form data |
| `submitted_at` | `datetime` | |
| `revision_count` | `int` | |
| `feasible` | `boolean?` | Feasibility flag; undefined = legacy (treat as feasible) |
| `query` | `string?` | Clarification query raised by supplier when not feasible |
| `re_negotiation_msg` | `string?` | |
| `re_negotiation_at` | `datetime?` | Timestamp of re-negotiation request |
| `rnd_reply` | `string?` | R&D text reply to a feasibility denial query |
| `rnd_reply_doc` | `string?` | Optional uploaded doc filename from R&D |
| `rnd_replied_at` | `datetime?` | Timestamp of R&D reply |
| `query_history` | `json[]?` | `{query, rndReply, rndReplyDoc?, repliedAt?}` |

### 6e. Vendor Status Response (Feasibility)

| Field | Type | Notes |
|-------|------|-------|
| `vendor_name` | `string` | |
| `on_time` | `boolean` | |
| `new_date` | `date?` | |
| `notes` | `string?` | |
| `responded_at` | `datetime` | |
| `submission_count` | `int` | Max 2 submissions |
| `negotiation_status` | `enum: sourcing_countered, supplier_final` | Deadline negotiation round |
| `sourcing_counter_date` | `date?` | Counter-offer date from sourcing |
| `sourcing_counter_msg` | `string?` | Counter-offer message |
| `sourcing_countered_at` | `datetime?` | When sourcing countered |
| `supplier_final_date` | `date?` | Supplier's final offered date |
| `supplier_final_notes` | `string?` | Supplier's final notes |
| `supplier_final_at` | `datetime?` | When supplier submitted final |

### 6f. Test Templates & Results

**TestTemplate**: `{testName, testType, unit, expectedRange?, durationDays}`

**TestResult**: `{testName, value, status: pass|fail|pending}`

**DQA Test**: `{testName, unit: Pass/Fail|HRC/HRB|Hours, durationDays}`

DQA Tests (predefined set):
| Test Name | Unit | Duration |
|-----------|------|----------|
| Dimensional Inspection | Pass/Fail | 1 day |
| Visual / Surface Inspection | Pass/Fail | 1 day |
| Hardness Test | HRC/HRB | 1 day |
| Salt Spray / Corrosion | Hours | 3 days |

Per-commodity test templates in `TEST_TEMPLATES` constant, keyed by commodity category (Plastics, Sheet Metal, Electronics & Electrical, Compressors & Motors, Packaging & Others, Others).

### 6g. AS Stage 1 Data

| Field | Type |
|-------|------|
| `supplier_name` | `string` |
| `reason` | `string` |
| `docs_link` | `string?` |
| `submitted_by` | `string` |
| `submitted_at` | `datetime` |
| `change_objective` | `enum: Cost Innovation, Capacity Expansion, Compliance & Regulatory, New Supply` |
| `objective_details` | `json?` | `{checklist?, location?, newBusinessOrder?, pasQcoReference?, dmNotification?, newSupplyDetails?}` |
| `customer_specific` | `json?` | `{enabled, grade?}` |

**AS Cost Checklist Item**: `{label, oldPrice: decimal, newPrice: decimal}`

### 6h. NTD Component Merge (NTD Stage 2)

| Field | Type | Notes |
|-------|------|-------|
| `merge_id` | `string` | UUID |
| `source_ids` | `string[]` | Source componentIds being merged (2-3) |
| `result_id` | `string` | New componentId for merged component |
| `result_name` | `string` | Name for merged component |
| `commodity` | `enum: Sheet Metal, Plastics, EPS` | All sources must share same commodity |
| `merged_by` | `string` | Sourcing user |
| `merged_at` | `datetime` | |
| `split` | `json?` | `{split_by, split_at}` — populated if later split |

Stored as `NTDMergesData = { records: NTDMergeRecord[] }`, written by sourcing at Stage 2.

### 6i. NTD Redesign Round (NTD Stage 10 → Stage 8 loop)

| Field | Type | Notes |
|-------|------|-------|
| `round_no` | `int` | Incrementing |
| `triggered_by_trial` | `int` | Trial number that caused the redesign |
| `failed_component_ids` | `string[]` | Which components failed |
| `re_enters` | `enum: STAGE_8A_MOULD_DESIGN_ONLY` | Always re-enters mould design |
| `mould_redesign_round_ref` | `int` | Links to `NTDMouldData.redesign_round` |
| `resolved_at` | `datetime` | When redesign was completed |

Stored as `NTDRedesignData = { redesign_rounds: NTDRedesignRound[] }`.

### 6j. Contact Info

| Field | Type |
|-------|------|
| `name` | `string` |
| `email` | `string` |
| `phone` | `string` |

Used for SPOC contacts (`SPOC_CONTACTS`), default R&D contact (`DEFAULT_RND_CONTACT`), and default R&D head (`DEFAULT_RND_HEAD`). Currently in-memory constants in `mockData.ts`.

### 6k. Supplier Doc

| Field | Type | Notes |
|-------|------|-------|
| `file_name` | `string` | Uploaded file name |
| `question_label` | `string` | Maps to `FormQuestion.label` |
| `submitted_at` | `datetime` | |
| `size_mb` | `string` | File size |
| `submitted_by` | `string` | Supplier/vendor name |

Returned when a supplier submits documents in response to supplier form questions (NPD Stage 3 / ECN Stage 3).

### 6l. Form Question (Supplier Form Configuration)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Question ID (e.g. `q1`, `q2`) |
| `label` | `string` | Display label |
| `type` | `enum: text, number, date, select, file, textarea` | Input type |
| `required` | `boolean` | |
| `options` | `string[]?` | For `select` type |

Default config stored under `supplier_form_config_v1`. Includes 12 default questions covering dispatch date, sample count, costs, MOQ, payment terms, lead time, and quality certificates.

### 6m. Push Notification

| Field | Type |
|-------|------|
| `id` | `string` | UUID |
| `title` | `string` | |
| `body` | `string` | |
| `time` | `datetime` | |
| `to` | `string` | Recipient role/user |
| `npd_id` | `string` | Related record ID |
| `icon` | `enum: alert, check, mail, package` | |
| `read` | `boolean` | |

Stored as `PushNotification[]` under `push_notifications_v1`.

---

## 7. Roles & Permissions

| Role | Domain | Access |
|------|--------|--------|
| `rnd_user` | NPD/NCD/ECN/AS/CR | Create requests, view all, respond to queries |
| `rnd_head` | NPD/NCD/ECN/AS/CR/NTD | Approve stages, final sign-off |
| `sourcing_*` (named SPOCs) | All | Supplier management, negotiation, selection |
| `sourcing_head` | All | Approve selections, dual sign-off, PP pricing approval |
| `exim` | NTD Stage 11 | EXIM clearance |
| `super_admin` | All | Full access, stage advance/revert, cross-entity view |
| `supplier` / `vendor` | Portal | Submit quotes, samples, files, respond to queries |

NTD-specific: SPOC names act as sourcing roles (`Rahul Sharma`, `Karan Mehta`, `Priya Rajan`, `Amit Kumar`, `Varun Joshi`, `Rohan Desai`)

---

## 8. Data Flow / Relationships

```
npd_record (polymorphic parent)
  ├── type_of_work = NPD
  │     └── is_bundle = true → children: npd_record (parent_id) of type NCD
  ├── type_of_work = NCD
  │     └── parent_id → npd_record (NPD bundle)
  ├── type_of_work = ECN
  │     └── references existing part → existing_part_number
  ├── type_of_work = NTD
  │     └── separate typed stage data (NTDInitiationData → NTDSpecData → ...)
  │     └── separate NTDRecord (id, title, spoc, current_stage, status)
  ├── type_of_work = ALT_SUPPLIER / COMPLIANCE
  └── type_of_work = PP_REPEAT
        └── reuses NPD stage machine (9 stages)

Stage data (separate tables or JSON blobs per stage):
  npd_record.id → stage_data (polymorphic, keyed by record_id + stage_number)

Vendors (vendor_catalog):
  └── referenced by npd_record.supplier, rfq_vendors, live_quotations

Activity log:
  npd_record.id → activity_entries (append-only, ordered by timestamp)

Versioned files:
  └── Owned by stage data (NTD: spec sheets, designs, DFM files, mould files)
  └── Owned by stage data (NPD: supplier docs, test reports)
```

---

## 9. State Machine Rules

- **NPD/NCD**: Stages 1→9. Stage advancement is manual (button-driven per role).
- **ECN**: Stages 1→8. R&D approval at Stage 2 gates the rest.
- **AS**: Stages 1→8. R&D approval at Stage 2 gates negotiation.
- **NTD**: Stages 1→11. Automated advancement on stage-complete conditions.
- **CR (Compliance)**: Stages 1→6. Manual stage progression.
- **PP (Pre-Production) Repeat**: Stages 1→9 (NPD stage machine). Manual progression.
- **All types**: Revert allowed (demo). No parallel stage execution within a single workflow.
- **NTD Sub-stages**: Stage 8 splits into `8A` (Mould Design) and `8B` (Joint Review).
- **NTD Redesign Loop**: Trial failures can trigger re-entry at Stage 8A (Mould Design) via `NTDRedesignRound`.
- **TAT Health**: Computed client-side from `tat_days_remaining`: green (>3), amber (1-3), red (0), black (<0).

---

## 10. Key Missing / Recommended for DB Schema

1. **Users table**: Currently role is stored in `localStorage("poc_role")`. No user table exists. `ContactInfo`, `SPOC_CONTACTS`, `DEFAULT_RND_CONTACT`, `DEFAULT_RND_HEAD` are all in-memory constants.
2. **Vendor table**: Only in-memory `VENDOR_CATALOG` constant. No persistence for vendor records. `VendorRecord` type defined but no DB table.
3. **Audit trail**: Activity log is append-only localStorage array. Should be indexed by `(record_id, stage)`.
4. **File storage**: All files are Drive/SharePoint URLs or base64 data URLs. No file metadata table. `SupplierDoc` and `VersionedFile` types defined but not persisted server-side.
5. **Notification queue**: In-memory `PushNotification[]`. No DB persistence.
6. **TAT engine**: Computed client-side. No server-side TAT calculation.
7. **Stage progression**: Permission checks are client-side only (`localStorage role`).
8. **Form configurations**: `FormQuestion[]` for supplier forms stored only in localStorage (`supplier_form_config_v1`). No DB persistence.
9. **Email templates**: RFQ template (`vendor_rfq_template_v1`) and status template (`vendor_status_template_v1`) stored only in localStorage.
10. **Amber Plants / Sites / Verticals**: Hardcoded constants (`AMBER_PLANTS`, `ALL_SITES`, `ALL_VERTICALS`). No config table.
11. **NTDRecord**: Separate from `npd_record` (no shared DB table today). Stored alongside NTD stage data in localStorage.
