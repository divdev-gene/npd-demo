"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Wrench, FileEdit, Globe, ShieldCheck, Repeat, ChevronRight, ArrowLeft, Mail, CheckCircle } from "lucide-react"

const WORK_TYPES = [
  { id: "NCD", title: "New Component Development (NCD)", desc: "Brand new component. Full 12-stage lifecycle.", icon: Wrench },
  { id: "ECN", title: "Engineering Change Notice", desc: "Change to existing component. Abbreviated flow.", icon: FileEdit },
  { id: "Localisation", title: "Localisation", desc: "Import replacement. Requires cost/compliance check.", icon: Globe },
  { id: "Compliance", title: "Compliance / Regulatory", desc: "BIS, QCO, etc. Document-centric flow.", icon: ShieldCheck },
  { id: "PP", title: "PP (Pre-Production) Repeat", desc: "First production quantity of validated part.", icon: Repeat },
]

export default function NewRequestWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [typeOfWork, setTypeOfWork] = useState("")
  const [commodity, setCommodity] = useState("")
  const [excelAttached, setExcelAttached] = useState(false)
  const [hasRevision, setHasRevision] = useState(false)

  const spocMap: Record<string, string> = {
    "Plastics": "Rahul Sharma (Plastics SPOC)",
    "Sheet Metal": "Karan Sir (Sheet Metal SPOC)",
    "Electronics & Electrical": "Priya Rajan (Electronics SPOC)",
    "Compressors & Motors": "Amit K. (Compressors SPOC)",
    "Packaging & Others": "Varun J. (Packaging SPOC)",
    "Others": "General Sourcing (Unassigned)"
  }

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORK_TYPES.map(type => {
          const Icon = type.icon
          const isSelected = typeOfWork === type.id
          return (
            <Card 
              key={type.id} 
              className={`cursor-pointer transition-all border-2 ${
                isSelected 
                  ? 'border-blue-900 bg-blue-50/50 shadow-md transform scale-[1.02]' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => setTypeOfWork(type.id)}
            >
              <CardContent className="p-6">
                <Icon className={`w-8 h-8 mb-4 ${isSelected ? 'text-blue-900' : 'text-slate-500'}`} />
                <h3 className="font-semibold text-slate-900 mb-1">{type.title}</h3>
                <p className="text-sm text-slate-500">{type.desc}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="flex justify-end pt-6 border-t border-slate-100">
        <Button 
          disabled={!typeOfWork} 
          onClick={() => setStep(2)}
          className="bg-blue-900 hover:bg-blue-800 text-white"
        >
          Continue <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Product & Categorization</h3>
          
          <div className="space-y-2">
            <Label>Product Line <span className="text-red-500">*</span></Label>
            <Select>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select product line" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RAC (SAC/WAAC/CAC)">RAC (SAC/WAAC/CAC)</SelectItem>
                <SelectItem value="Commercial Air Conditioning">Commercial Air Conditioning</SelectItem>
                <SelectItem value="Grade A">Grade A</SelectItem>
                <SelectItem value="Air Purifier">Air Purifier</SelectItem>
                <SelectItem value="Water Purifier">Water Purifier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plant / R&D Division <span className="text-red-500">*</span></Label>
            <Select>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select R&D Division" /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>Item Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Copper Header Tube" />
          </div>

          <div className="space-y-2">
            <Label>Commodity/Category (Routes to SPOC) <span className="text-red-500">*</span></Label>
            <Select onValueChange={setCommodity}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
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
               <div className="mt-2 p-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" />
                  <span>Assigned Sourcing SPOC: <strong>{spocMap[commodity]}</strong></span>
               </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Technical Required Documents</h3>
          
          {typeOfWork === "NCD" && (
            <>
              <div className="space-y-2">
                <Label>Siemens Teamcenter Drawing Link <span className="text-red-500">*</span></Label>
                <Input placeholder="https://teamcenter.amber.internal/..." type="url" />
                <p className="text-xs text-slate-500">Must be a valid Teamcenter URL</p>
              </div>
              <div className="space-y-2 pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasRevision" 
                    checked={hasRevision}
                    onCheckedChange={(c) => setHasRevision(c === true)}
                  />
                  <Label htmlFor="hasRevision" className="font-medium text-slate-700">Does this drawing have a Revision Number?</Label>
                </div>
                {hasRevision && (
                  <div className="pt-1 pl-6">
                    <Input placeholder="Enter Revision No. (e.g. Rev 1)" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Drawing/Spec Sheet <span className="text-red-500">*</span></Label>
                <div className="border border-dashed border-slate-300 rounded-md p-4 text-center hover:bg-slate-50 cursor-pointer">
                  <p className="text-sm text-slate-600">Drag & drop or click to upload</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                {/* <Checkbox id="tooling" /> */}
                {/* <Label htmlFor="tooling" className="font-normal text-slate-700">Tool / Jig Required for this part?</Label> */}
              </div>
            </>
          )}

          {typeOfWork === "ECN" && (
            <>
              <div className="space-y-2">
                <Label>Existing Part Code <span className="text-red-500">*</span></Label>
                <Input placeholder="Search existing part code..." />
              </div>
              <div className="space-y-2">
                <Label>Nature of Change</Label>
                <Select>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select change type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dimensional">Dimensional</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Process">Process</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Documentation only (Fast track)">Documentation only (Fast track)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>EDOF Reference <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. EDOF/26/014" />
              </div>
            </>
          )}

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <Label>CPL Change Point Sheet (.xlsx) <span className="text-red-500">*</span></Label>
              <div 
                onClick={() => setExcelAttached(!excelAttached)}
                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all ${excelAttached ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}`}
              >
                {excelAttached ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-emerald-700">target_costing_v2.xlsx attached</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-medium text-slate-700">Click to upload mandatory .xlsx template</p>
                    <p className="text-xs text-slate-500 mt-1">Sourcing requires this for budget alignment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-slate-100">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button 
          disabled={!excelAttached || !typeOfWork}
          onClick={() => setStep(3)}
          className="bg-amber-600 hover:bg-amber-700 text-white disabled:bg-slate-300 disabled:text-slate-500"
        >
          Generate Request
        </Button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Automated Dispatch Preview</p>
            <h3 className="text-lg font-bold text-slate-900">New Request Alert: <span className="text-blue-600">{commodity ? spocMap[commodity] : 'SPOC'}</span></h3>
          </div>
          <Mail className="text-blue-900 w-8 h-8 opacity-50" />
        </div>
        
        <div className="bg-white border border-slate-200 rounded-md p-6 font-mono text-sm text-slate-700 shadow-sm">
          <p className="mb-4">From: <span className="font-bold">Amber Auto-Bot</span></p>
          <p className="mb-4">To: <span className="font-bold">{commodity ? spocMap[commodity] : 'Sourcing SPOC'}</span></p>
          <p className="mb-4 text-slate-900 border-b border-slate-100 pb-2">Subject: <span className="font-bold">ACTION REQUIRED - New {typeOfWork} Request for {commodity || 'Component'}</span></p>
          
          <div className="space-y-4 pt-2">
             <p>Dear Sourcing Team,</p>
             <p>A new {typeOfWork} project has been initiated by the R&D division requiring immediate sourcing allocation.</p>
             
             <div className="p-4 bg-slate-50 rounded border border-slate-100">
                <p className="mb-1"><strong>Item Name:</strong> Pending (Generated from form input)</p>
                <p className="mb-1"><strong>Commodity Category:</strong> {commodity || 'N/A'}</p>
                <p className="mb-1"><strong>R&D Division:</strong> Generated from form input</p>
                <p><strong>System Temporary ID:</strong> NPD-FY-2026-TEMP</p>
             </div>
             
             <p className="mt-4"><strong>Attached Documents & Specifications:</strong></p>
             <ul className="list-disc pl-5 mt-2 space-y-1">
               <li className="text-blue-600 underline cursor-pointer">Teamcenter Specification Link (TMC-DRW-LINK)</li>
               <li className="text-blue-600 underline cursor-pointer">Uploaded_Spec_Sheet.pdf</li>
               <li className="text-blue-600 underline cursor-pointer">target_costing_v2.xlsx</li>
             </ul>
             
             <p className="mt-6 font-medium text-slate-900">Please log in to the Amber NPD portal to initiate the Supplier ASR Sync and Bulk RFQ dispatch.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-6 border-t border-slate-100">
        <Button variant="outline" onClick={() => setStep(2)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
        </Button>
        <Button 
          onClick={() => {
            router.push('/')
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Confirm & Dispatch Email
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Request</h1>
        <p className="text-slate-500">Initiate a new component development or change request.</p>
      </div>

      <div className="flex items-center mb-8">
        <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full font-bold ${step >= 1 ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
        <div className={`h-1 w-16 mx-2 shrink-0 rounded ${step >= 2 ? 'bg-blue-900' : 'bg-slate-200'}`}></div>
        <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full font-bold ${step >= 2 ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
        <div className={`h-1 w-16 mx-2 shrink-0 rounded ${step >= 3 ? 'bg-blue-900' : 'bg-slate-200'}`}></div>
        <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full font-bold ${step >= 3 ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
        <span className="ml-4 text-sm font-medium text-slate-500 line-clamp-1">
          {step === 1 ? 'Select Type of Work' : step === 2 ? 'Details & Routing' : 'Dispatch Email Preview'}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  )
}
