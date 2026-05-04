// Types-only import is erased at runtime — no Performance API conflict.
// The implementation is loaded dynamically inside downloadMISReport.
import type ExcelJS from "exceljs"
import {
  type NPDRecord,
  SUPPLIER_DISPATCH_KEY, DELIVERY_DETAILS_KEY,
  ENQUIRY_SENT_KEY, PART_ASSIGNMENT_KEY, PLANT_ACCEPTANCE_KEY,
  PLANT_SUPPLIER_RESP_KEY, RND_EVAL_KEY, LIVE_QUOTATIONS_KEY,
  DEFAULT_RND_CONTACT,
} from "./mockData"

// ─────────────────────────────────────────────────────────────────────────────
// 46-column MIS headers (exact match to original tracker)
// ─────────────────────────────────────────────────────────────────────────────
export const MIS_HEADERS = [
  "Project ID",
  "Request Date",
  "Location",
  "Sample Required Location",
  "Owner / SPOC",
  "Customer Specific",
  "Customer Name",
  "Project Details / Description",
  "Dwg No.",
  "Dwg Release Date",
  "Revision",
  "Item Name",
  "Item Category",
  "Spec Sheet",
  "Library",
  "Desired Date (TAT)",
  "Desired Qty",
  "Trigger Request",
  "Allocation to NPD",
  "RFQ Date",
  "Trigger Acceptance",
  "Allocated Supplier",
  "Supplier Name",
  "Supplier Email",
  "Supplier Confirmation",
  "Acceptance",
  "Sample Submission Date (Committed)",
  "Tool / Jig Required",
  "Lead Time (Days)",
  "Sample Qty",
  "Dispatch Date (Actual)",
  "TAT from Allocation (Days)",
  "Arrival Date",
  "Status",
  "R&D SPOC",
  "Test Start Date",
  "Test Schedule",
  "Test Type",
  "3rd Party Test Required",
  "Schedule (Date)",
  "Est. Date of Report",
  "Approved / Not Approved",
  "If Approved — Approval Report",
  "If Rejected — Inform Supplier (Date)",
  "Part Code No.",
  "Cost Derivation from AICM (₹)",
]

// Column widths matching each of the 46 headers
const MIS_COL_WIDTHS = [
  14, 14, 18, 24, 18, 16, 22, 30, 12, 14,
  10, 26, 22, 14, 12, 18, 12, 22, 18, 14,
  18, 24, 24, 26, 22, 14, 30, 16, 14, 12,
  22, 24, 16, 20, 18, 18, 16, 22, 20, 14,
  20, 22, 28, 30, 16, 22,
]

// Section groupings [startCol 1-based, endCol 1-based, label, headerBgArgb]
const SECTIONS: [number, number, string, string][] = [
  [1,  8,  "Project Details",           "FF6366F1"],
  [9,  15, "Drawing & Specs",           "FF3B82F6"],
  [16, 21, "TAT & Allocation",          "FF0891B2"],
  [22, 30, "Supplier & Dispatch",       "FF059669"],
  [31, 35, "Delivery",                  "FFF59E0B"],
  [36, 41, "R&D Testing",              "FFEC4899"],
  [42, 44, "Approval",                  "FF7C3AED"],
  [45, 46, "Closure",                   "FF64748B"],
]

// ─────────────────────────────────────────────────────────────────────────────
// Data builder
// ─────────────────────────────────────────────────────────────────────────────
function readKey<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback }
  catch { return fallback }
}

function todayStr() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function buildNPDRow(npd: NPDRecord): (string | number)[] {
  const dispatches   = readKey<Record<string, any>>(SUPPLIER_DISPATCH_KEY, {})
  const delivDetails = readKey<Record<string, any>>(DELIVERY_DETAILS_KEY, {})
  const plantSupp    = readKey<Record<string, any>>(PLANT_SUPPLIER_RESP_KEY, {})
  const plantAccept  = readKey<Record<string, any>>(PLANT_ACCEPTANCE_KEY, {})
  const parts        = readKey<Record<string, any>>(PART_ASSIGNMENT_KEY, {})
  const rndEvals     = readKey<Record<string, any>>(RND_EVAL_KEY, {})
  const liveQ        = readKey<Record<string, any>>(LIVE_QUOTATIONS_KEY, {})
  const enquiries    = readKey<Record<string, string[]>>(ENQUIRY_SENT_KEY, {})

  const d  = dispatches[npd.id];  const dd = delivDetails[npd.id]
  const ps = plantSupp[npd.id];   const pa = plantAccept[npd.id]
  const pt = parts[npd.id];       const re = rndEvals[npd.id]
  const npdLiveQ: Record<string, any> = liveQ[npd.id] ?? {}
  const firstQuote    = Object.values(npdLiveQ)[0] as any
  const committedDate = firstQuote?.formValues?.["Dispatch Date"] ?? firstQuote?.formValues?.dispatch_date ?? "—"
  const testType      = re?.tests ? Object.values(re.tests).map((t: any) => t.testType).filter(Boolean).join(", ") : "—"
  const verdict       = pa?.verdict === "accepted" ? "Approved" : pa?.verdict === "not_good" ? "Not Approved" : npd.stage >= 7 ? "Pending" : "—"
  const rfqDateStr    = enquiries[npd.id] ? todayStr() : "—"
  const supplier      = npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : "—"

  return [
    npd.id,                                                          // 1
    todayStr(),                                                      // 2
    npd.rAndDDivision,                                               // 3
    dd?.location ?? npd.rAndDDivision,                              // 4
    npd.spoc,                                                        // 5
    "Internal",                                                      // 6
    npd.productLine,                                                 // 7
    npd.itemName,                                                    // 8
    "—", "—", "—",                                                  // 9-11
    npd.itemName,                                                    // 12
    npd.itemCategory,                                                // 13
    "Not Attached", "—",                                             // 14-15
    String(npd.totalTat) + " days",                                 // 16
    dd?.requiredQty ?? "—",                                         // 17
    npd.typeOfWork,                                                  // 18
    npd.spoc,                                                        // 19
    rfqDateStr, "—",                                                 // 20-21
    supplier, supplier, "—",                                         // 22-24
    committedDate !== "—" ? "Yes" : "—",                            // 25
    committedDate !== "—" ? "Accepted" : "—",                       // 26
    committedDate,                                                   // 27
    "No",                                                            // 28
    String(npd.totalTat),                                           // 29
    ps?.sampleQty ?? dd?.requiredQty ?? "—",                        // 30
    d?.dispatchDate ?? "—",                                         // 31
    d ? String(npd.totalTat - npd.tatDaysRemaining) : "—",          // 32
    pa?.verdictAt ?? ps?.submittedAt ?? "—",                        // 33
    npd.stageName,                                                   // 34
    DEFAULT_RND_CONTACT.name,                                       // 35
    re?.startedAt ?? "—",                                           // 36
    "—", testType, "No",                                             // 37-39
    "—", "—",                                                        // 40-41
    verdict,                                                         // 42
    pa?.verdict === "accepted" ? todayStr() : "—",                  // 43
    pa?.verdict === "not_good" ? todayStr() : "—",                  // 44
    pt?.partNumber ?? "—",                                           // 45
    npd.cost != null ? npd.cost : "—",                              // 46
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — ExcelJS loaded dynamically to avoid Next.js perf API conflict
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadMISReport(
  npds: NPDRecord[],
  filename = "NPD_Sourcing_Tracker_MIS.xlsx",
) {
  // Dynamic import keeps exceljs out of the module-level bundle and avoids
  // the "Performance.measure RootPage negative timestamp" error in Next.js.
  const ExcelJS = (await import("exceljs")).default

  const wb = new ExcelJS.Workbook()
  wb.creator  = "Amber Enterprises — NPD Command"
  wb.created  = new Date()
  wb.modified = new Date()

  // ── helpers local to this function ─────────────────────────────────────────
  type WS   = ExcelJS.Worksheet
  type Cell = ExcelJS.Cell

  const solid = (argb: string): ExcelJS.Fill =>
    ({ type: "pattern", pattern: "solid", fgColor: { argb } })

  const thinBorder = (argb = "FFE2E8F0"): Partial<ExcelJS.Borders> => {
    const s = { style: "thin" as ExcelJS.BorderStyle, color: { argb } }
    return { top: s, bottom: s, left: s, right: s }
  }

  function sc(
    cell: Cell,
    opts: {
      v?: ExcelJS.CellValue; bg?: string; bold?: boolean; size?: number
      color?: string; italic?: boolean
      hAlign?: ExcelJS.Alignment["horizontal"]
      vAlign?: ExcelJS.Alignment["vertical"]
      wrap?: boolean; border?: Partial<ExcelJS.Borders>; numFmt?: string
    },
  ) {
    if (opts.v !== undefined) cell.value = opts.v
    if (opts.bg) cell.fill = solid(opts.bg)
    cell.font = { name: "Calibri", bold: opts.bold ?? false, italic: opts.italic ?? false, size: opts.size ?? 10, color: { argb: opts.color ?? "FF1E293B" } }
    cell.alignment = { horizontal: opts.hAlign ?? "left", vertical: opts.vAlign ?? "middle", wrapText: opts.wrap ?? false }
    if (opts.border)  cell.border = opts.border
    if (opts.numFmt)  cell.numFmt = opts.numFmt
  }

  function fillRange(ws: WS, r1: number, c1: number, r2: number, c2: number, argb: string) {
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) ws.getCell(r, c).fill = solid(argb)
  }

  function outerBox(ws: WS, r1: number, c1: number, r2: number, c2: number, argb: string, sty: ExcelJS.BorderStyle = "thin") {
    const side = { style: sty, color: { argb } }
    for (let c = c1; c <= c2; c++) {
      const t = ws.getCell(r1, c); t.border = { ...t.border, top: side }
      const b = ws.getCell(r2, c); b.border = { ...b.border, bottom: side }
    }
    for (let r = r1; r <= r2; r++) {
      const l = ws.getCell(r, c1); l.border = { ...l.border, left: side }
      const ri = ws.getCell(r, c2); ri.border = { ...ri.border, right: side }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const sum = wb.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF6366F1" } },
  })

  const W = 20   // total columns used in summary
  sum.columns = Array.from({ length: W }, (_, i) => ({ key: `c${i + 1}`, width: i === 0 || i === 4 || i === 8 || i === 12 || i === 16 ? 3 : 14 }))

  const active      = npds.filter(n => n.stage < 8).length
  const overdueAll  = npds.filter(n => n.tatHealth === "black" || n.tatHealth === "red").length
  const gradeA      = npds.filter(n => n.gradeA).length
  const onTrack     = npds.filter(n => n.tatHealth === "green").length
  const atRisk      = npds.filter(n => n.tatHealth === "amber").length
  const dueToday    = npds.filter(n => n.tatHealth === "red").length
  const overdueOnly = npds.filter(n => n.tatHealth === "black").length
  const completed   = npds.filter(n => n.stage >= 8).length

  // Row 1 — company name
  sum.getRow(1).height = 32
  sum.mergeCells(1, 1, 1, W)
  sc(sum.getCell(1, 1), { v: "AMBER ENTERPRISES INDIA LIMITED", bg: "FF0F172A", bold: true, size: 14, color: "FFFFFFFF", hAlign: "center" })

  // Row 2 — report title
  sum.getRow(2).height = 22
  sum.mergeCells(2, 1, 2, W)
  sc(sum.getCell(2, 1), { v: "NPD Sourcing MIS Report", bg: "FF1E293B", size: 11, color: "FF94A3B8", hAlign: "center" })

  // Row 3 — meta
  sum.getRow(3).height = 16
  sum.mergeCells(3, 1, 3, W)
  sc(sum.getCell(3, 1), { v: `FY 2025–26   ·   Generated: ${todayStr()}   ·   ${npds.length} NPD records`, bg: "FFF1F5F9", size: 9, color: "FF64748B", hAlign: "center", italic: true })

  // Row 4 — spacer
  sum.getRow(4).height = 10; fillRange(sum, 4, 1, 4, W, "FFFFFFFF")

  // Row 5 — section label
  sum.getRow(5).height = 20
  sum.mergeCells(5, 1, 5, W)
  sc(sum.getCell(5, 1), { v: "  KEY PERFORMANCE INDICATORS", bg: "FFF8FAFC", bold: true, size: 8, color: "FF94A3B8" })
  sum.getCell(5, 1).border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } }

  // Rows 6-9 — KPI cards (col layout: A=margin, B-D=card1, E=gap, F-H=card2, I=gap, J-L=card3, M=gap, N-P=card4)
  sum.getRow(6).height = 16; sum.getRow(7).height = 44; sum.getRow(8).height = 16; sum.getRow(9).height = 6

  const kpis = [
    { c: 2,  label: "TOTAL RECORDS",  sub: "All NPDs",                    val: npds.length, bg: "FFF0F9FF", num: "FF0369A1" },
    { c: 6,  label: "ACTIVE",         sub: "In Progress",                 val: active,      bg: "FFF0FDF4", num: "FF15803D" },
    { c: 10, label: "GRADE A",        sub: "Priority Items",              val: gradeA,      bg: "FFF5F3FF", num: "FF6D28D9" },
    { c: 14, label: "OVERDUE",        sub: overdueAll > 0 ? "Needs Attention" : "All On Track",
      val: overdueAll, bg: overdueAll > 0 ? "FFFEF2F2" : "FFF8FAFC", num: overdueAll > 0 ? "FFDC2626" : "FF94A3B8" },
  ]

  kpis.forEach(({ c, label, sub, val, bg, num }) => {
    const e = c + 2
    fillRange(sum, 6, c, 9, e, bg)
    sum.mergeCells(6, c, 6, e)
    sc(sum.getCell(6, c), { v: label, bg, bold: true, size: 8, color: "FF64748B", hAlign: "center", vAlign: "bottom" })
    sum.mergeCells(7, c, 7, e)
    sc(sum.getCell(7, c), { v: val, bg, bold: true, size: 36, color: num, hAlign: "center" })
    sum.mergeCells(8, c, 8, e)
    sc(sum.getCell(8, c), { v: sub, bg, size: 8, color: "FF94A3B8", hAlign: "center", vAlign: "top" })
    sum.mergeCells(9, c, 9, e)
    sum.getCell(9, c).fill = solid(bg)
    outerBox(sum, 6, c, 9, e, "FFE2E8F0")
  })

  fillRange(sum, 10, 1, 10, W, "FFFFFFFF"); sum.getRow(10).height = 12

  // Status breakdown section
  sum.getRow(11).height = 20
  sum.mergeCells(11, 1, 11, W)
  sc(sum.getCell(11, 1), { v: "  TAT STATUS BREAKDOWN", bg: "FFF8FAFC", bold: true, size: 8, color: "FF94A3B8" })
  sum.getCell(11, 1).border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } }

  sum.getRow(12).height = 24
  ;([[2, 5, "TAT STATUS", "left"], [6, 8, "COUNT", "center"], [9, 11, "% OF TOTAL", "center"], [12, 17, "DISTRIBUTION", "left"]] as [number, number, string, ExcelJS.Alignment["horizontal"]][])
    .forEach(([c1, c2, hdr, ha]) => {
      sum.mergeCells(12, c1, 12, c2)
      sc(sum.getCell(12, c1), { v: hdr, bg: "FF1E293B", bold: true, size: 9, color: "FFFFFFFF", hAlign: ha, border: thinBorder("FF334155") })
      for (let c = c1 + 1; c <= c2; c++) { sum.getCell(12, c).fill = solid("FF1E293B"); sum.getCell(12, c).border = thinBorder("FF334155") }
    })

  const maxBar = Math.max(onTrack, atRisk, dueToday, overdueOnly, 1)
  ;([
    ["On Track",  onTrack,     "FFD1FAE5", "FF065F46"],
    ["At Risk",   atRisk,      "FFFEF3C7", "FF92400E"],
    ["Due Today", dueToday,    "FFFEE2E2", "FF991B1B"],
    ["Overdue",   overdueOnly, "FFFECACA", "FF7F1D1D"],
  ] as [string, number, string, string][]).forEach(([label, count, bg, txt], i) => {
    const r = 13 + i
    sum.getRow(r).height = 22
    const pct = npds.length > 0 ? ((count / npds.length) * 100).toFixed(1) + "%" : "0%"
    const filled = Math.round((count / maxBar) * 14)
    const bar = "█".repeat(filled) + "░".repeat(14 - filled)

    sum.mergeCells(r, 2, r, 5); sc(sum.getCell(r, 2), { v: label, bg, bold: true, size: 10, color: txt, border: thinBorder() }); for (let c = 3; c <= 5; c++) { sum.getCell(r, c).fill = solid(bg); sum.getCell(r, c).border = thinBorder() }
    sum.mergeCells(r, 6, r, 8); sc(sum.getCell(r, 6), { v: count, bg, bold: true, size: 13, color: txt, hAlign: "center", border: thinBorder() }); for (let c = 7; c <= 8; c++) { sum.getCell(r, c).fill = solid(bg); sum.getCell(r, c).border = thinBorder() }
    sum.mergeCells(r, 9, r, 11); sc(sum.getCell(r, 9), { v: pct, bg: "FFFFFFFF", size: 10, color: "FF374151", hAlign: "center", border: thinBorder() }); for (let c = 10; c <= 11; c++) { sum.getCell(r, c).fill = solid("FFFFFFFF"); sum.getCell(r, c).border = thinBorder() }
    sum.mergeCells(r, 12, r, 17); sc(sum.getCell(r, 12), { v: bar, bg: "FFFFFFFF", size: 9, color: txt, hAlign: "left", border: thinBorder() }); for (let c = 13; c <= 17; c++) { sum.getCell(r, c).fill = solid("FFFFFFFF"); sum.getCell(r, c).border = thinBorder() }
  })

  // Total row
  sum.getRow(17).height = 20
  sum.mergeCells(17, 2, 17, 5); sc(sum.getCell(17, 2), { v: "TOTAL", bg: "FFF1F5F9", bold: true, size: 10, color: "FF374151", border: thinBorder() }); for (let c = 3; c <= 5; c++) { sum.getCell(17, c).fill = solid("FFF1F5F9"); sum.getCell(17, c).border = thinBorder() }
  sum.mergeCells(17, 6, 17, 8); sc(sum.getCell(17, 6), { v: npds.length, bg: "FFF1F5F9", bold: true, size: 13, color: "FF374151", hAlign: "center", border: thinBorder() }); for (let c = 7; c <= 8; c++) { sum.getCell(17, c).fill = solid("FFF1F5F9"); sum.getCell(17, c).border = thinBorder() }
  sum.mergeCells(17, 9, 17, 17); sc(sum.getCell(17, 9), { v: "100%", bg: "FFF1F5F9", size: 10, color: "FF374151", hAlign: "center", border: thinBorder() }); for (let c = 10; c <= 17; c++) { sum.getCell(17, c).fill = solid("FFF1F5F9"); sum.getCell(17, c).border = thinBorder() }

  // Footer
  fillRange(sum, 18, 1, 18, W, "FFFFFFFF"); sum.getRow(18).height = 10
  sum.getRow(19).height = 14
  sum.mergeCells(19, 1, 19, W)
  sc(sum.getCell(19, 1), { v: `Amber Enterprises India Limited  ·  NPD Sourcing Tracker MIS  ·  FY 2025–26  ·  ${todayStr()}`, bg: "FFF1F5F9", size: 8, color: "FF94A3B8", hAlign: "center", italic: true })

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2 — DETAILED REPORT (all 46 MIS columns)
  // ══════════════════════════════════════════════════════════════════════════
  const det = wb.addWorksheet("Detailed Report", {
    properties: { tabColor: { argb: "FF10B981" } },
    views: [{ state: "frozen", ySplit: 5, xSplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  })

  const N = MIS_HEADERS.length   // 46

  det.columns = MIS_HEADERS.map((_, i) => ({ key: `c${i + 1}`, width: MIS_COL_WIDTHS[i] ?? 16 }))

  // Row 1 — company title
  det.getRow(1).height = 30
  det.mergeCells(1, 1, 1, N)
  sc(det.getCell(1, 1), { v: "AMBER ENTERPRISES INDIA LIMITED", bg: "FF0F172A", bold: true, size: 14, color: "FFFFFFFF", hAlign: "center" })

  // Row 2 — report title
  det.getRow(2).height = 20
  det.mergeCells(2, 1, 2, N)
  sc(det.getCell(2, 1), { v: "NPD SOURCING TRACKER & MIS REPORT — FY 2025–26", bg: "FF1E293B", size: 11, color: "FF94A3B8", hAlign: "center" })

  // Row 3 — meta
  det.getRow(3).height = 16
  det.mergeCells(3, 1, 3, N)
  sc(det.getCell(3, 1), { v: `Generated: ${todayStr()}   ·   Total Records: ${npds.length}`, bg: "FFF1F5F9", size: 9, color: "FF64748B", hAlign: "center", italic: true })

  // Row 4 — section colour band
  det.getRow(4).height = 14
  SECTIONS.forEach(([c1, c2, label, hdrBg]) => {
    det.mergeCells(4, c1, 4, c2)
    sc(det.getCell(4, c1), { v: label.toUpperCase(), bg: hdrBg, bold: true, size: 8, color: "FFFFFFFF", hAlign: "center", border: thinBorder("FF00000022") })
    for (let c = c1 + 1; c <= c2; c++) { det.getCell(4, c).fill = solid(hdrBg); det.getCell(4, c).border = thinBorder("FF00000022") }
  })

  // Row 5 — column headers (colour-matched to section)
  det.getRow(5).height = 36
  const sectionFor = (col: number) => SECTIONS.find(([c1, c2]) => col >= c1 && col <= c2)
  // Slightly lightened header bg per section
  const HEADER_BG: Record<string, string> = {
    "FF6366F1": "FF4338CA", "FF3B82F6": "FF2563EB", "FF0891B2": "FF0E7490",
    "FF059669": "FF047857", "FFF59E0B": "FFD97706", "FFEC4899": "FFDB2777",
    "FF7C3AED": "FF6D28D9", "FF64748B": "FF475569",
  }
  MIS_HEADERS.forEach((hdr, i) => {
    const col = i + 1
    const sec = sectionFor(col)
    const bg  = sec ? (HEADER_BG[sec[3]] ?? "FF1E293B") : "FF1E293B"
    sc(det.getCell(5, col), {
      v: hdr, bg, bold: true, size: 8, color: "FFFFFFFF",
      hAlign: "center", wrap: true,
      border: { top: { style: "medium", color: { argb: "FF374151" } }, bottom: { style: "medium", color: { argb: "FF374151" } }, left: thinBorder().left, right: thinBorder().right },
    })
  })

  // Auto-filter on header row
  det.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: N } }

  // Data rows
  const VERDICT_STYLE: Record<string, { bg: string; color: string }> = {
    "Approved":     { bg: "FFD1FAE5", color: "FF065F46" },
    "Not Approved": { bg: "FFFEE2E2", color: "FF991B1B" },
    "Pending":      { bg: "FFFEF3C7", color: "FF92400E" },
  }

  npds.forEach((npd, i) => {
    const r      = 6 + i
    const isEven = i % 2 === 0
    const rowBg  = isEven ? "FFFFFFFF" : "FFF8FAFC"
    const values = buildNPDRow(npd)
    det.getRow(r).height = 18

    values.forEach((val, vi) => {
      const col  = vi + 1
      const cell = det.getCell(r, col)
      const isEmpty = val === "—" || val === "" || val == null

      cell.value  = val
      cell.fill   = solid(rowBg)
      cell.border = thinBorder()
      cell.alignment = { horizontal: col >= 16 && col <= 32 ? "center" : "left", vertical: "middle" }
      cell.font   = { name: "Calibri", size: 10, bold: col === 1, color: { argb: isEmpty ? "FFCBD5E1" : col === 1 ? "FF4F46E5" : "FF1E293B" } }

      // Cost column — number format
      if (col === 46 && typeof val === "number") {
        cell.numFmt = '₹#,##0.00'
        cell.alignment = { horizontal: "right", vertical: "middle" }
      }

      // Verdict column — conditional colour
      if (col === 42 && !isEmpty) {
        const vs = VERDICT_STYLE[String(val)]
        if (vs) { cell.fill = solid(vs.bg); cell.font = { ...cell.font, bold: true, color: { argb: vs.color } } }
      }

      // Status column (34) — stage progress highlight
      if (col === 34 && !isEmpty) {
        cell.fill = solid(isEven ? "FFF0FDF4" : "FFE6FAF0")
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF047857" } }
      }
    })
  })

  // Total row at bottom
  const totalR = 6 + npds.length
  det.getRow(totalR).height = 22
  det.mergeCells(totalR, 1, totalR, N)
  sc(det.getCell(totalR, 1), {
    v: `TOTAL  —  ${npds.length} record${npds.length !== 1 ? "s" : ""}   ·   ${active} Active   ·   ${gradeA} Grade A   ·   ${overdueAll} Overdue`,
    bg: "FFF1F5F9", bold: true, size: 10, color: "FF374151",
    border: { top: { style: "medium", color: { argb: "FF9CA3AF" } }, bottom: { style: "medium", color: { argb: "FF9CA3AF" } }, left: { style: "medium", color: { argb: "FF9CA3AF" } }, right: { style: "medium", color: { argb: "FF9CA3AF" } } },
  })
  for (let c = 2; c <= N; c++) {
    det.getCell(totalR, c).fill   = solid("FFF1F5F9")
    det.getCell(totalR, c).border = { top: { style: "medium", color: { argb: "FF9CA3AF" } }, bottom: { style: "medium", color: { argb: "FF9CA3AF" } }, right: { style: "medium", color: { argb: "FF9CA3AF" } } }
  }

  // Heavy outer box on the whole data table
  outerBox(det, 4, 1, totalR, N, "FF9CA3AF", "medium")

  // ── Download ────────────────────────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
