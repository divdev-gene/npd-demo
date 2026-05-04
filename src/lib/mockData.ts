export type NPDRecord = {
  id: string;
  itemName: string;
  itemCategory: string;
  productLine: string;
  typeOfWork: string;
  rAndDDivision: string;
  stage: number;
  stageName: string;
  tatHealth: "green" | "amber" | "red" | "black";
  tatDaysRemaining: number;
  totalTat: number;
  spoc: string;
  supplier: string;
  priority: string;
  gradeA: boolean;
  tqrScore: any;
  cost: number | null;
  division?: string;
  raisedBy?: string;
  driveLink?: string;
};

export const SPOC_NAMES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi"];

export const VENDOR_EMAIL = "divyanshchawla12@gmail.com";

export type VendorRecord = {
  name: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  commodityMatch: number;
  auditScore: number;
  certifications: string[];
  status: "verified" | "audit_overdue" | "new";
};

export const VENDOR_RFQ_TEMPLATE_KEY = "vendor_rfq_template_v1";
export const DEFAULT_RFQ_TEMPLATE = `Subject: URGENT QUOTE REQUIRED: {npd_id} — {item_name}

Dear {vendor_name},

Amber Enterprises is initiating new product development for the following requirement:

  Item: {item_name}
  Commodity: {commodity}
  NPD ID: {npd_id}
  Drawing Folder: {drawing_link}

Please submit your quotation via the portal link below:

{portal_link}

This link is valid until {valid_until}. Kindly respond at the earliest.

Regards,
Amber Sourcing Operations`;

export const VENDOR_CATALOG: Record<string, VendorRecord[]> = {
  // ── Used by mock NPDs (full category names) ────────────────────────────────
  "Commodity-Based Component Development": [
    { name: "Tubetech India Pvt Ltd",      tier: "Tier 1", commodityMatch: 100, auditScore: 94, certifications: ["ISO 9001:2015", "IATF 16949"],          status: "verified"      },
    { name: "MetalWorks India",             tier: "Tier 1", commodityMatch: 92,  auditScore: 89, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "Alpha Component Systems",      tier: "Tier 2", commodityMatch: 86,  auditScore: 78, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "National Metalfabs",           tier: "Tier 2", commodityMatch: 81,  auditScore: 71, certifications: [],                                       status: "audit_overdue" },
    { name: "Supreme Plastics Ltd",         tier: "Tier 2", commodityMatch: 74,  auditScore: 65, certifications: [],                                       status: "new"           },
  ],
  "Compliance & Regulatory": [
    { name: "TUV SUD India",               tier: "Tier 1", commodityMatch: 100, auditScore: 99, certifications: ["NABL Accredited", "ISO 17025"],         status: "verified"      },
    { name: "Bureau Veritas",              tier: "Tier 1", commodityMatch: 97,  auditScore: 97, certifications: ["NABL Accredited", "ISO 17025"],         status: "verified"      },
    { name: "SGS India Pvt Ltd",           tier: "Tier 2", commodityMatch: 91,  auditScore: 88, certifications: ["Accredited Body"],                     status: "verified"      },
  ],

  // ── Used by new-request form (commodity short names) ──────────────────────
  "Plastics": [
    { name: "Supreme Plastics Ltd",         tier: "Tier 1", commodityMatch: 96,  auditScore: 91, certifications: ["ISO 9001:2015", "IATF 16949"],          status: "verified"      },
    { name: "Hindustan Polymers Pvt Ltd",   tier: "Tier 1", commodityMatch: 88,  auditScore: 83, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "Pioneer Moulding Co.",         tier: "Tier 2", commodityMatch: 79,  auditScore: 72, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "Unique Polymers India",        tier: "Tier 3", commodityMatch: 65,  auditScore: 58, certifications: [],                                       status: "new"           },
  ],
  "Sheet Metal": [
    { name: "MetalWorks India",             tier: "Tier 1", commodityMatch: 97,  auditScore: 92, certifications: ["ISO 9001:2015", "IATF 16949"],          status: "verified"      },
    { name: "Precision Stampings Ltd",      tier: "Tier 1", commodityMatch: 91,  auditScore: 86, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "Alpha Component Systems",      tier: "Tier 2", commodityMatch: 82,  auditScore: 74, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "Bright Steel Works",           tier: "Tier 2", commodityMatch: 70,  auditScore: 63, certifications: [],                                       status: "audit_overdue" },
  ],
  "Electronics & Electrical": [
    { name: "MicroElectrix Systems",        tier: "Tier 1", commodityMatch: 98,  auditScore: 91, certifications: ["ISO 9001:2015", "UL Listed", "CE Mark"], status: "verified"     },
    { name: "Shenzhen Optoelectronics",     tier: "Tier 2", commodityMatch: 90,  auditScore: 83, certifications: ["CE Mark", "RoHS Compliant"],            status: "verified"      },
    { name: "Synapse Electronics Pvt Ltd",  tier: "Tier 2", commodityMatch: 76,  auditScore: 68, certifications: [],                                       status: "audit_overdue" },
    { name: "Rexnord Controls India",       tier: "Tier 3", commodityMatch: 67,  auditScore: 59, certifications: [],                                       status: "new"           },
  ],
  "Compressors & Motors": [
    { name: "Tecumseh India Ltd",           tier: "Tier 1", commodityMatch: 99,  auditScore: 95, certifications: ["ISO 9001:2015", "IATF 16949"],          status: "verified"      },
    { name: "Emerson Electric India",       tier: "Tier 1", commodityMatch: 96,  auditScore: 93, certifications: ["ISO 9001:2015", "UL Listed"],           status: "verified"      },
    { name: "GD Midea Compressor Co.",      tier: "Tier 2", commodityMatch: 88,  auditScore: 81, certifications: ["CE Mark"],                             status: "verified"      },
    { name: "Kirloskar Electric Ltd",       tier: "Tier 2", commodityMatch: 83,  auditScore: 76, certifications: ["ISO 9001:2015"],                        status: "verified"      },
  ],
  "Packaging & Others": [
    { name: "Packwell Solutions",           tier: "Tier 1", commodityMatch: 96,  auditScore: 88, certifications: ["ISO 9001:2015", "FSC Certified"],       status: "verified"      },
    { name: "PrintPack Industries",         tier: "Tier 2", commodityMatch: 84,  auditScore: 75, certifications: ["ISO 9001:2015"],                        status: "verified"      },
    { name: "GreenPack Co.",                tier: "Tier 3", commodityMatch: 70,  auditScore: 62, certifications: [],                                       status: "new"           },
  ],
  "Others": [
    { name: "MultiSource India Pvt Ltd",    tier: "Tier 2", commodityMatch: 72,  auditScore: 67, certifications: [],                                       status: "new"           },
    { name: "General Component Suppliers",  tier: "Tier 3", commodityMatch: 60,  auditScore: 55, certifications: [],                                       status: "new"           },
  ],
};

export type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "file" | "textarea";
  required: boolean;
  options?: string[];
};

export const SUPPLIER_FORM_DEFAULTS: FormQuestion[] = [
  { id: "q1",  label: "Dispatch Date",                           type: "date",     required: true  },
  { id: "q2",  label: "Number of Samples",                       type: "number",   required: true  },
  { id: "q3",  label: "Unit Cost per Piece (₹)",                 type: "number",   required: true  },
  { id: "q4",  label: "Tooling Cost (₹)",                        type: "number",   required: false },
  { id: "q5",  label: "Primary Packaging Cost (₹/unit)",         type: "number",   required: false },
  { id: "q6",  label: "Secondary Packaging Cost (₹/unit)",       type: "number",   required: false },
  { id: "q7",  label: "Transit Packaging Cost (₹/unit)",         type: "number",   required: false },
  { id: "q8",  label: "Estimated Transport Cost per Unit (₹)",   type: "number",   required: false },
  { id: "q9",  label: "Confirmed MOQ",                           type: "number",   required: true  },
  { id: "q10", label: "Payment Terms",                           type: "select",   required: true,
    options: ["30 Days Credit", "60 Days Credit", "90 Days Credit", "LC", "Advance Payment"] },
  { id: "q11", label: "Delivery Lead Time (days)",               type: "number",   required: false },
  { id: "q12", label: "Quality Certificates & Test Reports",     type: "file",     required: true  },
];

export const SUPPLIER_FORM_KEY      = "supplier_form_config_v1";
export const SUPPLIER_DOCS_KEY      = "supplier_submitted_docs_v1";
export const COMPOSED_EMAILS_KEY    = "composed_emails_v1";
export const VENDOR_STATUS_KEY        = "vendor_status_v1";
export const VENDOR_DATE_APPROVAL_KEY = "vendor_date_approval_v1";

export type VendorStatusResponse = {
  vendorName:  string;
  onTime:      boolean;
  newDate?:    string;
  notes?:      string;
  respondedAt: string;
};

export const DEFAULT_STATUS_TEMPLATE = `Subject: Dispatch Status Check — {npd_id} | {item_name}

Dear {vendor_name},

This is a reminder regarding your quotation for {npd_id} — {item_name}.

Your committed dispatch date: {dispatch_date}

Please confirm whether you are on track to meet this date using the link below:

{status_link}

Regards,
Amber Sourcing Operations`;

export const VENDOR_STATUS_TEMPLATE_KEY = "vendor_status_template_v1";

export const SAMPLE_RECEIPT_KEY = "sample_receipt_v1";
export const MRN_APPROVAL_KEY   = "mrn_approval_v1";
export const FPA_DATA_KEY       = "fpa_data_v1";
export const SAMPLE_COST_KEY    = "sample_cost_v1";

export type SupplierDoc = {
  fileName:    string;
  questionLabel: string;
  submittedAt: string;
  sizeMB:      string;
  submittedBy: string;
};

export type VendorQuotation = {
  vendorName:  string;
  tier:        string;
  status:      "submitted" | "pending";
  sampleQty:   number | null;
  supplyDate:  string | null;
  submittedAt: string | null;
};

export const VENDOR_QUOTE_APPROVALS_KEY = "vendor_quote_approvals_v1";
export const ENQUIRY_SENT_KEY           = "enquiry_sent_vendors_v1";
export const LIVE_QUOTATIONS_KEY        = "live_quotations_v1";
export const SUPPLIER_DISPATCH_KEY      = "supplier_dispatch_submitted_v1";
export const DELIVERY_ACCEPTANCE_KEY    = "delivery_acceptance_v1";
export const PART_ASSIGNMENT_KEY        = "part_assignment_v1";
export const PLANT_SUPPLIER_RESP_KEY    = "plant_supplier_response_v1";
export const PLANT_ACCEPTANCE_KEY       = "plant_acceptance_v1";
export const REJECTED_PARTS_KEY         = "rejected_parts_v1";
export const PUSH_NOTIFICATIONS_KEY     = "push_notifications_v1";
export const RND_EVAL_KEY               = "rnd_eval_results_v1";
export const DELIVERY_DETAILS_KEY       = "sourcing_delivery_details_v1";

export const AMBER_PLANTS = [
  "Rajpura Plant (Phase 2)",
  "Jhajjar Plant",
  "Chennai Plant",
  "Pune Plant (Ranjangaon)",
] as const;

export type TestTemplate = {
  testName: string;
  testType: string;
  unit: string;
  expectedRange?: string;
  durationDays: number;
};

export type TestResult = {
  testName: string;
  value: string;
  status: "pass" | "fail" | "pending";
};

export const TEST_TEMPLATES: Record<string, TestTemplate[]> = {
  "Plastics": [
    { testName: "Melt Flow Index",       testType: "Physical",   unit: "g/10min", expectedRange: "8–20",    durationDays: 0.5 },
    { testName: "Tensile Strength",      testType: "Mechanical", unit: "MPa",     expectedRange: "30–60",   durationDays: 0.5 },
    { testName: "Impact Strength",       testType: "Mechanical", unit: "kJ/m²",   expectedRange: "5–15",    durationDays: 0.5 },
    { testName: "Heat Deflection Temp",  testType: "Thermal",    unit: "°C",      expectedRange: "80–120",  durationDays: 0.5 },
    { testName: "Flammability",          testType: "Safety",     unit: "Rating",  expectedRange: "V0/V1",   durationDays: 1   },
  ],
  "Sheet Metal": [
    { testName: "Thickness",             testType: "Dimensional", unit: "mm",     expectedRange: "0.5–2.0", durationDays: 0.2 },
    { testName: "Tensile Strength",      testType: "Mechanical",  unit: "MPa",    expectedRange: "250–400", durationDays: 0.5 },
    { testName: "Hardness",              testType: "Mechanical",  unit: "HRB",    expectedRange: "60–90",   durationDays: 0.3 },
    { testName: "Salt Spray Test",       testType: "Corrosion",   unit: "Hours",  expectedRange: "24–72",   durationDays: 2   },
    { testName: "Coating Adhesion",      testType: "Surface",     unit: "Grade",  expectedRange: "4B–5B",   durationDays: 0.5 },
  ],
  "Electronics & Electrical": [
    { testName: "Insulation Resistance", testType: "Electrical",  unit: "MΩ",     expectedRange: ">100",    durationDays: 0.3 },
    { testName: "High Voltage Test",     testType: "Safety",      unit: "kV",     expectedRange: "1.5–3",   durationDays: 0.3 },
    { testName: "Functional Test",       testType: "Functional",  unit: "Pass/Fail",                        durationDays: 1   },
    { testName: "Thermal Cycling",       testType: "Reliability", unit: "Cycles", expectedRange: "100–500", durationDays: 2   },
    { testName: "EMI/EMC",               testType: "Compliance",  unit: "Pass/Fail",                        durationDays: 2   },
  ],
  "Compressors & Motors": [
    { testName: "Performance Test",      testType: "Functional",  unit: "COP",    expectedRange: "2.5–4",   durationDays: 1   },
    { testName: "Noise Level",           testType: "NVH",         unit: "dB",     expectedRange: "40–65",   durationDays: 0.5 },
    { testName: "Leak Test",             testType: "Quality",     unit: "ppm",    expectedRange: "<10",     durationDays: 0.5 },
    { testName: "Power Consumption",     testType: "Electrical",  unit: "Watts",                            durationDays: 0.5 },
    { testName: "Endurance Test",        testType: "Reliability", unit: "Hours",  expectedRange: "500–2000",durationDays: 10  },
  ],
  "Packaging & Others": [
    { testName: "Drop Test",             testType: "Mechanical",  unit: "Pass/Fail",                        durationDays: 0.5 },
    { testName: "Compression Test",      testType: "Mechanical",  unit: "N",      expectedRange: "500–2000",durationDays: 0.5 },
    { testName: "Vibration Test",        testType: "Transport",   unit: "Hours",  expectedRange: "2–6",     durationDays: 1   },
    { testName: "Burst Strength",        testType: "Material",    unit: "kPa",    expectedRange: "200–600", durationDays: 0.5 },
    { testName: "Environmental Test",    testType: "Reliability", unit: "Pass/Fail",                        durationDays: 2   },
  ],
  "Others": [
    { testName: "Visual Inspection",     testType: "Quality",     unit: "Pass/Fail",                        durationDays: 0.2 },
    { testName: "Dimensional Check",     testType: "QC",          unit: "mm",                               durationDays: 0.5 },
    { testName: "Material Verification", testType: "Chemical",    unit: "%",                                durationDays: 1   },
  ],
};

export const getTestsByCategory = (category: string): TestTemplate[] =>
  TEST_TEMPLATES[category] || [];

export const getTotalTestDays = (category: string): number =>
  (TEST_TEMPLATES[category] || []).reduce((sum, t) => sum + t.durationDays, 0);

export type PushNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  to: string;
  npdId: string;
  icon: "alert" | "check" | "mail" | "package";
  read: boolean;
};

export type LiveQuotation = {
  vendorName:         string;
  status:             "submitted" | "re_negotiation";
  formValues:         Record<string, string>;
  submittedAt:        string;
  revisionCount:      number;
  feasible?:          boolean;   // undefined = legacy record; treat as feasible
  query?:             string;    // clarification query raised by supplier when not feasible
  reNegotiationMsg?:  string;
  reNegotiationAt?:   string;
  rndReply?:          string;    // RND's text reply to a feasibility denial query
  rndReplyDoc?:       string;    // optional uploaded doc filename
  rndRepliedAt?:      string;    // timestamp of RND's reply
  queryHistory?:      Array<{ query: string; rndReply: string; rndReplyDoc?: string; repliedAt?: string }>;
};

export type ContactInfo = {
  name:  string;
  email: string;
  phone: string;
};

// Replace with fetchSpocContact(spocId) when connecting to DB
export const SPOC_CONTACTS: Record<string, ContactInfo> = {
  "Rahul Sharma": { name: "Rahul Sharma",  email: "rahul.sharma@amber.com",  phone: "+91 98100 11223" },
  "Karan Mehta":  { name: "Karan Mehta",   email: "karan.mehta@amber.com",   phone: "+91 98100 44556" },
  "Priya Rajan":  { name: "Priya Rajan",   email: "priya.rajan@amber.com",   phone: "+91 98100 77889" },
  "Amit Kumar":   { name: "Amit Kumar",    email: "amit.kumar@amber.com",    phone: "+91 98100 22334" },
  "Varun Joshi":  { name: "Varun Joshi",   email: "varun.joshi@amber.com",   phone: "+91 98100 55667" },
};

// Replace with fetchRndContact(raisedById) when connecting to DB
export const DEFAULT_RND_CONTACT: ContactInfo = {
  name:  "Ankit Jain",
  email: "ankit.jain@amber.com",
  phone: "+91 98100 99001",
};

export const DEFAULT_RND_HEAD: ContactInfo = {
  name:  "Harshit Kumar",
  email: "harshit.kumar@amber.com",
  phone: "+91 98100 88002",
};

export const NPD_STAGES = [
  "Request Initialisation",        // 1
  "Supplier Sourcing & Quotation", // 2
  "Supplier Dispatch",             // 3
  "RND Evaluation",                // 4
  "RND Testing & TQR",             // 5
  "RND Approval",                  // 6
  "Plant Delivery Acceptance",     // 7
  "NPD Summary & Closure",         // 8
] as const
export const TOTAL_NPD_STAGES = 8
export const AICM_FETCH_KEY = "aicm_fetch_v1"

export const MOCK_VENDOR_QUOTATIONS: Record<string, VendorQuotation[]> = {
  "NPD-FY-2026-0012": [
    { vendorName: "Tubetech India Pvt Ltd",      tier: "Tier 1", status: "submitted", sampleQty: 5,  supplyDate: "15 May 2026", submittedAt: "14 Apr 2026" },
    { vendorName: "Alpha Component Systems",     tier: "Tier 2", status: "submitted", sampleQty: 3,  supplyDate: "20 May 2026", submittedAt: "15 Apr 2026" },
    { vendorName: "National Metalfabs",          tier: "Tier 2", status: "pending",   sampleQty: null, supplyDate: null,          submittedAt: null },
  ],
  "NPD-FY-2026-0014": [
    { vendorName: "MicroElectrix Systems",       tier: "Tier 1", status: "submitted", sampleQty: 10, supplyDate: "10 May 2026", submittedAt: "18 Apr 2026" },
    { vendorName: "Shenzhen Optoelectronics",    tier: "Tier 2", status: "submitted", sampleQty: 8,  supplyDate: "22 May 2026", submittedAt: "19 Apr 2026" },
    { vendorName: "Synapse Electronics Pvt Ltd", tier: "Tier 2", status: "pending",   sampleQty: null, supplyDate: null,          submittedAt: null },
  ],
  "NPD-FY-2026-0027": [
    { vendorName: "Shenzhen Optoelectronics",    tier: "Tier 2", status: "submitted", sampleQty: 6,  supplyDate: "28 May 2026", submittedAt: "22 Apr 2026" },
    { vendorName: "MicroElectrix Systems",       tier: "Tier 1", status: "pending",   sampleQty: null, supplyDate: null,          submittedAt: null },
    { vendorName: "Rexnord Controls India",      tier: "Tier 3", status: "pending",   sampleQty: null, supplyDate: null,          submittedAt: null },
  ],
  "NPD-FY-2026-0018": [
    { vendorName: "Packwell Solutions",          tier: "Tier 1", status: "submitted", sampleQty: 20, supplyDate: "12 May 2026", submittedAt: "24 Apr 2026" },
    { vendorName: "PrintPack Industries",        tier: "Tier 2", status: "submitted", sampleQty: 15, supplyDate: "18 May 2026", submittedAt: "25 Apr 2026" },
  ],
  "NPD-FY-2026-0029": [
    { vendorName: "MicroElectrix Systems",       tier: "Tier 1", status: "pending",   sampleQty: null, supplyDate: null, submittedAt: null },
    { vendorName: "Shenzhen Optoelectronics",    tier: "Tier 2", status: "pending",   sampleQty: null, supplyDate: null, submittedAt: null },
  ],
};

export const MOCK_SUPPLIER_DOCS: Record<string, SupplierDoc[]> = {
  "NPD-FY-2026-0012": [
    { fileName: "ISO_9001_2015_Certificate.pdf",          questionLabel: "Quality Certificates & Test Reports", submittedAt: "14 Apr 2026", sizeMB: "2.3", submittedBy: "Tubetech India Pvt Ltd" },
    { fileName: "Material_Test_Report_CopperTube_Q1.pdf", questionLabel: "Quality Certificates & Test Reports", submittedAt: "14 Apr 2026", sizeMB: "1.1", submittedBy: "Tubetech India Pvt Ltd" },
  ],
  "NPD-FY-2026-0014": [
    { fileName: "CE_Mark_Certificate_BLDC.pdf",         questionLabel: "Quality Certificates & Test Reports", submittedAt: "18 Apr 2026", sizeMB: "3.2", submittedBy: "MicroElectrix Systems"   },
    { fileName: "UL_Listing_Cert_Controller.pdf",       questionLabel: "Quality Certificates & Test Reports", submittedAt: "18 Apr 2026", sizeMB: "1.8", submittedBy: "MicroElectrix Systems"   },
    { fileName: "Sample_Test_Report_Rev2.pdf",          questionLabel: "Quality Certificates & Test Reports", submittedAt: "20 Apr 2026", sizeMB: "4.5", submittedBy: "MicroElectrix Systems"   },
    { fileName: "Dimensional_Inspection_Report.xlsx",   questionLabel: "Quality Certificates & Test Reports", submittedAt: "21 Apr 2026", sizeMB: "0.8", submittedBy: "Shenzhen Optoelectronics"},
  ],
  "NPD-FY-2026-0005": [
    { fileName: "ISO_9001_Certificate_AeroDyn.pdf",     questionLabel: "Quality Certificates & Test Reports", submittedAt: "10 Mar 2026", sizeMB: "2.1", submittedBy: "AeroDynamics Plastics"   },
    { fileName: "IATF_16949_Certificate.pdf",           questionLabel: "Quality Certificates & Test Reports", submittedAt: "10 Mar 2026", sizeMB: "1.9", submittedBy: "AeroDynamics Plastics"   },
    { fileName: "FPA_Approval_Dimensional_Report.pdf",  questionLabel: "Quality Certificates & Test Reports", submittedAt: "25 Mar 2026", sizeMB: "6.2", submittedBy: "AeroDynamics Plastics"   },
    { fileName: "PP_Lot_Pricing_Sheet_v3.xlsx",         questionLabel: "Quality Certificates & Test Reports", submittedAt: "15 Apr 2026", sizeMB: "0.5", submittedBy: "AeroDynamics Plastics"   },
  ],
  "NPD-FY-2026-0027": [
    { fileName: "CE_RoHS_Certificate_LEDPanel.pdf",     questionLabel: "Quality Certificates & Test Reports", submittedAt: "22 Apr 2026", sizeMB: "2.7", submittedBy: "Shenzhen Optoelectronics" },
  ],
  "NPD-FY-2026-0018": [
    { fileName: "ISO_9001_Packwell.pdf",                questionLabel: "Quality Certificates & Test Reports", submittedAt: "24 Apr 2026", sizeMB: "1.8", submittedBy: "Packwell Solutions"       },
    { fileName: "FSC_Certificate_Packwell.pdf",         questionLabel: "Quality Certificates & Test Reports", submittedAt: "24 Apr 2026", sizeMB: "0.9", submittedBy: "Packwell Solutions"       },
    { fileName: "ISO_9001_PrintPack.pdf",               questionLabel: "Quality Certificates & Test Reports", submittedAt: "25 Apr 2026", sizeMB: "1.4", submittedBy: "PrintPack Industries"     },
  ],
};

export const mockNPDs: NPDRecord[] = [
  {
    id: "NPD-FY-2026-0012",
    itemName: "Copper Header Tube",
    itemCategory: "Commodity-Based Component Development",
    productLine: "Room Air Conditioners",
    typeOfWork: "New Component Development (NCD)",
    rAndDDivision: "Rajpura Grade A",
    stage: 3,
    stageName: "Supplier Dispatch",
    tatHealth: "amber",
    tatDaysRemaining: 3,
    totalTat: 45,
    spoc: "Rahul Sharma",
    supplier: "Tubetech India Pvt Ltd",
    priority: "Normal",
    gradeA: false,
    tqrScore: null,
    cost: null,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-copper-header-tube"
  },
  {
    id: "NPD-FY-2026-0014",
    itemName: "BLDC Motor Controller",
    itemCategory: "Electronics & Electrical",
    productLine: "Commercial Air Conditioners",
    typeOfWork: "New Component Development (NCD)",
    rAndDDivision: "Rajpura Commercial",
    stage: 5,
    stageName: "RND Testing & TQR",
    tatHealth: "green",
    tatDaysRemaining: 1,
    totalTat: 45,
    spoc: "Priya Rajan",
    supplier: "MicroElectrix Systems",
    priority: "High",
    gradeA: true,
    tqrScore: { t: 8, q: 9, r: 8, composite: 8.3 },
    cost: 1450.0,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-bldc-motor-controller"
  },
  {
    id: "NPD-FY-2026-0018",
    itemName: "Transit Packaging - 2Ton RAC",
    itemCategory: "Packaging & Others",
    productLine: "Room Air Conditioners",
    typeOfWork: "Engineering Change Notice (ECN)",
    rAndDDivision: "Jhajjhar RAC",
    stage: 3,
    stageName: "Sourcing Impact Assessment",
    tatHealth: "red",
    tatDaysRemaining: 0,
    totalTat: 5,
    spoc: "Varun Joshi",
    supplier: "Packwell Solutions",
    priority: "Normal",
    gradeA: false,
    tqrScore: null,
    cost: null,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-transit-packaging"
  },
  {
    id: "NPD-FY-2026-0021",
    itemName: "WPC Certification Module",
    itemCategory: "Compliance & Regulatory",
    productLine: "Air Purifiers",
    typeOfWork: "Compliance / Regulatory",
    rAndDDivision: "Air Purifier Division",
    stage: 4,
    stageName: "Document Submission",
    tatHealth: "green",
    tatDaysRemaining: 12,
    totalTat: 30,
    spoc: "Priya Rajan",
    supplier: "TUV SUD India",
    priority: "Critical",
    gradeA: false,
    tqrScore: null,
    cost: null,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-wpc-certification"
  },
  {
    id: "NPD-FY-2026-0005",
    itemName: "Fan Blade Assembly",
    itemCategory: "Commodity-Based Component Development",
    productLine: "Tower ACs",
    typeOfWork: "New Component Development (NCD)",
    rAndDDivision: "Sricity RAC",
    stage: 6,
    stageName: "RND Approval",
    tatHealth: "green",
    tatDaysRemaining: 1,
    totalTat: 45,
    spoc: "Rahul Sharma",
    supplier: "AeroDynamics Plastics",
    priority: "Normal",
    gradeA: false,
    tqrScore: { t: 9, q: 8, r: 9, composite: 8.7 },
    cost: 320.5,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-fan-blade-assembly"
  },
  {
    id: "NPD-FY-2026-0008",
    itemName: "Compressor Heat Shield",
    itemCategory: "Commodity-Based Component Development",
    productLine: "Commercial Air Conditioners",
    typeOfWork: "PP (Pre-Production) Repeat",
    rAndDDivision: "Rajpura Commercial",
    stage: 2,
    stageName: "Supplier Sourcing & Quotation",
    tatHealth: "green",
    tatDaysRemaining: 2,
    totalTat: 5,
    spoc: "Rahul Sharma",
    supplier: "MetalWorks India",
    priority: "Normal",
    gradeA: false,
    tqrScore: null,
    cost: 115.0,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-compressor-heat-shield"
  },
  {
    id: "NPD-FY-2026-0027",
    itemName: "LED Display Panel",
    itemCategory: "Electronics & Electrical",
    productLine: "Water Dispensers",
    typeOfWork: "New Component Development (NCD)",
    rAndDDivision: "Water Purifier Division",
    stage: 3,
    stageName: "Supplier Dispatch",
    tatHealth: "black",
    tatDaysRemaining: -2,
    totalTat: 45,
    spoc: "Priya Rajan",
    supplier: "Shenzhen Optoelectronics",
    priority: "High",
    gradeA: true,
    tqrScore: null,
    cost: null,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-led-display-panel"
  },
  {
    id: "NPD-FY-2026-0029",
    itemName: "BLDC Inverter Module",
    itemCategory: "Electronics & Electrical",
    productLine: "Commercial Air Conditioners",
    typeOfWork: "New Component Development (NCD)",
    rAndDDivision: "Rajpura Commercial",
    stage: 2,
    stageName: "Supplier Sourcing & Quotation",
    tatHealth: "green",
    tatDaysRemaining: 10,
    totalTat: 45,
    spoc: "Priya Rajan",
    supplier: "MicroElectrix Systems",
    priority: "High",
    gradeA: true,
    tqrScore: null,
    cost: null,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-bldc-inverter-module"
  },
  {
    id: "NPD-FY-2026-0028",
    itemName: "Sheet Metal Bracket",
    itemCategory: "Sheet Metal",
    productLine: "Room Air Conditioners",
    typeOfWork: "New Component Development (NCD)",
    rAndDDivision: "Rajpura Grade A",
    stage: 4,
    stageName: "RND Evaluation",
    tatHealth: "amber",
    tatDaysRemaining: 4,
    totalTat: 45,
    spoc: "Rahul Sharma",
    supplier: "MetalWorks India",
    priority: "Normal",
    gradeA: false,
    tqrScore: null,
    cost: null,
    raisedBy: "rnd_user",
    driveLink: "https://drive.google.com/drive/folders/mock-sheet-metal-bracket"
  }
];

export const getStageName = (stage: number, type: string) => {
  if (type === "Engineering Change Notice (ECN)") {
    const ecnStages = [
      "ECN Request Initiation", "R&D Change Validation", "Sourcing Impact Assessment",
      "Supplier Acknowledgement", "Sample Re-submission", "R&D Validation on Changed Parameters",
      "Partial TQR", "ECN Approval", "AICM Cost Update", "ECN Closure"
    ];
    return ecnStages[stage - 1] || "Unknown";
  }

  if (type === "Compliance / Regulatory") {
    const compStages = [
      "Initiation", "Evaluation", "Lab Assignment",
      "Document Submission", "Certification Verification", "Closure"
    ];
    return compStages[stage - 1] || "Unknown";
  }

  return NPD_STAGES[stage - 1] ?? "Unknown";
};
