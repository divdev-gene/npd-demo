"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, AlertTriangle, CalendarDays, PackageOpen, Send, Check } from "lucide-react"

export default function SupplierDispatchUpdatePage() {
  const params = useParams()
  const npdId = params.id as string

  // Simulating fetched initial commitment info
  const npdData = {
    id: npdId || "NPD-FY-2026-0008",
    itemName: "Variable Logic Controller Unit",
    committedQuantity: 5,
    committedDate: "10 June 2026",
    spocName: "Priya Rajan"
  }

  const [status, setStatus] = useState<'pending' | 'on_track' | 'delayed'>('pending')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmission = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-xl w-full shadow-lg border-0 text-center py-10">
          <CardContent>
             <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Update Registered</h2>
             <p className="text-slate-600 mb-6 px-6">
               Your dispatch status has been synchronized with the Amber NPD Portal.
             </p>
             {status === 'delayed' && (
               <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-md mx-6 text-left">
                  <span className="font-bold flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Delay Acknowledged</span>
                  <p className="mt-1">The Amber Sourcing and R&D teams have been notified of your timeline failure and revised date. The team will review your comments to decide whether to continue the part development discussion or formally close the request loop.</p>
               </div>
             )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-8 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/amber-logo.png" alt="Amber Logo" className="h-8 w-auto object-contain" />
            <div className="h-6 w-px bg-slate-300"></div>
            <span className="font-bold text-slate-800 tracking-tight">Supplier Operations</span>
          </div>
          <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 px-3 py-1">
             Dispatch Health Check
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        <div className="text-center mb-8">
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 mb-4 border-none px-3 py-1 text-sm">{npdData.id}</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Sample Dispatch Update Required</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Our records indicate your committed dispatch date is approaching. Please provide an authentic update regarding the delivery of your samples.
          </p>
        </div>

        <Card className="shadow-md border-slate-200">
           <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg">Target Logistics</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col items-center text-center">
                   <PackageOpen className="w-6 h-6 text-slate-400 mb-2" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Part Required</p>
                   <p className="font-semibold text-slate-800 leading-tight mt-1">{npdData.itemName}</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col items-center text-center">
                   <AlertTriangle className="w-6 h-6 text-slate-400 mb-2" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expected Qty</p>
                   <p className="font-semibold text-blue-900 leading-tight mt-1 text-lg">{npdData.committedQuantity} Units</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col items-center text-center">
                   <CalendarDays className="w-6 h-6 text-blue-500 mb-2" />
                   <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Promised Date</p>
                   <p className="font-bold text-blue-900 leading-tight mt-1 text-lg">{npdData.committedDate}</p>
                </div>
              </div>
           </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
             <CardTitle className="text-lg">Dispatch Declaration</CardTitle>
             <CardDescription>Are you able to dispatch the samples by {npdData.committedDate}?</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
               <button 
                 type="button"
                 onClick={() => setStatus('on_track')}
                 className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${status === 'on_track' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50 text-slate-600'}`}
               >
                 <Check className="w-8 h-8" />
                 <span className="font-bold">On Schedule / Dispatched</span>
               </button>
               <button 
                 type="button"
                 onClick={() => setStatus('delayed')}
                 className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${status === 'delayed' ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200 hover:border-red-200 hover:bg-slate-50 text-slate-600'}`}
               >
                 <Clock className="w-8 h-8" />
                 <span className="font-bold">Facing Delays</span>
               </button>
            </div>

            <form onSubmit={handleSubmission}>
               {status === 'on_track' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                     <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg mb-6 text-sm flex gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <p>Excellent. Please make sure to share the Airway Bill / Tracking details via email to <strong>{npdData.spocName}</strong> once the package physically leaves your facility.</p>
                     </div>
                     <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Timeline Integrity</Button>
                  </div>
               )}

               {status === 'delayed' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 space-y-5">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg mb-4 text-sm flex gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>Failing to meet committed timelines triggers an automatic review of the partnership viability for this component. Formal justification is mandatory.</p>
                     </div>

                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Revised Tentative Dispatch Date</label>
                        <input required type="date" className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-red-500 focus:border-red-500" />
                     </div>

                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Detailed Reason for Delay</label>
                        <textarea required placeholder="Explain why the dispatch is delayed (e.g. Tooling issues, material shortage)..." className="w-full rounded-md border border-slate-300 p-3 text-sm focus:ring-red-500 focus:border-red-500 h-28" />
                     </div>

                     <Button type="submit" size="lg" variant="destructive" className="w-full">
                       <Send className="w-4 h-4 mr-2" /> Log Delay & Request Timeline Extension
                     </Button>
                  </div>
               )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
