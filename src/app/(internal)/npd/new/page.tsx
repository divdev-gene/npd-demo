"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Wrench, FileEdit, Globe, ShieldCheck, Repeat,
  ChevronRight, ArrowLeft, Mail, CheckCircle, Check,
  Link2, User
} from "lucide-react"
import { useNPDs } from "@/lib/npdContext"
import { getStageName } from "@/lib/mockData"

const WORK_TYPES = [
  { id: "NCD",         title: "New Component Development", short: "NCD",        desc: "Brand new component. Full end-to-end lifecycle.", icon: Wrench,     tat: 45, stages: 11 },
  { id: "ECN",         title: "Engineering Change Notice",  short: "ECN",        desc: "Change to existing component. Abbreviated flow.", icon: FileEdit,   tat: 30, stages: 10 },
  { id: "Localisation",title: "Localisation",               short: "LOCAL",      desc: "Import replacement. Cost & compliance check.",    icon: Globe,      tat: 45, stages: 11 },
  { id: "Compliance",  title: "Compliance / Regulatory",    short: "COMP",       desc: "BIS, QCO, etc. Document-centric flow.",           icon: ShieldCheck, tat: 30, stages: 6  },
  { id: "PP",          title: "PP Pre-Production Repeat",   short: "PP",         desc: "First production quantity of validated part.",    icon: Repeat,     tat: 5,  stages: 4  },
]

const SPOC_NAME_MAP: Record<string, string> = {
  "Plastics":                "Rahul Sharma",
  "Sheet Metal":             "Karan Mehta",
  "Electronics & Electrical":"Priya Rajan",
  "Compressors & Motors":    "Amit Kumar",
  "Packaging & Others":      "Varun Joshi",
  "Others":                  "General Sourcing",
}

const SPOC_DISPLAY_MAP: Record<string, string> = {
  "Plastics":                "Rahul Sharma · Plastics SPOC",
  "Sheet Metal":             "Karan Mehta · Sheet Metal SPOC",
  "Electronics & Electrical":"Priya Rajan · Electronics SPOC",
  "Compressors & Motors":    "Amit Kumar · Compressors SPOC",
  "Packaging & Others":      "Varun Joshi · Packaging SPOC",
  "Others":                  "General Sourcing · Unassigned",
}

const TAT_MAP: Record<string, number> = {
  "NCD": 45, "ECN": 30, "Localisation": 45, "Compliance": 30, "PP": 5,
}

const WORK_TYPE_LABEL: Record<string, string> = {
  "NCD":          "New Component Development (NCD)",
  "ECN":          "Engineering Change Notice (ECN)",
  "Localisation": "Localisation",
  "Compliance":   "Compliance / Regulatory",
  "PP":           "PP (Pre-Production) Repeat",
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
  const [productLine, setProductLine] = useState("")
  const [rAndDDivision, setRAndDDivision] = useState("")
  const [itemName, setItemName]       = useState("")
  const [driveLink, setDriveLink]     = useState("")
  const [hasRevision, setHasRevision] = useState(false)
  const [revisionNo, setRevisionNo]   = useState("")
  const [cplAttached, setCplAttached] = useState(false)

  const selectedType = WORK_TYPES.find(t => t.id === typeOfWork)

  const handleConfirmDispatch = () => {
    const year = new Date().getFullYear()
    const maxSeq = npds.reduce((max, n) => {
      const parts = n.id.split("-")
      const num = parseInt(parts[parts.length - 1], 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    const newId = `NPD-FY-${year}-${String(maxSeq + 1).padStart(4, "0")}`
    const workTypeLabel = WORK_TYPE_LABEL[typeOfWork] || typeOfWork
    const tat = TAT_MAP[typeOfWork] || 45
    const raisedBy = localStorage.getItem("poc_role") || "rnd_user"

    addNPD({
      id: newId,
      itemName: itemName || "New Component",
      itemCategory: commodity || "Others",
      productLine: productLine || "Unspecified",
      typeOfWork: workTypeLabel,
      rAndDDivision: rAndDDivision || "Unspecified",
      stage: 3,
      stageName: getStageName(3, workTypeLabel),
      tatHealth: "green",
      tatDaysRemaining: tat,
      totalTat: tat,
      spoc: SPOC_NAME_MAP[commodity] || "General Sourcing",
      supplier: "Pending Assignment",
      priority: "Normal",
      gradeA: false,
      tqrScore: null,
      cost: null,
      raisedBy,
      driveLink: driveLink || undefined,
    })
    router.push('/archive')
  }

  const step2Valid = typeOfWork === "NCD"
    ? (!!itemName && !!commodity && !!productLine && !!rAndDDivision && !!driveLink && (!hasRevision || (hasRevision && cplAttached)))
    : (!!itemName && !!commodity && !!productLine && !!rAndDDivision)

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {WORK_TYPES.map(type => {
          const Icon = type.icon
          const isSelected = typeOfWork === type.id
          return (
            <button
              key={type.id}
              onClick={() => setTypeOfWork(type.id)}
              className={`relative text-left rounded-xl border-2 p-5 transition-all focus:outline-none group ${
                isSelected
                  ? "border-blue-900 bg-blue-950/[0.04] shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-blue-900">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${isSelected ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-sm leading-tight ${isSelected ? "text-blue-900" : "text-slate-800"}`}>{type.title}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">{type.desc}</p>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${isSelected ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-500"}`}>{type.short}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button disabled={!typeOfWork} onClick={() => setStep(2)} className="bg-blue-900 hover:bg-blue-800 text-white px-6">
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
        <span className="font-semibold text-slate-800">{selectedType?.title}</span>
      </div>

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
                <SelectItem value="RAC (SAC/WAAC/CAC)">RAC (SAC / WAAC / CAC)</SelectItem>
                <SelectItem value="Commercial Air Conditioning">Commercial Air Conditioning</SelectItem>
                <SelectItem value="Grade A">Grade A</SelectItem>
                <SelectItem value="Air Purifier">Air Purifier</SelectItem>
                <SelectItem value="Water Purifier">Water Purifier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Plant / R&D Division <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v: string | null) => { if (v) setRAndDDivision(v) }}>
              <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select R&D Division" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Rajpura RAC">Rajpura RAC</SelectItem>
                <SelectItem value="Rajpura Grade A">Rajpura Grade A</SelectItem>
                <SelectItem value="Rajpura Commercial">Rajpura Commercial</SelectItem>
                <SelectItem value="Jhajjhar RAC">Jhajjhar RAC</SelectItem>
                <SelectItem value="Sricity RAC">Sricity RAC</SelectItem>
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

          <div className="space-y-1.5">
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
            {commodity && (
              <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg bg-blue-950/[0.05] border border-blue-200">
                <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span className="text-xs font-semibold text-blue-800">{SPOC_DISPLAY_MAP[commodity]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Technical Documents */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Technical Documents</h3>
          </div>

          {typeOfWork === "NCD" && (
            <>
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

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasRevision"
                    checked={hasRevision}
                    onCheckedChange={c => {
                      setHasRevision(c === true)
                      if (!c) { setCplAttached(false); setRevisionNo("") }
                    }}
                  />
                  <Label htmlFor="hasRevision" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Does this drawing have a Revision Number?
                  </Label>
                </div>

                {hasRevision && (
                  <div className="space-y-4 pl-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Revision Number</Label>
                      <Input
                        placeholder="e.g. Rev 1, Rev A"
                        value={revisionNo}
                        onChange={e => setRevisionNo(e.target.value)}
                        className="bg-white"
                      />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Drawing / Spec Sheet PDF</Label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:bg-slate-50 cursor-pointer transition-colors">
                  <p className="text-sm text-slate-500">Drag & drop or click to upload</p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, PNG, DWG accepted</p>
                </div>
              </div>
            </>
          )}

          {typeOfWork === "ECN" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Existing Part Code <span className="text-red-500">*</span></Label>
                <Input placeholder="Search existing part code..." className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nature of Change</Label>
                <Select>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select change type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dimensional">Dimensional</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Process">Process</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Documentation only (Fast track)">Documentation only (Fast track)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">EDOF Reference <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. EDOF/26/014" className="bg-white" />
              </div>
            </>
          )}

          {(typeOfWork === "Localisation" || typeOfWork === "Compliance" || typeOfWork === "PP") && (
            <div className="flex items-center gap-3 px-4 py-10 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm justify-center">
              No additional documents required for this work type.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-5 border-t border-slate-100">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          disabled={!step2Valid}
          onClick={() => setStep(3)}
          className="bg-blue-900 hover:bg-blue-800 text-white px-6 disabled:bg-slate-200 disabled:text-slate-400"
        >
          Review Request <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-400">

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Item",       value: itemName || "—" },
          { label: "Category",   value: commodity || "—" },
          { label: "Division",   value: rAndDDivision || "—" },
          { label: "SPOC",       value: SPOC_NAME_MAP[commodity] || "—" },
        ].map(({ label, value }) => (
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
            <span className="text-slate-400">Subject:</span> <span className="font-semibold">ACTION REQUIRED — New {WORK_TYPE_LABEL[typeOfWork] || typeOfWork} for {commodity || "Component"}</span>
          </div>

          <p className="text-slate-600">Dear Sourcing Team,</p>
          <p className="text-slate-600">A new <strong className="text-slate-800">{WORK_TYPE_LABEL[typeOfWork]}</strong> project has been initiated by R&D requiring immediate sourcing allocation.</p>

          <div className="rounded-md bg-slate-50 border border-slate-100 p-4 space-y-1 text-xs">
            <p><strong>Item Name:</strong> {itemName || "N/A"}</p>
            <p><strong>Commodity:</strong> {commodity || "N/A"}</p>
            <p><strong>R&D Division:</strong> {rAndDDivision || "N/A"}</p>
            <p><strong>Product Line:</strong> {productLine || "N/A"}</p>
            {driveLink && <p><strong>Drawing Link:</strong> <span className="text-blue-600 underline">{driveLink}</span></p>}
            {hasRevision && revisionNo && <p><strong>Revision No:</strong> {revisionNo}</p>}
          </div>

          <p className="text-slate-600 text-xs">Please log in to the Amber NPD portal to initiate Supplier ASR Sync and Bulk RFQ dispatch.</p>
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
