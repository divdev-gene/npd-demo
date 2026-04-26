"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { getStageName } from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, CheckCircle, Clock, AlertCircle, FileText, Send, Paperclip, MessageSquare, Mail, ShieldCheck, XCircle } from "lucide-react"

export default function NpdDetailView() {
  const params = useParams()
  const npdId = params.id as string
  const { npds, updateNPD } = useNPDs()

  const npd = npds.find(n => n.id === npdId) || npds[0]
  const [activeStage, setActiveStage] = useState(npd?.stage ?? 1)
  const [currentRole, setCurrentRole] = useState("st_one")
  const [tqrStatus, setTqrStatus] = useState("pending")
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem('poc_role')
    if (stored) setCurrentRole(stored)
  }, [])

  const ntdStages = [
    "Request Initiation", "R&D Internal Review", "NPD Sourcing Allocation", 
    "Supplier Defense", "Sample Submission", "Sample Receipt / MRN",
    "R&D Testing", "TQR Evaluation", "Sample Cost Finalization",
    "FPA (First Part Approval)", "PP Lot Pricing"
  ]

  const stageProgress = ntdStages.map((name, idx) => ({
    step: idx + 1,
    name,
    status: (idx + 1) < activeStage ? "complete" : (idx + 1) === activeStage ? "current" : "upcoming"
  }))

  const advanceStage = () => {
    if (activeStage < 11) {
      const next = activeStage + 1
      setActiveStage(next)
      updateNPD(npdId, { stage: next, stageName: getStageName(next, npd.typeOfWork) })
    }
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
          <Button onClick={advanceStage} className="bg-slate-900 text-white ml-4" disabled={activeStage === 11}>
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
          <TabsTrigger value="supplier" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900">Supplier Sourcing Workflow</TabsTrigger>
          <TabsTrigger value="testing" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900">R&D testing & TQR</TabsTrigger>
          <TabsTrigger value="costing" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900">
            {activeStage >= 9 && <AlertCircle className="w-4 h-4 mr-1 text-amber-600" />} Stage 9: Costing
          </TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-900">Parts & Supplier Tracking</TabsTrigger>
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
                      <p className="text-sm font-medium">Request Accepted by Supplier</p>
                      <p className="text-xs text-slate-500">2 days ago • Tubetech India</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5"><Send className="w-4 h-4 text-blue-500" /></div>
                    <div>
                      <p className="text-sm font-medium">Request Dispatched via ASR</p>
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
           
           {currentRole === 'rnd_head' && activeStage < 3 && (
             <Card className="border-emerald-200 bg-emerald-50 mt-6 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-emerald-900">R&D Head Action Required</CardTitle>
                  <CardDescription className="text-emerald-700">Approve this request to automatically assign the appropriate Sourcing SPOC based on commodity ({npd.itemCategory}).</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" onClick={() => {
                    alert(`REQUEST APPROVED.\n\nAutomated Hand-off Email dispatched to Sourcing Head and ${npd.itemCategory} SPOC.\n\nStatus transitioning to 'NPD Sourcing Allocation'.`);
                    if (activeStage < 3) setActiveStage(3);
                  }}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve Request & Trigger Handoff
                  </Button>
                </CardContent>
             </Card>
           )}
        </TabsContent>

        <TabsContent value="supplier" className="mt-6 space-y-6">
          {(currentRole.startsWith('st_') || currentRole === 'sourcing_head' || currentRole === 'super_admin' || currentRole === 'spoc') ? (
            <Card className="border-slate-200">
               <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                 <div className="flex justify-between items-center">
                   <div>
                     <CardTitle className="text-lg">Sourcing Team Actions (ASR Sync)</CardTitle>
                     <CardDescription>Search ASR registry or trigger bulk quote requests for {npd.itemCategory}</CardDescription>
                   </div>
                   <Button variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
                     <Mail className="w-4 h-4 mr-2" /> Request New Vendor Addition
                   </Button>
                 </div>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                   <div>
                     <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center"><FileText className="w-4 h-4 mr-1 text-slate-500"/> R&D Requirement Brief</h4>
                     <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                       <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Item Name</span><span className="font-semibold text-slate-900">{npd.itemName}</span></div>
                       <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Commodity Target</span><span className="font-semibold text-slate-900">{npd.itemCategory}</span></div>
                       <div><span className="text-slate-500 block text-xs uppercase tracking-wide">Plant / R&D Division</span><span className="font-semibold text-slate-900">{npd.rAndDDivision || "Rajpura Phase 2"}</span></div>
                     </div>
                   </div>
                   <div className="bg-blue-100 text-blue-900 text-xs px-3 py-1.5 rounded-md font-bold self-start md:self-auto border border-blue-200">
                     Requirement Locked
                   </div>
                 </div>

                 <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center justify-between">
                       <span>Categorized Suppliers Available (Commodity: {npd.itemCategory})</span>
                       <Badge className="bg-amber-100 text-amber-800 border-none font-normal">Filtered by Audit Health</Badge>
                    </h3>
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 w-10 text-center">Select</th>
                            <th className="px-4 py-3">Vendor / Capacity Details</th>
                            <th className="px-4 py-3">Audit Score</th>
                            <th className="px-4 py-3">Certifications</th>
                            <th className="px-4 py-3">System Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-center"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"/></td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900 flex items-center gap-2">{npd.supplier} <Badge className="bg-blue-100 text-blue-800 scale-75 transform origin-left">Tier 1</Badge></p>
                              <p className="text-xs text-slate-500 mt-0.5">Commodity Match: <span className="text-emerald-600 font-bold">100%</span></p>
                            </td>
                            <td className="px-4 py-4"><span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">94 / 100</span></td>
                            <td className="px-4 py-4">
                            </td>
                            <td className="px-4 py-4 text-emerald-600 font-medium text-xs"><CheckCircle className="w-3 h-3 inline mr-1"/>Verified Source</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"/></td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900 flex items-center gap-2">Alpha Component Systems <Badge variant="outline" className="scale-75 transform origin-left">Tier 2</Badge></p>
                              <p className="text-xs text-slate-500 mt-0.5">Commodity Match: <span className="text-emerald-600 font-bold">92%</span></p>
                            </td>
                            <td className="px-4 py-4"><span className="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded">86 / 100</span></td>
                            <td className="px-4 py-4">
                              <div className="flex gap-1">
                                 <Badge variant="outline" className="text-[10px] bg-white text-slate-600">ISO 9001:2015</Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-emerald-600 font-medium text-xs"><CheckCircle className="w-3 h-3 inline mr-1"/>Verified Source</td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"/></td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900 flex items-center gap-2">National Metalfabs <Badge variant="outline" className="scale-75 transform origin-left">Tier 2</Badge></p>
                              <p className="text-xs text-slate-500 mt-0.5">Commodity Match: <span className="text-amber-600 font-bold">81%</span></p>
                            </td>
                            <td className="px-4 py-4"><span className="text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded">71 / 100</span></td>
                            <td className="px-4 py-4 text-slate-400 text-xs italic">
                              Pending verification
                            </td>
                            <td className="px-4 py-4 text-amber-600 font-medium text-xs"><AlertCircle className="w-3 h-3 inline mr-1"/>Audit Overdue</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                 </div>

                 <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                     <h4 className="font-bold text-blue-900">Dispatch Bulk RFQ</h4>
                     <p className="text-xs text-blue-700 mt-1 max-w-lg">Selected vendors will receive an automated email grouping the spec sheets and drawings. The submission portal link embedded will be active for exactly <strong>7 Days</strong> with a tentative sample ETA of 10 June 2026.</p>
                   </div>
                   <Button onClick={() => alert("BULK RFQ DISPATCHED\\n\\nEmail sent to selected vendors.\\nSubject: URGENT QUOTE REQUIRED - " + npd.itemName + "\\n\\nTQR evaluation and R&D Final approval will unlock upon quote receipt.")} className="bg-blue-900 text-white min-w-[200px] shrink-0">
                     <Send className="w-4 h-4 mr-2"/> Send Bulk Inquiry
                   </Button>
                 </div>
               </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-slate-500">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Sourcing Actions Locked</h3>
                <p>Only SPOCs and Sourcing personnel can execute vendor selection and bulk RFQ dispatch.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="costing" className="mt-6">
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50 border-b border-amber-100 rounded-t-xl">
              <CardTitle className="text-amber-900 flex items-center">
                Stage 9: Sample Cost Finalization (AICM Integration)
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
              <CardTitle>TQR Scorecard (R&D Sample Evaluation)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              
              {tqrStatus === 'rejecting' ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95">
                  <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                     <h3 className="text-red-800 font-bold mb-2">Initiate Sample Rejection</h3>
                     <div className="space-y-4 mt-4">
                       <div>
                         <label className="text-sm font-medium text-slate-700">Reason for Rejection <span className="text-red-500">*</span></label>
                         <textarea 
                           className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm focus:ring-red-500 focus:border-red-500" 
                           rows={3} 
                           placeholder="Describe dimensional failures, performance gaps, etc."
                           onChange={(e) => setRejectReason(e.target.value)}
                         ></textarea>
                       </div>
                       <div>
                         <label className="text-sm font-medium text-slate-700">Upload Revised Drawing (if any)</label>
                         <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center mt-1 bg-white hover:bg-slate-50 cursor-pointer">
                           <p className="text-sm text-slate-500">Click or drag updated Teamcenter PDF here</p>
                         </div>
                       </div>
                     </div>
                     <div className="mt-6 flex justify-end gap-3">
                       <Button variant="outline" onClick={() => setTqrStatus('pending')}>Cancel</Button>
                       <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!rejectReason} onClick={() => {
                         alert("SAMPLE REJECTED.\n\nAutomated email dispatched to Supplier & Sourcing.\n\nEmail contains:\n1. Your rejection reason\n2. Attached revised drawings\n3. An active portal link for the supplier to submit their 'Revised Sample ETA' and 'Revised Costing'.");
                         setTqrStatus('rejected');
                       }}>
                         Confirm Rejection & Notify Supplier
                       </Button>
                     </div>
                  </div>
                </div>
              ) : tqrStatus === 'rejected' ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center">
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold">Sample Rejected by R&D</h3>
                  <p className="text-sm mt-1">Supplier has been successfully notified to provide an updated sample submission timeline and costing impact.</p>
                </div>
              ) : tqrStatus === 'fully_approved' ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-lg text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold">Sample Fully Approved</h3>
                  <p className="text-sm mt-1">Both R&D User and R&D Head have green-lit this sample. Auto-mail dispatched to Supplier & Sourcing indicating final NPD approval.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 p-6 rounded-lg border border-blue-100 gap-6 mt-2">
                    <div>
                      <p className="text-sm font-bold text-blue-900">Sample Evaluation Actions</p>
                      <p className="text-xs text-blue-700 mt-1">Please review the physical sample and documentation before rendering a final decision.</p>
                    </div>
                    
                    {tqrStatus === 'pending' && (currentRole.startsWith('rnd') || currentRole === 'super_admin') ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus('rejecting')}>
                          <XCircle className="w-4 h-4 mr-2"/> Reject Sample
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTqrStatus('approved_by_user')}>
                          <CheckCircle2 className="w-4 h-4 mr-2"/> Approve (Route to R&D Head)
                        </Button>
                      </div>
                    ) : tqrStatus === 'approved_by_user' && (currentRole === 'rnd_head' || currentRole === 'super_admin') ? (
                      <div className="text-right">
                        <p className="text-emerald-700 font-bold mb-2">✓ R&D User Approved. Awaiting Your Sign-off.</p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-end">
                           <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 bg-white" onClick={() => setTqrStatus('rejecting')}>
                             <XCircle className="w-4 h-4 mr-2"/> Override & Reject
                           </Button>
                           <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                             alert("APPROVAL COMPLETE.\n\nAutomated email dispatched to Supplier & Sourcing stating NPD Request is Fully Approved.");
                             setTqrStatus('fully_approved');
                           }}>
                             <CheckCircle2 className="w-4 h-4 mr-2"/> Final R&D Head Approval
                           </Button>
                        </div>
                      </div>
                    ) : tqrStatus === 'approved_by_user' ? (
                      <div className="text-right">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 text-sm font-medium"><Clock className="w-4 h-4 mr-1"/> Pending R&D Head Approval</Badge>
                      </div>
                    ) : (
                      <div className="text-right text-slate-500 italic text-sm">
                        Action locked for your current role.
                      </div>
                    )}
                  </div>
                </>
              )}
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
                   <p className="font-bold text-slate-900">{npd.supplier} Sales Contact</p>
                   <p className="text-sm text-slate-500">Today, 10:45 AM</p>
                 </div>
                 <p className="text-sm font-semibold mt-1">Re: Clarification on Drawing Tolerances - {npd.id}</p>
                 <p className="text-sm text-slate-600 mt-2 line-clamp-2">Dear Amber Sourcing team, we received the latest rev of the drawing but wanted to confirm if the +/- 0.5mm tolerance on the flare is rigid, as our standard tooling for {npd.itemCategory} is 0.6...</p>
                 <div className="mt-3 flex gap-2">
                   <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"><MessageSquare className="w-3 h-3 mr-1" /> Reply</Badge>
                 </div>
               </div>
               <div className="border-b px-6 py-4 hover:bg-slate-50 opacity-70">
                 <div className="flex justify-between">
                   <p className="font-bold text-slate-900">Amber ASR Auto</p>
                   <p className="text-sm text-slate-500">2 days ago</p>
                 </div>
                 <p className="text-sm font-semibold mt-1">Request Dispatched to Supplier</p>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
              <CardTitle className="text-lg">Multi-Part Tracking Matrix</CardTitle>
              <CardDescription>Consolidated timeline view for up to 30 parts under this NPD project, clubbed by supplier allocation.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <table className="w-full text-sm text-left align-middle border-collapse">
                 <thead className="bg-white text-slate-500 text-xs uppercase border-b border-slate-200">
                   <tr>
                     <th className="px-6 py-4 font-semibold">Part Number</th>
                     <th className="px-6 py-4 font-semibold">Vendors</th>
                     <th className="px-6 py-4 font-semibold">Tentative ETA</th>
                     <th className="px-6 py-4 font-semibold text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                   <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-5 font-bold text-slate-900 w-1/4 align-top">
                       PRT-9921-A
                     </td>
                     <td className="px-6 py-5 align-top">
                        <ul className="space-y-1 list-disc pl-4 text-slate-700">
                           <li>Tubetech India</li>
                           <li>National Metalfabs</li>
                        </ul>
                     </td>
                     <td className="px-6 py-5 align-top">
                        <span className="font-semibold text-slate-700">10 June 2026</span>
                     </td>
                     <td className="px-6 py-5 align-top text-right">
                       <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> On Time</Badge>
                     </td>
                   </tr>
                   <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-5 font-bold text-slate-900 w-1/4 align-top">
                       PRT-9922-B
                     </td>
                     <td className="px-6 py-5 align-top">
                        <ul className="space-y-1 list-disc pl-4 text-slate-700">
                           <li>Supreme Plastics</li>
                        </ul>
                     </td>
                     <td className="px-6 py-5 align-top">
                        <span className="line-through text-slate-400 text-xs mr-2">10 June 2026</span><br/>
                        <span className="text-amber-700 font-bold mt-1 inline-block">16 June 2026</span>
                     </td>
                     <td className="px-6 py-5 align-top text-right">
                       <Badge className="bg-amber-100 text-amber-800 border-amber-200 shadow-sm mt-3"><AlertCircle className="w-3 h-3 mr-1"/> Approval Pending</Badge>
                     </td>
                   </tr>
                   <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-5 font-bold text-slate-900 w-1/4 align-top">
                       PRT-9923-C
                     </td>
                     <td className="px-6 py-5 align-top">
                        <ul className="space-y-1 list-disc pl-4 text-slate-700">
                           <li>Tubetech India</li>
                           <li>Alpha Component Systems</li>
                        </ul>
                     </td>
                     <td className="px-6 py-5 align-top">
                        <span className="line-through text-slate-400 text-xs mr-2">12 June 2026</span><br/>
                        <span className="text-red-700 font-bold mt-1 inline-block">22 June 2026</span>
                     </td>
                     <td className="px-6 py-5 align-top text-right">
                       <Badge className="bg-red-100 text-red-800 border-red-200 shadow-sm mt-3"><XCircle className="w-3 h-3 mr-1"/> Delayed (Rejected)</Badge>
                     </td>
                   </tr>
                 </tbody>
               </table>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Placeholder contents for others to keep it concise */}
      </Tabs>
      
    </div>
  )
}
