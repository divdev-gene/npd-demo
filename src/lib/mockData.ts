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
  prtdScore: any;
  cost: number | null;
  division?: string;
};

export const mockNPDs: NPDRecord[] = [
  {
    id: "NPD-FY-2026-0012",
    itemName: "Copper Header Tube",
    itemCategory: "Commodity-Based Component Development",
    productLine: "Room Air Conditioners",
    typeOfWork: "New Tool Development (NTD)",
    rAndDDivision: "Rajpura Grade A",
    stage: 6,
    stageName: "Sample Submission",
    tatHealth: "amber",
    tatDaysRemaining: 3,
    totalTat: 45,
    spoc: "Rahul Sharma",
    supplier: "Tubetech India Pvt Ltd",
    priority: "Normal",
    gradeA: false,
    prtdScore: null,
    cost: null
  },
  {
    id: "NPD-FY-2026-0014",
    itemName: "BLDC Motor Controller",
    itemCategory: "Electronics & Electrical",
    productLine: "Commercial Air Conditioners",
    typeOfWork: "New Tool Development (NTD)",
    rAndDDivision: "Rajpura Commercial",
    stage: 10,
    stageName: "Approval / Reject / Hold",
    tatHealth: "green",
    tatDaysRemaining: 1,
    totalTat: 45,
    spoc: "Aditi Verma",
    supplier: "MicroElectrix Systems",
    priority: "High",
    gradeA: true,
    prtdScore: { p: 8, r: 9, t: 7, d: 8, composite: 8.0 },
    cost: 1450.0
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
    spoc: "Sandeep Kumar",
    supplier: "Packwell Solutions",
    priority: "Normal",
    gradeA: false,
    prtdScore: null,
    cost: null
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
    spoc: "Priya Singh",
    supplier: "TUV SUD",
    priority: "Critical",
    gradeA: false,
    prtdScore: null,
    cost: null
  },
  {
    id: "NPD-FY-2026-0005",
    itemName: "Fan Blade Assembly",
    itemCategory: "Commodity-Based Component Development",
    productLine: "Tower ACs",
    typeOfWork: "New Tool Development (NTD)",
    rAndDDivision: "Sricity RAC",
    stage: 12,
    stageName: "Final Price + PP Production Handover",
    tatHealth: "green",
    tatDaysRemaining: 1,
    totalTat: 45,
    spoc: "Rahul Sharma",
    supplier: "AeroDynamics Plastics",
    priority: "Normal",
    gradeA: false,
    prtdScore: { p: 9, r: 8, t: 9, d: 9, composite: 8.75 },
    cost: 320.5
  },
  {
    id: "NPD-FY-2026-0008",
    itemName: "Compressor Heat Shield",
    itemCategory: "Commodity-Based Component Development",
    productLine: "Commercial Air Conditioners",
    typeOfWork: "PP (Pre-Production) Repeat",
    rAndDDivision: "Rajpura Commercial",
    stage: 2,
    stageName: "GRN & Price Confirmation",
    tatHealth: "green",
    tatDaysRemaining: 2,
    totalTat: 5,
    spoc: "Rahul Sharma",
    supplier: "MetalWorks India",
    priority: "Normal",
    gradeA: false,
    prtdScore: null,
    cost: 115.0
  },
  {
    id: "NPD-FY-2026-0027",
    itemName: "LED Display Panel",
    itemCategory: "Electronics & Electrical",
    productLine: "Water Dispensers",
    typeOfWork: "New Tool Development (NTD)",
    rAndDDivision: "Water Purifier Division",
    stage: 6,
    stageName: "Sample Submission",
    tatHealth: "black",
    tatDaysRemaining: -2,
    totalTat: 45,
    spoc: "Aditi Verma",
    supplier: "Shenzhen Optoelectronics",
    priority: "High",
    gradeA: true,
    prtdScore: null,
    cost: null
  }
];

export const getStageName = (stage: number, type: string) => {
  if (type === "Engineering Change Notice (ECN)") {
    const ecnStages = ["ECN Request Initiation", "R&D Change Validation", "Sourcing Impact Assessment", "Supplier Acknowledgement", "Sample Re-submission", "R&D Validation on Changed Parameters", "Partial PRTD", "ECN Approval", "AICM Cost Update", "ECN Closure"];
    return ecnStages[stage - 1] || "Unknown";
  }
  
  if (type === "Compliance / Regulatory") {
    const compStages = ["Initiation", "Evaluation", "Lab Assignment", "Document Submission", "Certification Verification", "Closure"];
    return compStages[stage - 1] || "Unknown";
  }

  const ntdStages = [
    "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation", 
    "RFD Created & Shared", "Supplier Defense", "Sample Submission",
    "Sample Arrival & GRN", "R&D Testing", "PRTD Evaluation",
    "Approval / Reject / Hold", "Sample Cost Structure", "Final Price + PP"
  ];
  return ntdStages[stage - 1] || "Unknown";
};
