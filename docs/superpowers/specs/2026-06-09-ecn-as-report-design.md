# ECN / AS Report & Excel Design

**Date:** 2026-06-09  
**Status:** Approved — ready for implementation

---

## Scope

Two deliverables:

1. **Portal report** (`/report/[id]`): ECN- and AS-specific stage sections replacing the four NCD-centric sections.  
2. **Excel generator** (`reportGenerator.ts`): separate "ECN Report" and "AS Report" sheets, each with 46 type-specific column headers. NCD "Detailed Report" sheet is unchanged.

---

## 1. Portal Report (`/report/[id]/page.tsx`)

### Detection

```ts
const isECN = npd.typeOfWork === "Engineering Change Notice (ECN)"
const isAS  = npd.typeOfWork?.includes("Alternative Supplier")
```

### StageTimeline fix

Replace hardcoded `NPD_STAGES` array with a computed list:

```ts
const stageNames = Array.from({ length: isECN || isAS ? 8 : 9 }, (_, i) =>
  getStageName(i + 1, npd.typeOfWork)
)
```

### Report Header adjustments

When `isECN`: subtitle shows `ecnPartName · ecnPartNumber` instead of `itemCategory · productLine`.  
When `isAS`: subtitle shows `itemName · typeOfWork` (same as NCD).

### ECN Sections (8)

| # | Title | localStorage key | Pending state |
|---|-------|-----------------|---------------|
| 1 | ECN Request Initialisation | `ECN_STAGE1_KEY[npdId]` | "Not yet submitted" |
| 2 | Sourcing Review & Price Negotiation | `ECN_RND_APPROVAL_KEY[npdId]` + `ECN_NEGOTIATION_KEY[npdId]` | "Awaiting stage 2" |
| 3 | Supplier Sample Dispatch | `ECN_SOURCING_DISPATCH_KEY[npdId]` | "Awaiting dispatch" |
| 4 | R&D Testing | `ECN_PRICE_ESTIMATION_KEY[npdId]` | "Pending" |
| 5 | DQA Testing | `ECN_DQA_TESTS_KEY[npdId]` | "Pending" |
| 6 | R&D Head Approval | `ECN_HEAD_APPROVAL_KEY[npdId]` | "Awaiting approval" |
| 7 | Plant Evaluation & Testing | `ECN_PLANT_EVAL_KEY[npdId]` | "Pending" |
| 8 | ECN Summary & Closure | derived from all above | shown when stage = 8 |

### AS Sections (8)

| # | Title | localStorage key | Pending state |
|---|-------|-----------------|---------------|
| 1 | Sourcing Request Initiation | `AS_STAGE1_KEY[npdId]` | "Not yet submitted" |
| 2 | R&D Review & Approval | `AS_RND_APPROVAL_KEY[npdId]` | "Awaiting approval" |
| 3 | Price Negotiation & Dispatch | `ECN_INITIAL_QUOTE_KEY[npdId]` + `ECN_NEGOTIATION_KEY[npdId]` | "Awaiting supplier quote" |
| 4 | R&D Testing | `ECN_PRICE_ESTIMATION_KEY[npdId]` | "Pending" |
| 5 | DQA Testing | `ECN_DQA_TESTS_KEY[npdId]` | "Pending" |
| 6 | R&D Head Approval | `ECN_HEAD_APPROVAL_KEY[npdId]` | "Awaiting approval" |
| 7 | Plant Evaluation & Testing | `AS_PLANT_EVAL_KEY[npdId]` | "Pending" |
| 8 | AS Summary & Closure | derived from all above | shown when stage = 8 |

### UI rendering

Each section uses the existing `<SectionCard>` component. Non-reached sections render with `defaultOpen={false}` and show a single italic "Pending / awaiting earlier stages" message.  
Reached sections show a `<FieldGrid>` with relevant key-value pairs.  
Pass/Fail results (stages 4, 5, 7) use a small inline table matching the existing NCD test-results table style.

---

## 2. Excel Generator (`reportGenerator.ts`)

### Principle

- "Detailed Report" sheet: **no change** — all 46 NCD columns, same headers, same `buildNPDRow`.
- "ECN Report" sheet: 46 columns, ECN-specific header names, `buildECNRow`.
- "AS Report" sheet: 46 columns, AS-specific header names, `buildASRow`.
- Both ECN/AS sheets use the same `addMISSheet` helper with custom `headers` / `sections` / `rowBuilder` parameters.

### `addMISSheet` signature change

```ts
function addMISSheet(
  sheetName: string,
  tabColor: string,
  sheetNpds: NPDRecord[],
  subtitle?: string,
  // optional overrides — defaults to NCD values
  headers?: string[],
  colWidths?: number[],
  sectionDefs?: [number, number, string, string][],
  rowBuilder?: (npd: NPDRecord) => (string | number)[],
)
```

### ECN 46 columns (by section)

| Cols | Section label | Column names |
|------|--------------|-------------|
| 1–8 | ECN Details | ECN ID · Request Date · Manufacturing Plant · Sample Location · Owner / SPOC · Internal / External · Product Line · Change Description |
| 9–15 | Part & Specs | ECN Part Number · Drawing / Spec Sheet · Revision No. · Part Name · Part Category · Spec Sheet Link · Existing Supplier |
| 16–21 | TAT & Approval | TAT (Days) · Sample Qty · Type of Work · R&D SPOC · Stage 1 Submitted At · Stage 2 R&D Approved At |
| 22–30 | Supplier & Negotiation | Supplier Name · Supplier (Confirmed) · Supplier Email · Stage 2 Negotiation Status · Negotiation Final Price · Stage 3 Dispatch ETA · Tool / Jig Required · Lead Time (Days) · Dispatch Sample Qty |
| 31–35 | Delivery | Stage 3 Dispatch Date · TAT Elapsed (Days) · Sample Arrival Date · Current Stage · R&D Contact |
| 36–41 | Testing | Stage 4 Test Start · R&D Test Summary · Test Categories · Stage 4 Overall Result · Stage 5 DQA Submitted At · Stage 5 DQA Result |
| 42–44 | Head Approval | Stage 6 Verdict · Stage 6 Approval Date · Stage 6 Remarks |
| 45–46 | Closure | Stage 7 Plant Eval Submitted · Stage 7 Eval Result |

### AS 46 columns (by section)

| Cols | Section label | Column names |
|------|--------------|-------------|
| 1–8 | AS Details | AS ID · Request Date · Location · Sample Location · Owner / SPOC · Internal / External · Product Line · Reason for Qualification |
| 9–15 | Part & Specs | Existing Part Number · Drawing Link · Revision No. · Item Name · Item Category · Spec Sheet · Proposed Supplier |
| 16–21 | TAT & Approval | TAT (Days) · Sample Qty · Type of Work · R&D SPOC · Stage 2 R&D Approved At · Stage 3 Negotiation Accepted At |
| 22–30 | Supplier & Negotiation | Proposed Supplier · Supplier (Confirmed) · Supplier Email · Stage 3 Negotiation Status · Final Accepted Price · Initial Quote Submitted At · Tool / Jig Required · Lead Time (Days) · Sample Qty |
| 31–35 | Delivery | Stage 3 Dispatch Date · TAT Elapsed (Days) · Sample Arrival Date · Current Stage · R&D Contact |
| 36–41 | Testing | Stage 4 Test Start · R&D Test Summary · Test Categories · Stage 4 Overall Result · Stage 5 DQA Submitted At · Stage 5 DQA Result |
| 42–44 | Head Approval | Stage 6 Verdict · Stage 6 Approval Date · Stage 6 Remarks |
| 45–46 | Closure | Stage 7 Plant Eval Submitted · Stage 7 Eval Result |

### ECN/AS data builders

`buildECNRow(npd)` reads:
- `ECN_STAGE1_KEY`, `ECN_RND_APPROVAL_KEY`, `ECN_NEGOTIATION_KEY`, `ECN_SOURCING_DISPATCH_KEY`
- `ECN_PRICE_ESTIMATION_KEY`, `ECN_DQA_TESTS_KEY`, `ECN_HEAD_APPROVAL_KEY`, `ECN_PLANT_EVAL_KEY`

`buildASRow(npd)` reads:
- `AS_STAGE1_KEY`, `AS_RND_APPROVAL_KEY`, `ECN_INITIAL_QUOTE_KEY`, `ECN_NEGOTIATION_KEY`
- `ECN_PRICE_ESTIMATION_KEY`, `ECN_DQA_TESTS_KEY`, `ECN_HEAD_APPROVAL_KEY`, `AS_PLANT_EVAL_KEY`

### Sheet creation in `downloadMISReport`

After the existing "Detailed Report" and bundle child sheets:

```ts
const ecnNpds = npds.filter(n => n.typeOfWork === "Engineering Change Notice (ECN)")
const asNpds  = npds.filter(n => n.typeOfWork?.includes("Alternative Supplier"))

if (ecnNpds.length > 0) addMISSheet("ECN Report", "FFF97316", ecnNpds, undefined, ECN_HEADERS, ECN_COL_WIDTHS, ECN_SECTIONS, buildECNRow)
if (asNpds.length  > 0) addMISSheet("AS Report",  "FF0D9488", asNpds,  undefined, AS_HEADERS,  AS_COL_WIDTHS,  AS_SECTIONS,  buildASRow)
```

Tab colors: ECN = orange (`FFF97316`), AS = teal (`FF0D9488`).

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/reportGenerator.ts` | Add ECN/AS headers, section defs, row builders; extend `addMISSheet`; add ECN/AS sheet generation |
| `src/app/(internal)/report/[id]/page.tsx` | Add ECN/AS detection, fix StageTimeline, add 8-section ECN/AS layouts |
