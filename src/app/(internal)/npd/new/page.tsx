"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Wrench, FileEdit, Globe, ShieldCheck, Repeat, Hammer, RefreshCw, Package,
  ChevronRight, ArrowLeft, Mail, CheckCircle, Check,
  Link2, User, Plus, Trash2, ChevronDown, ChevronUp
} from "lucide-react"
import { useNPDs } from "@/lib/npdContext"
import { getStageName, REJECTED_PARTS_KEY, DEFAULT_RND_CONTACT, DEFAULT_RND_HEAD, VENDOR_CATALOG, ECN_STAGE1_KEY, NPD_BUNDLE_KEY } from "@/lib/mockData"

type BundleItem = {
  id: string
  itemName: string
  commodity: string
  customCommodity: string
  driveLink: string
  drawingFile: boolean
  sampleQty: string
  hasRevision: boolean
  revisionNo: string
  cplAttached: boolean
  remarks: string
  expanded: boolean
}

const makeBundleItem = (id: string): BundleItem => ({
  id, itemName: "", commodity: "", customCommodity: "", driveLink: "",
  drawingFile: false, sampleQty: "", hasRevision: false, revisionNo: "",
  cplAttached: false, remarks: "", expanded: true,
})

const WORK_TYPES = [
  { id: "NCD",          title: "New Component Development", short: "NCD",  desc: "Brand new component. Full end-to-end lifecycle.",          icon: Wrench,      tat: 45, stages: 11 },
  { id: "NPD",          title: "New Product Development",   short: "NPD",  desc: "New product development. Full end-to-end lifecycle.",      icon: Package,     tat: 45, stages: 11 },
  { id: "ECN",          title: "Engineering Change Notice",  short: "ECN",  desc: "Change to existing component. Abbreviated flow.",          icon: FileEdit,    tat: 30, stages: 10 },
  { id: "NTD",          title: "New Tool Development",       short: "NTD",  desc: "New tooling / die / fixture development request.",         icon: Hammer,      tat: 45, stages: 10 },
  { id: "Compliance",   title: "Compliance / Regulatory",    short: "COMP", desc: "BIS, QCO, etc. Document-centric flow.",                    icon: ShieldCheck, tat: 30, stages: 6  },
  { id: "ALT_SUPPLIER", title: "Alternative Supplier",       short: "AS",   desc: "Qualify an alternative vendor for an existing component.", icon: RefreshCw,   tat: 30, stages: 6  },
]

const SPOC_NAME_MAP: Record<string, string> = {
  "Plastics":                "Rahul Sharma",
  "Sheet Metal":             "Karan Mehta",
  "Electronics & Electrical":"Priya Rajan",
  "Compressors & Motors":    "Amit Kumar",
  "Packaging & Others":      "Varun Joshi",
  "Others":                  "Rohan Desai",
}

const SPOC_DISPLAY_MAP: Record<string, string> = {
  "Plastics":                "Rahul Sharma · Plastics SPOC",
  "Sheet Metal":             "Karan Mehta · Sheet Metal SPOC",
  "Electronics & Electrical":"Priya Rajan · Electronics SPOC",
  "Compressors & Motors":    "Amit Kumar · Compressors SPOC",
  "Packaging & Others":      "Varun Joshi · Packaging SPOC",
  "Others":                  "Rohan Desai · General & Others SPOC",
}

const TAT_MAP: Record<string, number> = {
  "NCD": 45, "NPD": 45, "ECN": 30, "NTD": 45, "Compliance": 30, "ALT_SUPPLIER": 30,
}

const WORK_TYPE_LABEL: Record<string, string> = {
  "NCD":          "New Component Development (NCD)",
  "NPD":          "New Product Development (NPD)",
  "ECN":          "Engineering Change Notice (ECN)",
  "NTD":          "New Tool Development (NTD)",
  "Compliance":   "Compliance / Regulatory",
  "ALT_SUPPLIER": "Alternative Supplier (AS)",
}

const STEPS = [
  { n: 1, label: "Type of Work" },
  { n: 2, label: "Details & Routing" },
  { n: 3, label: "Review & Dispatch" },
]

export default function NewRequestWizard() {
  const router = useRouter()
  const { addNPD, npds } = useNPDs()

  const [step, setStep]               = useState(1)
  const [typeOfWork, setTypeOfWork]   = useState("")
  const [commodity, setCommodity]     = useState("")
  const [customCommodity, setCustomCommodity] = useState("")
  const [productLine, setProductLine] = useState("")
  const [itemName, setItemName]       = useState("")
  const [driveLink, setDriveLink]     = useState("")
  const [hasRevision, setHasRevision] = useState(false)
  const [revisionNo, setRevisionNo]   = useState("")
  const [prevPartNo, setPrevPartNo]   = useState("")
  const [cplAttached, setCplAttached] = useState(false)
  const [sampleQty,   setSampleQty]   = useState("")
  const [pocRole, setPocRole]               = useState("")
  const [priority, setPriority]             = useState("")
  const [customTat, setCustomTat]           = useState("")
  const [tatDevelopment, setTatDevelopment] = useState("")
  const [tatProduction, setTatProduction]   = useState("")
  const [manufacturingLocation, setManufacturingLocation] = useState("")
  const [remarks, setRemarks]               = useState("")
  const [drawingFile, setDrawingFile]       = useState(false)
  const [existingPartNumber, setExistingPartNumber] = useState("")
  const [rejectedParts, setRejectedParts] = useState<Array<{ npdId: string; partNumber: string; itemName: string; rejectedAt: string }>>([])
  // NPD bundle items
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([makeBundleItem("item-1")])

  const updateBundleItem = (id: string, patch: Partial<BundleItem>) =>
    setBundleItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const addBundleItem = () => {
    if (bundleItems.length >= 5) return
    setBundleItems(prev => [...prev, makeBundleItem(`item-${Date.now()}`)])
  }

  const removeBundleItem = (id: string) => {
    if (bundleItems.length <= 1) return
    setBundleItems(prev => prev.filter(it => it.id !== id))
  }

  // ECN-specific fields
  const [ecnPartNumber, setEcnPartNumber]               = useState("")
  const [ecnPartName, setEcnPartName]                   = useState("")
  const [ecnSupplier, setEcnSupplier]                   = useState("")
  const [ecnChangeDescription, setEcnChangeDescription] = useState("")

  useEffect(() => {
    setPocRole(localStorage.getItem("poc_role") ?? "")
    const raw = localStorage.getItem(REJECTED_PARTS_KEY)
    if (raw) setRejectedParts(JSON.parse(raw))
  }, [])

  const selectedType = WORK_TYPES.find(t => t.id === typeOfWork)
  const isRndUser = pocRole === "rnd_user" || pocRole === "rnd_head"
  const SOURCING_ROLES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi", "Rohan Desai", "sourcing_head"]
  const SOURCING_TYPE_IDS = ["Compliance", "ALT_SUPPLIER"]
  const isSourcingUser = SOURCING_ROLES.includes(pocRole)
  const isTypeAllowed = (typeId: string) => {
    if (pocRole === "super_admin") return true
    if (isSourcingUser) return SOURCING_TYPE_IDS.includes(typeId)
    if (isRndUser) return !SOURCING_TYPE_IDS.includes(typeId)
    return true
  }
  const effectiveCommodity = commodity === "Others" && customCommodity.trim()
    ? customCommodity.trim()
    : commodity

  const handleConfirmDispatch = () => {
    const year = new Date().getFullYear()
    const maxSeq = npds.reduce((max, n) => {
      const m = n.id.match(/NPD-FY-\d+-(\d+)$/)
      const num = m ? parseInt(m[1], 10) : 0
      return Math.max(max, num)
    }, 0)
    const newId = `NPD-FY-${year}-${String(maxSeq + 1).padStart(4, "0")}`
    const workTypeLabel = WORK_TYPE_LABEL[typeOfWork] || typeOfWork
    const raisedBy = localStorage.getItem("poc_role") || "rnd_user"
    const devTat  = Number(tatDevelopment) || 0
    const prodTat = Number(tatProduction)  || 0
    const effectiveTat = devTat + prodTat || Number(customTat)
    const priorityLabel = priority === "P1" ? "Critical" : priority === "P2" ? "High" : "Normal"

    // ── NPD Bundle path ────────────────────────────────────────────────────
    if (typeOfWork === "NPD") {
      // Create parent bundle record
      const itemNames = bundleItems.map(it => it.itemName || "Component").join(", ")
      addNPD({
        id: newId,
        itemName: bundleItems.length === 1 ? (bundleItems[0].itemName || "NPD Bundle") : `${bundleItems.length} NCD items`,
        itemCategory: "NPD Bundle",
        productLine: productLine || "Unspecified",
        typeOfWork: workTypeLabel,
        rAndDDivision: "Rajpura RAC",
        stage: 2,
        stageName: getStageName(2, workTypeLabel),
        tatHealth: "green",
        tatDaysRemaining: effectiveTat,
        totalTat: effectiveTat,
        spoc: "Multiple SPOCs",
        supplier: "Pending Assignment",
        priority: priorityLabel,
        gradeA: false, tqrScore: null, cost: null,
        raisedBy, createdAt: new Date().toISOString(),
        manufacturingLocation: manufacturingLocation || undefined,
        remarks: remarks || undefined,
        tatDevelopment: devTat || undefined,
        tatProduction: prodTat || undefined,
        isBundle: true,
      })

      // Create child NCD records + collect their IDs
      const childIds: string[] = []
      bundleItems.forEach((item, idx) => {
        const childId = `${newId}-NCD-${String(idx + 1).padStart(2, "0")}`
        childIds.push(childId)
        const effCommodity = item.commodity === "Others" && item.customCommodity.trim()
          ? item.customCommodity.trim() : item.commodity
        addNPD({
          id: childId,
          itemName: item.itemName || "New Component",
          itemCategory: effCommodity || "Others",
          productLine: productLine || "Unspecified",
          typeOfWork: "New Component Development (NCD)",
          rAndDDivision: "Rajpura RAC",
          stage: 2,
          stageName: getStageName(2, "New Component Development (NCD)"),
          tatHealth: "green",
          tatDaysRemaining: effectiveTat,
          totalTat: effectiveTat,
          spoc: SPOC_NAME_MAP[item.commodity] || "Rohan Desai",
          supplier: "Pending Assignment",
          priority: priorityLabel,
          gradeA: false, tqrScore: null, cost: null,
          raisedBy, createdAt: new Date().toISOString(),
          manufacturingLocation: manufacturingLocation || undefined,
          tatDevelopment: devTat || undefined,
          tatProduction: prodTat || undefined,
          driveLink: item.driveLink || undefined,
          sampleQty: item.sampleQty ? Number(item.sampleQty) : undefined,
          remarks: item.remarks || undefined,
          revisionNumber: item.hasRevision ? (item.revisionNo || undefined) : undefined,
          parentId: newId,
          bundleItemName: item.itemName || "New Component",
        })
      })

      // Write bundle key
      const raw = localStorage.getItem(NPD_BUNDLE_KEY)
      const all: Record<string, string[]> = raw ? JSON.parse(raw) : {}
      all[newId] = childIds
      localStorage.setItem(NPD_BUNDLE_KEY, JSON.stringify(all))

      router.push('/archive')
      return
    }

    // ── Single-record path (NCD, ECN, Compliance, ALT_SUPPLIER, NTD) ─────
    const isECN = workTypeLabel === "Engineering Change Notice (ECN)"
    const isAltSup = workTypeLabel.includes("Alternative Supplier")
    const startStage = isECN || isAltSup ? 1 : workTypeLabel === "Compliance / Regulatory" ? 3 : 2
    addNPD({
      id: newId,
      itemName: isECN ? (ecnPartName || "ECN Component") : (itemName || "New Component"),
      itemCategory: isECN ? "Engineering Change" : (effectiveCommodity || "Others"),
      productLine: productLine || "Unspecified",
      typeOfWork: workTypeLabel,
      rAndDDivision: "Rajpura RAC",
      stage: startStage,
      stageName: getStageName(startStage, workTypeLabel),
      tatHealth: "green",
      tatDaysRemaining: effectiveTat,
      totalTat: effectiveTat,
      spoc: isECN ? "Rohan Desai" : (SPOC_NAME_MAP[commodity] || "General Sourcing"),
      supplier: isECN ? ecnSupplier : "Pending Assignment",
      priority: priorityLabel,
      gradeA: false,
      tqrScore: null,
      cost: null,
      raisedBy,
      driveLink: driveLink || undefined,
      sampleQty: sampleQty ? Number(sampleQty) : undefined,
      createdAt: new Date().toISOString(),
      manufacturingLocation: manufacturingLocation || undefined,
      remarks: remarks || undefined,
      tatDevelopment: devTat || undefined,
      tatProduction: prodTat || undefined,
      existingPartNumber: existingPartNumber || undefined,
      ecnPartNumber: isECN ? ecnPartNumber : undefined,
      ecnPartName: isECN ? ecnPartName : undefined,
      ecnChangeDescription: isECN ? ecnChangeDescription : undefined,
    })
    if (isECN) {
      const entry = { submittedBy: raisedBy, submittedAt: Date.now() }
      const raw = localStorage.getItem(ECN_STAGE1_KEY)
      const all: Record<string, typeof entry> = raw ? JSON.parse(raw) : {}
      all[newId] = entry
      localStorage.setItem(ECN_STAGE1_KEY, JSON.stringify(all))
    }
    router.push('/archive')
  }

  const tatValid = !!tatDevelopment && !!tatProduction
  const commodityValid = !!commodity && (commodity !== "Others" || !!customCommodity.trim())

  const bundleValid = typeOfWork === "NPD"
    ? (!!productLine && !!manufacturingLocation && !!priority && tatValid &&
       bundleItems.length >= 1 &&
       bundleItems.every(it =>
         !!it.itemName.trim() && !!it.commodity &&
         (it.commodity !== "Others" || !!it.customCommodity.trim()) &&
         !!it.driveLink && it.drawingFile && !!it.sampleQty &&
         (!it.hasRevision || it.cplAttached)
       ))
    : false

  const step2Valid = typeOfWork === "NPD"
    ? bundleValid
    : typeOfWork === "ECN"
    ? (!!ecnPartNumber.trim() && !!ecnPartName.trim() && !!ecnSupplier && !!ecnChangeDescription.trim() && !!priority && !!manufacturingLocation && tatValid)
    : typeOfWork === "NCD"
    ? (!!itemName && commodityValid && !!productLine && !!driveLink && !!drawingFile && !!sampleQty && !!priority && tatValid && !!manufacturingLocation && (!hasRevision || (hasRevision && cplAttached)))
    : typeOfWork === "ALT_SUPPLIER"
    ? (!!itemName && !!productLine && !!driveLink && !!drawingFile && !!priority && tatValid && !!manufacturingLocation && !!existingPartNumber.trim())
    : (!!itemName && commodityValid && !!productLine && !!driveLink && !!drawingFile && !!priority && tatValid && !!manufacturingLocation)

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {WORK_TYPES.map(type => {
          const Icon = type.icon
          const isSelected = typeOfWork === type.id
          const isSourcingType = SOURCING_TYPE_IDS.includes(type.id)
          const allowed = isTypeAllowed(type.id)

          // Border + background
          const cardCls = isSelected
            ? "border-blue-900 bg-blue-950/[0.04] shadow-sm"
            : !allowed
            ? isSourcingType
              ? "border-amber-200 bg-amber-50/30 opacity-60 cursor-not-allowed"
              : "border-violet-200 bg-violet-50/30 opacity-60 cursor-not-allowed"
            : isSourcingType
            ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"

          // Icon container
          const iconCls = isSelected
            ? "bg-blue-900 text-white"
            : !allowed
            ? isSourcingType ? "bg-amber-100 text-amber-400" : "bg-violet-100 text-violet-400"
            : isSourcingType
            ? "bg-amber-100 text-amber-600 group-hover:bg-amber-200"
            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"

          // Short-code badge
          const shortCls = isSelected
            ? "bg-blue-900 text-white"
            : isSourcingType ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"

          return (
            <button
              key={type.id}
              onClick={() => { if (allowed) setTypeOfWork(type.id) }}
              disabled={!allowed}
              className={`relative text-left rounded-xl border-2 p-5 transition-all focus:outline-none group ${cardCls}`}
            >
              {/* Team pill — top-left */}
              {isSourcingType && (
                <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full uppercase bg-amber-100 text-amber-600">
                  Sourcing
                </span>
              )}
              {!isSourcingType && !allowed && (
                <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full uppercase bg-violet-100 text-violet-500">
                  R&amp;D
                </span>
              )}

              {isSelected && (
                <span className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-blue-900">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}

              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${isSourcingType || (!isSourcingType && !allowed) ? "mt-4" : ""} ${iconCls}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-sm leading-tight ${isSelected ? "text-blue-900" : "text-slate-800"}`}>{type.title}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-1">{type.desc}</p>

              {isSourcingType && (
                <p className="text-[10px] text-amber-600/80 italic mb-2">Raised by Sourcing</p>
              )}
              {!isSourcingType && !allowed && (
                <p className="text-[10px] text-violet-500/80 italic mb-2">Raised by R&amp;D</p>
              )}

              <div className="flex items-center gap-3 mt-2">
                <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${shortCls}`}>{type.short}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button disabled={!typeOfWork} onClick={() => setStep(2)} className="bg-blue-900 hover:bg-blue-800 active:scale-[0.98] transition-transform text-white px-6">
          Continue <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-400">

      {/* Selected type banner */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm">
        {selectedType && <selectedType.icon className="w-4 h-4 text-blue-900 shrink-0" />}
        <span className="font-semibold text-slate-800">{selectedType?.title} — Rajpura RAC</span>
      </div>

      {typeOfWork === "NPD" ? (
        /* ── NPD Bundle layout: shared fields + item grid ── */
        <div className="space-y-6">

          {/* Shared fields */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
              <span className="w-1.5 h-4 rounded-full bg-blue-900 inline-block" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Shared Fields — Applied to All Items</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Product Line <span className="text-red-500">*</span></Label>
                <Select onValueChange={(v: string | null) => { if (v) setProductLine(v) }}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select product line" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAC (SAC/WAC/CAC)">RAC (SAC / WAC / CAC)</SelectItem>
                    <SelectItem value="Commercial Air Conditioning">Commercial Air Conditioning</SelectItem>
                    <SelectItem value="Grade A">Grade A</SelectItem>
                    <SelectItem value="Air Purifier">Air Purifier</SelectItem>
                    <SelectItem value="Water Purifier">Water Purifier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Manufacturing Location <span className="text-red-500">*</span></Label>
                <Select value={manufacturingLocation} onValueChange={v => { if (v) setManufacturingLocation(v) }}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select plant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jhajjar Plant 1">Jhajjar Plant 1</SelectItem>
                    <SelectItem value="Jhajjar Plant 2">Jhajjar Plant 2</SelectItem>
                    <SelectItem value="Sricity 1">Sricity 1</SelectItem>
                    <SelectItem value="Sricity 2">Sricity 2</SelectItem>
                    <SelectItem value="DDN 4">DDN 4</SelectItem>
                    <SelectItem value="DDN 5">DDN 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority <span className="text-red-500">*</span></Label>
                <Select value={priority} onValueChange={v => { if (v) setPriority(v) }}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1 — Critical</SelectItem>
                    <SelectItem value="P2">P2 — High</SelectItem>
                    <SelectItem value="P3">P3 — Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TAT Dev (days) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} placeholder="e.g. 30" value={tatDevelopment} onChange={e => setTatDevelopment(e.target.value)} className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TAT Prod (days) <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} placeholder="e.g. 15" value={tatProduction} onChange={e => setTatProduction(e.target.value)} className="bg-white" />
                </div>
              </div>
            </div>
            {tatDevelopment && tatProduction && (
              <p className="text-[11px] text-slate-500">Total project TAT: <strong className="text-slate-700">{Number(tatDevelopment) + Number(tatProduction)} days</strong></p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remarks</Label>
              <textarea rows={2} placeholder="Overall remarks for this NPD bundle…" value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            </div>
          </div>

          {/* Item grid — horizontal scrollable table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">NCD Items</h3>
                <span className="text-xs text-slate-400 font-normal">({bundleItems.length}/5)</span>
              </div>
              {bundleItems.length < 5 && (
                <button onClick={addBundleItem}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse" style={{ minWidth: "1490px" }}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 z-10 bg-slate-50 w-12 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">#</th>
                    <th className="w-[200px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Item Name <span className="text-red-400">*</span></th>
                    <th className="w-[200px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Commodity / SPOC <span className="text-red-400">*</span></th>
                    <th className="w-[220px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Drawing Link <span className="text-red-400">*</span></th>
                    <th className="w-[140px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Upload <span className="text-red-400">*</span></th>
                    <th className="w-[100px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Sample Qty <span className="text-red-400">*</span></th>
                    <th className="w-[90px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Revision?</th>
                    <th className="w-[130px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Revision No</th>
                    <th className="w-[120px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">CPL Sheet <span className="text-red-400 text-[9px]">*if rev</span></th>
                    <th className="w-[200px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Remarks</th>
                    <th className="w-10 px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundleItems.map((item, idx) => {
                    const isItemValid = !!item.itemName.trim() && !!item.commodity &&
                      (item.commodity !== "Others" || !!item.customCommodity.trim()) &&
                      !!item.driveLink && item.drawingFile && !!item.sampleQty &&
                      (!item.hasRevision || item.cplAttached)
                    return (
                      <tr key={item.id} className={`border-l-2 transition-colors ${isItemValid ? "border-l-emerald-400" : "border-l-slate-200"}`}>
                        {/* # */}
                        <td className="sticky left-0 z-10 bg-white w-12 px-3 py-3 text-center">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mx-auto ${isItemValid ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                            {isItemValid ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : idx + 1}
                          </span>
                        </td>
                        {/* Item Name */}
                        <td className="px-3 py-3">
                          <Input placeholder="e.g. Copper Header Tube" value={item.itemName}
                            onChange={e => updateBundleItem(item.id, { itemName: e.target.value })} className="bg-white h-8 text-sm" />
                        </td>
                        {/* Commodity */}
                        <td className="px-3 py-3">
                          <Select value={item.commodity} onValueChange={(v: string | null) => { if (v) updateBundleItem(item.id, { commodity: v }) }}>
                            <SelectTrigger className="w-full bg-white h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Plastics">Plastics</SelectItem>
                              <SelectItem value="Sheet Metal">Sheet Metal</SelectItem>
                              <SelectItem value="Electronics & Electrical">Electronics &amp; Electrical</SelectItem>
                              <SelectItem value="Compressors & Motors">Compressors &amp; Motors</SelectItem>
                              <SelectItem value="Packaging & Others">Packaging &amp; Others</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.commodity === "Others" && (
                            <Input placeholder="Specify…" value={item.customCommodity}
                              onChange={e => updateBundleItem(item.id, { customCommodity: e.target.value })} className="bg-white h-7 text-xs mt-1" />
                          )}
                          {item.commodity && item.commodity !== "Others" && (
                            <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              <User className="w-2.5 h-2.5 text-blue-700 shrink-0" />
                              <span className="text-[10px] font-semibold text-blue-800 truncate">{SPOC_NAME_MAP[item.commodity]}</span>
                            </div>
                          )}
                        </td>
                        {/* Drawing Link */}
                        <td className="px-3 py-3">
                          <div className="relative">
                            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <Input placeholder="https://drive.google.com/…" type="url" value={item.driveLink}
                              onChange={e => updateBundleItem(item.id, { driveLink: e.target.value })} className="pl-7 bg-white h-8 text-sm" />
                          </div>
                        </td>
                        {/* Upload */}
                        <td className="px-3 py-3">
                          <div onClick={() => updateBundleItem(item.id, { drawingFile: !item.drawingFile })}
                            className={`flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed h-8 px-2 cursor-pointer transition-colors text-xs font-medium ${item.drawingFile ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-300 hover:border-blue-400 text-slate-500"}`}>
                            {item.drawingFile
                              ? <><CheckCircle className="w-3.5 h-3.5 shrink-0" /><span className="truncate">Uploaded</span></>
                              : <span>Upload</span>
                            }
                          </div>
                        </td>
                        {/* Sample Qty */}
                        <td className="px-3 py-3">
                          <Input type="number" min={1} placeholder="e.g. 5" value={item.sampleQty}
                            onChange={e => updateBundleItem(item.id, { sampleQty: e.target.value })} className="bg-white h-8 text-sm" />
                        </td>
                        {/* Revision? */}
                        <td className="px-3 py-3 text-center">
                          <Checkbox checked={item.hasRevision}
                            onCheckedChange={c => updateBundleItem(item.id, { hasRevision: c === true, cplAttached: false, revisionNo: "" })} />
                        </td>
                        {/* Revision No */}
                        <td className="px-3 py-3">
                          <Input placeholder="e.g. R02" value={item.revisionNo}
                            onChange={e => updateBundleItem(item.id, { revisionNo: e.target.value })}
                            disabled={!item.hasRevision}
                            className={`bg-white h-8 text-sm ${!item.hasRevision ? "opacity-40" : ""}`} />
                        </td>
                        {/* CPL Sheet */}
                        <td className="px-3 py-3">
                          <div onClick={() => { if (item.hasRevision) updateBundleItem(item.id, { cplAttached: !item.cplAttached }) }}
                            className={`flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed h-8 px-2 text-xs font-medium transition-colors ${!item.hasRevision ? "opacity-40 pointer-events-none border-slate-200 text-slate-400" : item.cplAttached ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-pointer" : "border-slate-300 hover:border-blue-400 text-slate-500 cursor-pointer"}`}>
                            {item.cplAttached
                              ? <><CheckCircle className="w-3.5 h-3.5 shrink-0" /><span>Attached</span></>
                              : <span>Attach CPL</span>
                            }
                          </div>
                        </td>
                        {/* Remarks */}
                        <td className="px-3 py-3">
                          <textarea rows={1} placeholder="Notes…" value={item.remarks}
                            onChange={e => updateBundleItem(item.id, { remarks: e.target.value })}
                            className="w-full rounded-md border border-input bg-white px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </td>
                        {/* Delete */}
                        <td className="px-2 py-3 text-center">
                          {bundleItems.length > 1 && (
                            <button onClick={() => removeBundleItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : typeOfWork === "ECN" ? (
        /* ── ECN dedicated layout: two equal columns, no blank space ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Part Details */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-blue-900 inline-block" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Part Details</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Part Number <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Existing part number being changed</p>
              <Input
                placeholder="e.g. AMB-PT-2024-0042"
                value={ecnPartNumber}
                onChange={e => setEcnPartNumber(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Part Name <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Common name for the part</p>
              <Input
                placeholder="e.g. Copper Header Tube"
                value={ecnPartName}
                onChange={e => setEcnPartName(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Existing Supplier <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Current approved supplier for this part</p>
              <Select value={ecnSupplier} onValueChange={v => { if (v) setEcnSupplier(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {Object.values(VENDOR_CATALOG).flat().filter((v, i, arr) => arr.findIndex(x => x.name === v.name) === i).map(v => (
                    <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Manufacturing Plant <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Plant where this part is produced</p>
              <Select value={manufacturingLocation} onValueChange={v => { if (v) setManufacturingLocation(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select plant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jhajjar Plant 1">Jhajjar Plant 1</SelectItem>
                  <SelectItem value="Jhajjar Plant 2">Jhajjar Plant 2</SelectItem>
                  <SelectItem value="Sricity 1">Sricity 1</SelectItem>
                  <SelectItem value="Sricity 2">Sricity 2</SelectItem>
                  <SelectItem value="DDN 4">DDN 4</SelectItem>
                  <SelectItem value="DDN 5">DDN 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">P1 = Critical · P2 = High · P3 = Normal</p>
              <Select value={priority} onValueChange={(v: string | null) => { if (v) setPriority(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 — Critical</SelectItem>
                  <SelectItem value="P2">P2 — High</SelectItem>
                  <SelectItem value="P3">P3 — Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Change Parameters */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Change Parameters</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Change Description <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Describe what is being changed and why</p>
              <textarea
                rows={3}
                placeholder="e.g. Material grade change from PPCP to PP+T20 due to heat deflection requirement…"
                value={ecnChangeDescription}
                onChange={e => setEcnChangeDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TAT — Development (days) <span className="text-red-500">*</span></Label>
                <p className="text-[11px] text-slate-400">Design, testing & approval</p>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 20"
                  value={tatDevelopment}
                  onChange={e => setTatDevelopment(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TAT — Production (days) <span className="text-red-500">*</span></Label>
                <p className="text-[11px] text-slate-400">Pilot run to closure</p>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 10"
                  value={tatProduction}
                  onChange={e => setTatProduction(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            {tatDevelopment && tatProduction && (
              <p className="text-[11px] text-slate-500 -mt-1">
                Total project TAT: <strong className="text-slate-700">{Number(tatDevelopment) + Number(tatProduction)} days</strong>
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Drawing / Reference Link
              </Label>
              <p className="text-[11px] text-slate-400">Paste your Google Drive or shared drawing link (optional)</p>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="https://drive.google.com/..."
                  type="url"
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remarks</Label>
              <p className="text-[11px] text-slate-400">Special instructions or context for R&D</p>
              <textarea
                rows={3}
                placeholder="e.g. Linked to Q3 model launch. Must retain IATF certification."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </div>
      ) : (
        /* ── NCD / NPD / Compliance / Alt Supplier / NTD layout ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Product & Classification */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-blue-900 inline-block" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Product & Classification</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Product Line <span className="text-red-500">*</span></Label>
              <Select onValueChange={(v: string | null) => { if (v) setProductLine(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select product line" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAC (SAC/WAC/CAC)">RAC (SAC / WAC / CAC)</SelectItem>
                  <SelectItem value="Commercial Air Conditioning">Commercial Air Conditioning</SelectItem>
                  <SelectItem value="Grade A">Grade A</SelectItem>
                  <SelectItem value="Air Purifier">Air Purifier</SelectItem>
                  <SelectItem value="Water Purifier">Water Purifier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Copper Header Tube"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="bg-white"
              />
            </div>

            {typeOfWork !== "ALT_SUPPLIER" && <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Commodity / Category <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Determines auto-routing to Sourcing SPOC</p>
              <Select onValueChange={(v: string | null) => { if (v) setCommodity(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plastics">Plastics</SelectItem>
                  <SelectItem value="Sheet Metal">Sheet Metal</SelectItem>
                  <SelectItem value="Electronics & Electrical">Electronics & Electrical</SelectItem>
                  <SelectItem value="Compressors & Motors">Compressors & Motors</SelectItem>
                  <SelectItem value="Packaging & Others">Packaging & Others</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              {commodity === "Others" && (
                <div className="space-y-1.5 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Specify Commodity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Rubber Gaskets, Heat Exchanger, Fasteners…"
                    value={customCommodity}
                    onChange={e => setCustomCommodity(e.target.value)}
                    className="bg-white"
                  />
                  <p className="text-[11px] text-slate-400">This will be recorded as the item category in the NPD record.</p>
                </div>
              )}
              {commodity && (
                <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg bg-blue-950/[0.05] border border-blue-200">
                  <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="text-xs font-semibold text-blue-800">{SPOC_DISPLAY_MAP[commodity]}</span>
                </div>
              )}
            </div>}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Manufacturing Location <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">Target plant for production</p>
              <Select value={manufacturingLocation} onValueChange={(v: string | null) => { if (v) setManufacturingLocation(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select plant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jhajjar Plant 1">Jhajjar Plant 1</SelectItem>
                  <SelectItem value="Jhajjar Plant 2">Jhajjar Plant 2</SelectItem>
                  <SelectItem value="Sricity 1">Sricity 1</SelectItem>
                  <SelectItem value="Sricity 2">Sricity 2</SelectItem>
                  <SelectItem value="DDN 4">DDN 4</SelectItem>
                  <SelectItem value="DDN 5">DDN 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority <span className="text-red-500">*</span></Label>
              <p className="text-[11px] text-slate-400">P1 = Critical · P2 = High · P3 = Normal</p>
              <Select value={priority} onValueChange={(v: string | null) => { if (v) setPriority(v) }}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 — Critical</SelectItem>
                  <SelectItem value="P2">P2 — High</SelectItem>
                  <SelectItem value="P3">P3 — Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TAT — Development (days) <span className="text-red-500">*</span></Label>
                <p className="text-[11px] text-slate-400">Design, testing & approval</p>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 30"
                  value={tatDevelopment}
                  onChange={e => setTatDevelopment(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TAT — Production (days) <span className="text-red-500">*</span></Label>
                <p className="text-[11px] text-slate-400">Pilot run to closure</p>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 15"
                  value={tatProduction}
                  onChange={e => setTatProduction(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            {tatDevelopment && tatProduction && (
              <p className="text-[11px] text-slate-500 -mt-1">
                Total project TAT: <strong className="text-slate-700">{Number(tatDevelopment) + Number(tatProduction)} days</strong>
              </p>
            )}
          </div>

          {/* Right: Technical Documents */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Technical Documents</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Drawing / Spec Sheet Link <span className="text-red-500">*</span>
              </Label>
              <p className="text-[11px] text-slate-400">Paste your Google Drive or shared drawing link</p>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="https://drive.google.com/..."
                  type="url"
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Drawing / Spec Sheet Upload <span className="text-red-500">*</span>
              </Label>
              <div
                onClick={() => setDrawingFile(v => !v)}
                className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                  drawingFile
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                }`}
              >
                {drawingFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-700">drawing_spec.pdf</span>
                    <span className="text-xs text-red-400 hover:text-red-600 ml-1">Remove</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 font-medium">Click to upload</p>
                    <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, DWG accepted</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remarks</Label>
              <p className="text-[11px] text-slate-400">Any special instructions or context for the sourcing team</p>
              <textarea
                rows={3}
                placeholder="e.g. Urgent — linked to Q3 model launch. Supplier must have IATF 16949 certification."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* NCD/NPD-specific fields */}
            {(typeOfWork === "NCD" || typeOfWork === "NPD") && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Sample Quantity Required <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-slate-400">
                    Number of samples for R&amp;D evaluation and testing
                  </p>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 5"
                    value={sampleQty}
                    onChange={e => setSampleQty(e.target.value)}
                    className="bg-white max-w-[160px]"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasRevision"
                      checked={hasRevision}
                      onCheckedChange={c => {
                        setHasRevision(c === true)
                        if (!c) { setCplAttached(false); setRevisionNo(""); setPrevPartNo("") }
                      }}
                    />
                    <Label htmlFor="hasRevision" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Does this drawing have a Revision Number?
                    </Label>
                  </div>

                  {hasRevision && (
                    <div className="space-y-4 pl-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Previous Part Number
                        </Label>
                        {rejectedParts.length > 0 ? (
                          <>
                            <Select value={prevPartNo} onValueChange={v => { setPrevPartNo(v ?? ""); setRevisionNo(v ?? "") }}>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select previously rejected part…" />
                              </SelectTrigger>
                              <SelectContent>
                                {rejectedParts.map(r => (
                                  <SelectItem key={r.npdId} value={r.partNumber}>
                                    <span className="font-semibold">{r.partNumber}</span>
                                    <span className="ml-2 text-slate-500 text-xs">— {r.itemName}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {prevPartNo && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Revising: <strong>{prevPartNo}</strong>
                                <button onClick={() => { setPrevPartNo(""); setRevisionNo("") }} className="ml-2 text-red-400 hover:text-red-600">Clear</button>
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                            No rejected parts on record yet. Rejected parts from Stage 8 will appear here.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          CPL Change Point Sheet (.xlsx) <span className="text-red-500">*</span>
                        </Label>
                        <div
                          onClick={() => setCplAttached(!cplAttached)}
                          className={`rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
                            cplAttached
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-slate-300 hover:border-slate-400 hover:bg-white"
                          }`}
                        >
                          {cplAttached ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              </div>
                              <p className="text-sm font-semibold text-emerald-700">target_costing_v2.xlsx</p>
                              <p className="text-xs text-emerald-600">Click to remove</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <p className="text-sm font-medium text-slate-600">Click to attach .xlsx template</p>
                              <p className="text-xs text-slate-400">Sourcing requires this for budget alignment</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* NTD-specific fields */}
            {typeOfWork === "NTD" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tool / Die Reference <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. TOOL-RAC-2026-014" className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tool Type</Label>
                  <Select>
                    <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select tool type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Injection Mould">Injection Mould</SelectItem>
                      <SelectItem value="Press Tool / Die">Press Tool / Die</SelectItem>
                      <SelectItem value="Fixture">Fixture</SelectItem>
                      <SelectItem value="Jig">Jig</SelectItem>
                      <SelectItem value="Gauge / Inspection Aid">Gauge / Inspection Aid</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ALT_SUPPLIER-specific fields */}
            {typeOfWork === "ALT_SUPPLIER" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Existing Part Number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. AMB-PT-2024-0042"
                  value={existingPartNumber}
                  onChange={e => setExistingPartNumber(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-5 border-t border-slate-100">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          disabled={!step2Valid}
          onClick={() => setStep(3)}
          className="bg-blue-900 hover:bg-blue-800 active:scale-[0.98] transition-transform text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Review Request <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const renderStep3 = () => {
    const displayWorkTypeLabel = WORK_TYPE_LABEL[typeOfWork] ?? typeOfWork

    // ── NPD bundle review ──────────────────────────────────────────────────
    if (typeOfWork === "NPD") {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-400">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Product Line", value: productLine || "—" },
              { label: "Plant", value: manufacturingLocation || "—" },
              { label: "Priority", value: `${priority} — ${priority === "P1" ? "Critical" : priority === "P2" ? "High" : "Normal"}` },
              { label: "Total TAT", value: (tatDevelopment && tatProduction) ? `${Number(tatDevelopment) + Number(tatProduction)} days` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">NPD Bundle — {bundleItems.length} NCD Sub-Requests</p>
                <h3 className="text-sm font-semibold">Each item will be routed to its SPOC and run in parallel</h3>
              </div>
              <Package className="w-5 h-5 text-slate-400" />
            </div>
            <div className="bg-white divide-y divide-slate-100">
              {bundleItems.map((item, idx) => {
                const effCom = item.commodity === "Others" && item.customCommodity.trim() ? item.customCommodity.trim() : item.commodity
                return (
                  <div key={item.id} className="px-5 py-3 grid grid-cols-[32px_1fr_1fr_1fr] gap-4 items-center text-sm">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold shrink-0">{idx + 1}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{item.itemName || "—"}</p>
                      <p className="text-[11px] text-slate-400">{effCom || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-blue-700 shrink-0" />
                      <span className="text-xs font-semibold text-blue-800">{SPOC_NAME_MAP[item.commodity] || "—"}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.sampleQty && <span>{item.sampleQty} samples</span>}
                      {item.hasRevision && <span className="ml-2 text-amber-600">Rev {item.revisionNo}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between pt-5 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Details</Button>
            <Button onClick={handleConfirmDispatch} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
              <CheckCircle className="w-4 h-4 mr-2" /> Create NPD Bundle
            </Button>
          </div>
        </div>
      )
    }

    return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-400">

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(typeOfWork === "ECN" ? [
          { label: "Part Number",   value: ecnPartNumber || "—" },
          { label: "Part Name",     value: ecnPartName || "—" },
          { label: "Supplier",      value: ecnSupplier || "—" },
          { label: "Plant",         value: manufacturingLocation || "—" },
          { label: "Change Desc",   value: ecnChangeDescription ? (ecnChangeDescription.length > 40 ? ecnChangeDescription.slice(0, 40) + "…" : ecnChangeDescription) : "—" },
          { label: "Priority",      value: `${priority} — ${priority === "P1" ? "Critical" : priority === "P2" ? "High" : "Normal"}` },
          { label: "TAT Dev",       value: tatDevelopment ? `${tatDevelopment}d` : "—" },
          { label: "TAT Prod",      value: tatProduction ? `${tatProduction}d` : "—" },
          { label: "Total TAT",     value: (tatDevelopment && tatProduction) ? `${Number(tatDevelopment) + Number(tatProduction)} days` : "—" },
        ] : [
          { label: "Item",        value: itemName || "—" },
          { label: "Category",    value: effectiveCommodity || "—" },
          { label: "SPOC",        value: SPOC_NAME_MAP[commodity] || "—" },
          { label: "Priority",    value: `${priority} — ${priority === "P1" ? "Critical" : priority === "P2" ? "High" : "Normal"}` },
          { label: "Plant",       value: manufacturingLocation || "—" },
          { label: "TAT Dev",     value: tatDevelopment ? `${tatDevelopment}d` : "—" },
          { label: "TAT Prod",    value: tatProduction ? `${tatProduction}d` : "—" },
          { label: "Total TAT",   value: (tatDevelopment && tatProduction) ? `${Number(tatDevelopment) + Number(tatProduction)} days` : "—" },
        ]).map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Email preview */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Automated Dispatch Preview</p>
            <h3 className="text-sm font-semibold">New Request Alert → <span className="text-blue-300">{commodity ? SPOC_DISPLAY_MAP[commodity] : "Sourcing SPOC"}</span></h3>
          </div>
          <Mail className="w-5 h-5 text-slate-400" />
        </div>

        <div className="bg-white p-6 font-mono text-sm text-slate-700 space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-y-1 text-xs border-b border-slate-100 pb-3 mb-3">
            <span className="text-slate-400">From:</span>    <span className="font-semibold">Amber Auto-Bot &lt;noreply@amber.internal&gt;</span>
            <span className="text-slate-400">To:</span>      <span className="font-semibold">{commodity ? SPOC_DISPLAY_MAP[commodity] : "Sourcing SPOC"}</span>
            <span className="text-slate-400">Subject:</span> <span className="font-semibold">ACTION REQUIRED — New {displayWorkTypeLabel} for {effectiveCommodity || "Component"}</span>
          </div>

          <p className="text-slate-600">Dear {typeOfWork === "ECN" ? "R&D Head" : (SPOC_NAME_MAP[commodity] || "Sourcing Team")},</p>
          <p className="text-slate-600">A new <strong className="text-slate-800">{displayWorkTypeLabel}</strong> project has been initiated by R&D requiring immediate sourcing allocation.</p>

          <div className="rounded-md bg-slate-50 border border-slate-100 p-4 space-y-1 text-xs">
            {typeOfWork === "ECN" ? (
              <>
                <p><strong>Part Number:</strong> {ecnPartNumber || "N/A"}</p>
                <p><strong>Part Name:</strong> {ecnPartName || "N/A"}</p>
                <p><strong>Existing Supplier:</strong> {ecnSupplier || "N/A"}</p>
                <p><strong>Change Description:</strong> {ecnChangeDescription || "N/A"}</p>
                <p><strong>Priority:</strong> {priority || "N/A"}</p>
                <p><strong>TAT — Development:</strong> {tatDevelopment ? `${tatDevelopment} days` : "N/A"}</p>
                <p><strong>TAT — Production:</strong> {tatProduction ? `${tatProduction} days` : "N/A"}</p>
                <p><strong>Total TAT:</strong> {(tatDevelopment && tatProduction) ? `${Number(tatDevelopment) + Number(tatProduction)} days` : "N/A"}</p>
                {driveLink && <p><strong>Drawing / Reference Link:</strong> <span className="text-blue-600 underline">{driveLink}</span></p>}
                {remarks && <p><strong>Remarks:</strong> {remarks}</p>}
              </>
            ) : (
              <>
                <p><strong>Item Name:</strong> {itemName || "N/A"}</p>
                <p><strong>Commodity:</strong> {effectiveCommodity || "N/A"}{commodity === "Others" && customCommodity ? " (Others)" : ""}</p>
                <p><strong>Product Line:</strong> {productLine || "N/A"}</p>
                <p><strong>Manufacturing Location:</strong> {manufacturingLocation || "N/A"}</p>
                <p><strong>Priority:</strong> {priority || "N/A"}</p>
                <p><strong>TAT — Development:</strong> {tatDevelopment ? `${tatDevelopment} days` : "N/A"}</p>
                <p><strong>TAT — Production:</strong> {tatProduction ? `${tatProduction} days` : "N/A"}</p>
                <p><strong>Total TAT:</strong> {(tatDevelopment && tatProduction) ? `${Number(tatDevelopment) + Number(tatProduction)} days` : "N/A"}</p>
                {sampleQty && <p><strong>Sample Quantity Required:</strong> {sampleQty} pcs</p>}
                {driveLink && <p><strong>Drawing Link:</strong> <span className="text-blue-600 underline">{driveLink}</span></p>}
                {hasRevision && prevPartNo && <p><strong>Previous Part No:</strong> {prevPartNo}</p>}
                {typeOfWork === "ALT_SUPPLIER" && existingPartNumber && <p><strong>Existing Part No.:</strong> {existingPartNumber}</p>}
                {remarks && <p><strong>Remarks:</strong> {remarks}</p>}
              </>
            )}
          </div>

          <p className="text-slate-600 text-xs">Please log in to the Amber NPD portal to initiate Supplier ASR Sync and Bulk Enquiry dispatch.</p>

          <p className="text-slate-600 text-xs">Regards,<br /><strong>{pocRole === "rnd_head" ? DEFAULT_RND_HEAD.name : DEFAULT_RND_CONTACT.name}</strong></p>
        </div>
      </div>

      <div className="flex justify-between pt-5 border-t border-slate-100">
        <Button variant="outline" onClick={() => setStep(2)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Details
        </Button>
        <Button onClick={handleConfirmDispatch} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
          <CheckCircle className="w-4 h-4 mr-2" /> Confirm & Dispatch
        </Button>
      </div>
    </div>
    )
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Request</h1>
        <p className="text-sm text-slate-500 mt-1">Initiate a new component development or change request for sourcing allocation.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-start mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-start">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                step > s.n  ? "bg-emerald-500 text-white" :
                step === s.n ? "bg-blue-900 text-white" :
                              "bg-slate-200 text-slate-500"
              }`}>
                {step > s.n ? <Check className="w-4 h-4" strokeWidth={3} /> : s.n}
              </div>
              <span className={`mt-1.5 text-[11px] font-semibold whitespace-nowrap ${step === s.n ? "text-blue-900" : "text-slate-400"}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mt-4 mx-3 h-0.5 w-16 rounded transition-colors ${step > s.n ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  )
}
