"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Wrench, FileEdit, Globe, ShieldCheck, Repeat, ChevronRight, ArrowLeft } from "lucide-react"

const WORK_TYPES = [
  { id: "NTD", title: "New Tool Development (NTD)", desc: "Brand new component. Full 12-stage lifecycle.", icon: Wrench },
  { id: "ECN", title: "Engineering Change Notice", desc: "Change to existing component. Abbreviated flow.", icon: FileEdit },
  { id: "Localisation", title: "Localisation", desc: "Import replacement. Requires cost/compliance check.", icon: Globe },
  { id: "Compliance", title: "Compliance / Regulatory", desc: "BIS, QCO, etc. Document-centric flow.", icon: ShieldCheck },
  { id: "PP", title: "PP (Pre-Production) Repeat", desc: "First production quantity of validated part.", icon: Repeat },
]

export default function NewRequestWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [typeOfWork, setTypeOfWork] = useState("")

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
              <SelectTrigger><SelectValue placeholder="Select product line" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rac">Room Air Conditioners</SelectItem>
                <SelectItem value="cac">Commercial Air Conditioners</SelectItem>
                <SelectItem value="tower">Tower ACs</SelectItem>
                <SelectItem value="purifier">Air Purifiers</SelectItem>
                <SelectItem value="dispenser">Water Dispensers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plant / R&D Division <span className="text-red-500">*</span></Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select R&D Division" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rajpura_rac">Rajpura RAC</SelectItem>
                <SelectItem value="rajpura_grade_a">Rajpura Grade A</SelectItem>
                <SelectItem value="rajpura_commercial">Rajpura Commercial</SelectItem>
                <SelectItem value="jhajjhar_rac">Jhajjhar RAC</SelectItem>
                <SelectItem value="sricity_rac">Sricity RAC</SelectItem>
                <SelectItem value="air_purifier">Air pur</SelectItem>
                <SelectItem value="water_purifier">Water P</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Item Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Copper Header Tube" />
          </div>

          <div className="space-y-2">
            <Label>Item Category (Routes to SPOC) <span className="text-red-500">*</span></Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comm">Commodity-Based Component</SelectItem>
                <SelectItem value="elec">Electronics & Electrical</SelectItem>
                <SelectItem value="pack">Packaging & Others</SelectItem>
                <SelectItem value="comp">Compliance & Regulatory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Technical Required Documents</h3>
          
          {typeOfWork === "NTD" && (
            <>
              <div className="space-y-2">
                <Label>Siemens Teamcenter Drawing Link <span className="text-red-500">*</span></Label>
                <Input placeholder="https://teamcenter.amber.internal/..." type="url" />
                <p className="text-xs text-slate-500">Must be a valid Teamcenter URL</p>
              </div>
              <div className="space-y-2">
                <Label>Drawing Revision No.</Label>
                <Input placeholder="e.g. Rev 0" />
              </div>
              <div className="space-y-2">
                <Label>Spec Sheet</Label>
                <div className="border border-dashed border-slate-300 rounded-md p-4 text-center hover:bg-slate-50 cursor-pointer">
                  <p className="text-sm text-slate-600">Drag & drop or click to upload</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="tooling" />
                <Label htmlFor="tooling" className="font-normal text-slate-700">Tool / Jig Required for this part?</Label>
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
                  <SelectTrigger><SelectValue placeholder="Select change type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dim">Dimensional</SelectItem>
                    <SelectItem value="mat">Material</SelectItem>
                    <SelectItem value="proc">Process</SelectItem>
                    <SelectItem value="des">Design</SelectItem>
                    <SelectItem value="doc">Documentation only (Fast track)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>EDOF Reference <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. EDOF/26/014" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-slate-100">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button 
          onClick={() => {
            // Mock submit
            router.push('/')
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          Submit Request
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
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 1 ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
        <div className={`h-1 w-16 mx-2 rounded ${step >= 2 ? 'bg-blue-900' : 'bg-slate-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 2 ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
        <span className="ml-4 text-sm font-medium text-slate-500">
          {step === 1 ? 'Select Type of Work' : 'Details & Routing'}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>
    </div>
  )
}
