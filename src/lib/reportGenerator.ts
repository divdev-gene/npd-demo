import * as XLSX from "xlsx"
import {
  type NPDRecord,
  SUPPLIER_DISPATCH_KEY, DELIVERY_DETAILS_KEY, DELIVERY_ACCEPTANCE_KEY,
  ENQUIRY_SENT_KEY, PART_ASSIGNMENT_KEY, PLANT_ACCEPTANCE_KEY,
  PLANT_SUPPLIER_RESP_KEY, RND_EVAL_KEY, LIVE_QUOTATIONS_KEY,
  DEFAULT_RND_CONTACT,
} from "./mockData"

// ── Column headers (row 4 in template) ────────────────────────────────────
const HEADERS = [
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

function today() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function buildNPDRow(npd: NPDRecord): string[] {
  const dispatches  = readKey<Record<string, any>>(SUPPLIER_DISPATCH_KEY, {})
  const delivDetails= readKey<Record<string, any>>(DELIVERY_DETAILS_KEY, {})
  const plantSupp   = readKey<Record<string, any>>(PLANT_SUPPLIER_RESP_KEY, {})
  const plantAccept = readKey<Record<string, any>>(PLANT_ACCEPTANCE_KEY, {})
  const parts       = readKey<Record<string, any>>(PART_ASSIGNMENT_KEY, {})
  const rndEvals    = readKey<Record<string, any>>(RND_EVAL_KEY, {})
  const liveQ       = readKey<Record<string, any>>(LIVE_QUOTATIONS_KEY, {})
  const enquiries   = readKey<Record<string, string[]>>(ENQUIRY_SENT_KEY, {})

  const d  = dispatches[npd.id]
  const dd = delivDetails[npd.id]
  const ps = plantSupp[npd.id]
  const pa = plantAccept[npd.id]
  const pt = parts[npd.id]
  const re = rndEvals[npd.id]
  const npdLiveQ: Record<string, any> = liveQ[npd.id] ?? {}
  const rfqDate = enquiries[npd.id]?.[0] ? today() : "—"

  // Supplier's committed sample submission date (from live quotation)
  const firstQuote = Object.values(npdLiveQ)[0] as any
  const committedDate = firstQuote?.formValues?.["Dispatch Date"] ?? firstQuote?.formValues?.dispatch_date ?? "—"

  // Test type from test results
  const testType = re?.tests ? Object.values(re.tests).map((t: any) => t.testType).filter(Boolean).join(", ") : "—"

  // Verdict
  const verdict = pa?.verdict === "accepted" ? "Approved" : pa?.verdict === "not_good" ? "Not Approved" : npd.stage >= 7 ? "Pending" : "—"

  const dispatchDate = d?.dispatchDate ?? "—"
  const sampleQty    = d ? String(ps?.sampleQty ?? dd?.requiredQty ?? "—") : "—"
  const arrivalDate  = pa?.verdictAt ?? ps?.submittedAt ?? "—"
  const rfqDateStr   = enquiries[npd.id] ? today() : "—"

  return [
    npd.id,                                                           // 1  Project ID
    today(),                                                          // 2  Request Date
    npd.rAndDDivision,                                                // 3  Location
    dd?.location ?? npd.rAndDDivision,                               // 4  Sample Required Location
    npd.spoc,                                                         // 5  Owner / SPOC
    "Internal",                                                       // 6  Customer Specific
    npd.productLine,                                                  // 7  Customer Name
    npd.itemName,                                                     // 8  Project Details
    "—",                                                              // 9  Dwg No.
    "—",                                                              // 10 Dwg Release Date
    "—",                                                              // 11 Revision
    npd.itemName,                                                     // 12 Item Name
    npd.itemCategory,                                                 // 13 Item Category
    "Not Attached",                                                   // 14 Spec Sheet
    "—",                                                              // 15 Library
    String(npd.totalTat) + " days",                                  // 16 Desired Date (TAT)
    dd?.requiredQty ?? "—",                                          // 17 Desired Qty
    npd.typeOfWork,                                                   // 18 Trigger Request
    npd.spoc,                                                         // 19 Allocation to NPD
    rfqDateStr,                                                       // 20 RFQ Date
    "—",                                                              // 21 Trigger Acceptance
    npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : "—", // 22 Allocated Supplier
    npd.supplier && npd.supplier !== "Pending Assignment" ? npd.supplier : "—", // 23 Supplier Name
    "—",                                                              // 24 Supplier Email
    committedDate !== "—" ? "Yes" : "—",                             // 25 Supplier Confirmation
    committedDate !== "—" ? "Accepted" : "—",                        // 26 Acceptance
    committedDate,                                                    // 27 Sample Submission Date (Committed)
    "No",                                                             // 28 Tool / Jig Required
    String(npd.totalTat),                                            // 29 Lead Time (Days)
    sampleQty,                                                        // 30 Sample Qty
    dispatchDate,                                                     // 31 Dispatch Date (Actual)
    d ? String(npd.totalTat - npd.tatDaysRemaining) : "—",           // 32 TAT from Allocation
    arrivalDate,                                                      // 33 Arrival Date
    npd.stageName,                                                    // 34 Status
    DEFAULT_RND_CONTACT.name,                                        // 35 R&D SPOC
    re?.startedAt ?? "—",                                            // 36 Test Start Date
    "—",                                                              // 37 Test Schedule
    testType,                                                         // 38 Test Type
    "No",                                                             // 39 3rd Party Test
    "—",                                                              // 40 Schedule (Date)
    "—",                                                              // 41 Est. Date of Report
    verdict,                                                          // 42 Approved / Not Approved
    pa?.verdict === "accepted" ? today() : "—",                      // 43 Approval Report Date
    pa?.verdict === "not_good" ? today() : "—",                      // 44 Rejection Inform Date
    pt?.partNumber ?? "—",                                           // 45 Part Code No.
    npd.cost != null ? `₹ ${npd.cost.toFixed(2)}` : "—",            // 46 Cost from AICM
  ]
}

export function downloadMISReport(npds: NPDRecord[], filename = "NPD_Sourcing_Tracker_MIS.xlsx") {
  const rows = npds.map(buildNPDRow)

  const wsData: (string | number)[][] = [
    ["AMBER ENTERPRISES INDIA LIMITED"],
    ["NPD SOURCING TRACKER & MIS REPORT — FY 2025-26"],
    [],
    HEADERS,
    ...rows,
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Column widths
  ws["!cols"] = HEADERS.map((h, i) => ({
    wch: [14, 14, 18, 22, 18, 14, 20, 28, 12, 14, 10, 24, 22, 14, 12,
          16, 12, 18, 18, 14, 16, 22, 22, 22, 20, 14, 24, 16, 14, 12,
          20, 18, 16, 18, 18, 16, 16, 20, 18, 14, 20, 18, 22, 24, 18, 20][i] ?? 16,
  }))

  // Row heights
  ws["!rows"] = [{ hpt: 18 }, { hpt: 18 }, { hpt: 6 }, { hpt: 30 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "NPD Tracker_ MIS")
  XLSX.writeFile(wb, filename)
}
