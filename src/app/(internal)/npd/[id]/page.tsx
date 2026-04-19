"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { mockNPDs, getStageName } from "@/lib/mockData"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, CheckCircle, Clock, AlertCircle, FileText, Send, Paperclip, MessageSquare } from "lucide-react"

export default function NpdDetailView() {
  const params = useParams()
  const npdId = params.id as string
  
  const npd = mockNPDs.find(n => n.id === npdId) || mockNPDs[0]
  const [activeStage, setActiveStage] = useState(npd.stage)

  const ntdStages = [
    "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation", 
    "RFD Created", "Supplier Defense", "Sample Submission",
    "GRN", "R&D Testing", "PRTD Evaluation",
    "Approval Decision", "Sample Cost Structure", "PP Handover"
  ]

  const stageProgress = ntdStages.map((name, idx) => ({
    step: idx + 1,
    name,
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))

  const advanceStage = () => {
    if (activeStage < 12) setActiveStage(activeStage + 1)
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900">{npd.id}</h1>
            <Badge className="bg-blue-100 text-blue-900 border-none font-semibold text-sm">
              {npd.typeOfWork.split(' ')[0]}
            </Badge>
            {npd.gradeA && <Badge className="bg-purple-100 text-purple-900 border-none">Grade A</Badge>}
          </div>
          <p className="text-slate-500 text-lg">{npd.itemName} <span className="mx-2">•</span> {npd.supplier} <span className="mx-2">•</span> {npd.productLine}</p>
        </div>
        
        <div className="flex items-center space-x-6 text-right">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Current Stage</p>
            <p className="text-xl font-bold text-blue-900">Stage {activeStage}: {getStageName(activeStage, npd.typeOfWork)}</p>
          </div>
          <div className="h-12 w-px bg-slate-200"></div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">TAT Health</p>
            <div className="flex items-center mt-1">
              <span className={`w-3 h-3 rounded-full mr-2 ${
                npd.tatHealth === 'green' ? 'bg-emerald-500' :
                npd.tatHealth === 'amber' ? 'bg-amber-500' :
                npd.tatHealth === 'red' ? 'bg-red-500' : 'bg-slate-900'
              }`}></span>
              <span className="font-bold text-lg">{npd.tatDaysRemaining} Days Left</span>
            </div>
          </div>
          <Button onClick={advanceStage} className="bg-slate-900 text-white ml-4" disabled={activeStage === 12}>
            Demo Advance Stage
          </Button>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <ul className="flex items-center justify-between min-w-[1000px]">
          {stageProgress.map((stage, idx) => (
            <li key={stage.step} className="relative flex-1 text-center">
              {idx !== 0 && (
                <div className={`absolute top-4 left-[-10%] right-[50%] h-0.5 w-[120%] -z-10 ${
                  stage.status === 'complete' || stage.status === 'current' ? 'bg-blue-900' : 'bg-slate-200'
                }`}></div>
              )}
              <div className="flex flex-col items-center group relative cursor-help">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${
                  stage.status === 'complete' ? 'border-emerald-500 text-emerald-500' :
                  stage.status === 'current' ? 'border-blue-900 bg-blue-50 text-blue-900 ring-4 ring-blue-100' :
                  'border-slate-300 text-slate-300'
                }`}>
                  {stage.status === 'complete' ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">{stage.step}</span>}
                </div>
                <div className="absolute top-10 w-24 text-center">
                  <span className={`text-[10px] leading-tight font-medium ${
                    stage.status === 'current' ? 'text-blue-900 font-bold' : 'text-slate-500'
                  }`}>
                    {stage.name}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="h-10"></div> {/* Spacing for labels */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border text-slate-600 border-slate-200 rounded-lg p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900">Overview</TabsTrigger>
          <TabsTrigger value="supplier" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900">Supplier & Samples</TabsTrigger>
          <TabsTrigger value="testing" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900">R&D testing & PRTD</TabsTrigger>
          <TabsTrigger value="costing" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900">
            {activeStage >= 11 && <AlertCircle className="w-4 h-4 mr-1 text-amber-600" />} Stage 11: Costing
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-slate-100">Documents Library</TabsTrigger>
          <TabsTrigger value="mail" className="data-[state=active]:bg-slate-100">Integrated Mail Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
               <CardHeader className="pb-3 border-b">
                 <CardTitle className="text-lg">Initiation Details</CardTitle>
               </CardHeader>
               <CardContent className="pt-4 space-y-4 text-sm">
                 <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Requester</span><span className="font-medium">R&D Team ({npd.rAndDDivision || "Not specified"})</span></div>
                 <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Teamcenter Link</span><a href="#" className="font-medium text-blue-700 hover:underline">TMC-DRW-0982-v2</a></div>
                 <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Target ETA</span><span className="font-medium">10 June 2026</span></div>
                 <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Tooling Required</span><span className="font-medium">Yes</span></div>
               </CardContent>
             </Card>

             <Card>
               <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                 <CardTitle className="text-lg">Activity Log</CardTitle>
               </CardHeader>
               <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                    <div>
                      <p className="text-sm font-medium">RFD Accepted by Supplier</p>
                      <p className="text-xs text-slate-500">2 days ago • Tubetech India</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5"><Send className="w-4 h-4 text-blue-500" /></div>
                    <div>
                      <p className="text-sm font-medium">RFD Dispatched via ASOS</p>
                      <p className="text-xs text-slate-500">3 days ago • Rahul Sharma</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5"><FileText className="w-4 h-4 text-slate-400" /></div>
                    <div>
                      <p className="text-sm font-medium">Request Initiated</p>
                      <p className="text-xs text-slate-500">4 days ago • R&D User</p>
                    </div>
                  </div>
               </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="costing" className="mt-6">
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50 border-b border-amber-100 rounded-t-xl">
              <CardTitle className="text-amber-900 flex items-center">
                Stage 11: Sample Cost Structure (AICM Integration)
              </CardTitle>
              <CardDescription className="text-amber-700">
                Complete this mandatory structure to push to AICM for cost validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Unit Cost Quoted by Supplier (₹)</label>
                    <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="310.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Tooling Cost (Amortized/One-time)</label>
                    <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="0" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700">Primary Pkg</label>
                      <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border" defaultValue="2.5" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Secondary Pkg</label>
                      <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border" defaultValue="0" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Transit Pkg</label>
                      <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border" defaultValue="8.0" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Estimated Transport Cost / Unit</label>
                    <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="15.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Confirmed MOQ</label>
                    <input type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border" defaultValue="5000" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Payment Terms</label>
                    <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 p-2 border">
                      <option>90 Days Credit</option>
                      <option>60 Days Credit</option>
                      <option>LC</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-8">Calculate & Push to AICM</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="mt-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle>PRTD Scorecard (R&D Evaluation)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <h4 className="font-bold text-slate-800">Price (25%)</h4>
                       <Badge variant="outline">Score: 8/10</Badge>
                     </div>
                     <p className="text-xs text-slate-500">Quoted cost vs AICM target.</p>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm font-medium text-blue-900 border-slate-100">
                    Target met comfortably
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <h4 className="font-bold text-slate-800">Reliability (30%)</h4>
                       <Badge variant="outline">Score: 9/10</Badge>
                     </div>
                     <p className="text-xs text-slate-500">Dimensional + Performance test pass rate.</p>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm font-medium text-blue-900 border-slate-100">
                    EDOF/26/112 attached. All limits clear.
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <h4 className="font-bold text-slate-800">Time / TAT (20%)</h4>
                       <Badge variant="outline">Score: 7/10</Badge>
                     </div>
                     <p className="text-xs text-slate-500">Actual TAT vs 45-day target.</p>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm font-medium text-blue-900 border-slate-100">
                    System calculated: 43 Days
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <h4 className="font-bold text-slate-800">Delivery (25%)</h4>
                       <Badge variant="outline">Score: 8/10</Badge>
                     </div>
                     <p className="text-xs text-slate-500">Packaging quality, docs accuracy.</p>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm font-medium text-blue-900 border-slate-100">
                    Packaging intact.
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-between bg-blue-50 p-6 rounded-lg border border-blue-100">
                <div>
                  <p className="text-sm font-medium text-blue-800 uppercase tracking-widest">Composite Score</p>
                  <p className="text-4xl font-extrabold text-blue-900 mt-1">8.0 <span className="text-lg text-blue-700 font-medium">/ 10</span></p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-700 font-bold mb-2">✓ Auto-Suggestion: APPROVE</p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirm R&D Approval</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mail" className="mt-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Integrated Mail Inbox</CardTitle>
              <CardDescription>Emails containing NPD ID</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
               <div className="border-b px-6 py-4 hover:bg-slate-50 cursor-pointer">
                 <div className="flex justify-between">
                   <p className="font-bold text-slate-900">Tubetech Supplier Sales</p>
                   <p className="text-sm text-slate-500">Today, 10:45 AM</p>
                 </div>
                 <p className="text-sm font-semibold mt-1">Re: Clarification on Drawing Tolerances - NPD-FY-2026-0012</p>
                 <p className="text-sm text-slate-600 mt-2 line-clamp-2">Dear Ambeteam, we received the latest rev of the drawing but wanted to confirm if the +/- 0.5mm tolerance on the flare is rigid, as our standard tooling is 0.6...</p>
                 <div className="mt-3 flex gap-2">
                   <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"><MessageSquare className="w-3 h-3 mr-1" /> Reply</Badge>
                 </div>
               </div>
               <div className="border-b px-6 py-4 hover:bg-slate-50 opacity-70">
                 <div className="flex justify-between">
                   <p className="font-bold text-slate-900">Amber ASOS Auto</p>
                   <p className="text-sm text-slate-500">2 days ago</p>
                 </div>
                 <p className="text-sm font-semibold mt-1">RFD Dispatched to Supplier</p>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Placeholder contents for others to keep it concise */}
      </Tabs>
      
    </div>
  )
}
