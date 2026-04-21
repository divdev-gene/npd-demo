"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, FileText, Download, UploadCloud, UserCircle, Calendar, Package } from "lucide-react"

export default function SupplierQuotePage() {
  const params = useParams()
  const npdId = params.id as string

  // Simulating fetching details from a database
  const npdData = {
    id: npdId || "NPD-FY-2026-0008",
    itemName: "Variable Logic Controller Unit",
    commodity: "Electronics",
    spocName: "Priya Rajan",
    spocEmail: "priya.rajan@amber.com",
    rAndDTeam: "Jhajjhar RAC",
    validDaysLeft: 6
  }

  const [decision, setDecision] = useState<'pending' | 'accept' | 'reject'>('pending')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmission = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (decision === 'accept') {
      alert("CONFIRMATION SUCCESSFUL.\n\nYour Sample Quantity and Dispatch Date have been recorded. Automated sample dispatch reminders will be fired to your email 2 days prior to your selected date.")
    } else {
      alert("REJECTION LOGGED.\n\nYour comments have been notified to the Sourcing SPOC.")
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-0 text-center py-10">
          <CardContent>
             <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You</h2>
             <p className="text-slate-500">Your response has been securely registered in the Amber NPD Portal.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber Logo" className="h-8 w-auto object-contain" />
            <div className="h-6 w-px bg-slate-300"></div>
            <span className="font-bold text-slate-800 tracking-tight">Supplier Operations</span>
          </div>
          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 px-3 py-1">
             Link Expires in {npdData.validDaysLeft} Days
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Project Intro */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
          <div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 mb-3 border-none">{npdData.id}</Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{npdData.itemName}</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">
              You have been invited by Amber Enterprises to participate in the development and quoting phase for the component listed above. Please find the technical details bound to this request below.
            </p>
          </div>

          <Card className="w-full md:w-auto shrink-0 shadow-sm border-slate-200 bg-white">
            <CardContent className="p-4 flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                  <UserCircle className="w-8 h-8" />
               </div>
               <div>
                  <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Assigned Sourcing SPOC</p>
                  <p className="font-bold text-slate-800">{npdData.spocName}</p>
                  <a href={`mailto:${npdData.spocEmail}`} className="text-sm text-blue-600 hover:underline">{npdData.spocEmail}</a>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
               <CardTitle className="text-lg">Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ul className="divide-y divide-slate-100">
                  <li className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors">
                     <div>
                       <p className="font-semibold text-slate-800 flex items-center"><UploadCloud className="w-4 h-4 mr-2" /> Secure Google Drive Vault</p>
                       <p className="text-xs text-slate-500 mt-1">Contains source CAD files and raw parameters. Access must be granted by {npdData.rAndDTeam} upon request.</p>
                     </div>
                     <Button variant="outline" size="sm" className="mt-3 sm:mt-0" onClick={() => alert("Access request sent to R&D Team. You will receive an email upon approval.")}>Request Access</Button>
                  </li>
                  <li className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                     <div>
                       <p className="font-medium text-slate-800 flex items-center"><FileText className="w-4 h-4 mr-2" /> Base Assembly Drawing (PDF)</p>
                     </div>
                     <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"><Download className="w-4 h-4 mr-2" /> Download</Button>
                  </li>
                  <li className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                     <div>
                       <p className="font-medium text-slate-800 flex items-center"><FileText className="w-4 h-4 mr-2" /> Functional Spec Sheet</p>
                     </div>
                     <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"><Download className="w-4 h-4 mr-2" /> Download</Button>
                  </li>
                  <li className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                     <div>
                       <p className="font-medium text-slate-800 flex items-center border border-emerald-200 bg-emerald-50 text-emerald-800 px-2 py-1 rounded text-sm"><FileText className="w-4 h-4 mr-2" /> CPL Change Point Sheet (.xlsx)</p>
                     </div>
                     <Button variant="ghost" size="sm" className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"><Download className="w-4 h-4 mr-2" /> Download</Button>
                  </li>
               </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
               <CardTitle className="text-lg">Your Response</CardTitle>
               <CardDescription>Are you committing to supplying a quote and samples for this development item?</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 flex flex-col justify-center">
               
               {decision === 'pending' && (
                 <div className="flex flex-col gap-4">
                   <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-base" onClick={() => setDecision('accept')}>
                     <CheckCircle2 className="w-5 h-5 mr-2" /> Accept & Proceed to Commitment
                   </Button>
                   <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50 text-base" onClick={() => setDecision('reject')}>
                     <XCircle className="w-5 h-5 mr-2" /> Decline Opportunity
                   </Button>
                 </div>
               )}

               <form onSubmit={handleSubmission}>
                 {decision === 'reject' && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Reason for Declining</label>
                        <textarea required placeholder="Please provide specific reasoning (Capacity constraints, technical mismatch, etc.)..." className="w-full rounded-md border border-slate-300 p-3 text-sm focus:ring-blue-900 focus:border-blue-900 h-28" />
                      </div>
                      <div className="flex gap-3 pt-2">
                         <Button type="button" variant="outline" onClick={() => setDecision('pending')}>Cancel</Button>
                         <Button type="submit" variant="destructive" className="flex-1">Submit Response</Button>
                      </div>
                    </div>
                 )}

                 {decision === 'accept' && (
                    <div className="space-y-5 pt-2 animate-in fade-in slide-in-from-bottom-2">
                       <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-4">
                          <p className="text-sm text-blue-900 font-medium">Thank you for committing to {npdData.id}. Please specify your initial sample delivery terms below.</p>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center"><Package className="w-4 h-4 mr-1 text-slate-400" /> Sample Quantity</label>
                            <input required type="number" min="1" className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-blue-900 focus:border-blue-900" placeholder="e.g. 5" />
                         </div>
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1 text-slate-400" /> Tentative Dispatch</label>
                            <input required type="date" className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-blue-900 focus:border-blue-900" />
                         </div>
                       </div>
                       
                       <div className="flex gap-3 pt-4">
                         <Button type="button" variant="outline" onClick={() => setDecision('pending')}>Back</Button>
                         <Button type="submit" className="flex-1 bg-blue-900 hover:bg-blue-800 text-white">Confirm Final Offer</Button>
                       </div>
                    </div>
                 )}
               </form>

            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  )
}
