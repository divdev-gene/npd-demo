"use client"

import { useParams } from "next/navigation"
import { mockNPDs } from "@/lib/mockData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle } from "lucide-react"

export default function BuyerPublicLink() {
  const params = useParams()
  const npdId = params.id as string
  const npd = mockNPDs.find(n => n.id === npdId) || mockNPDs[0]

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Procurement Readiness View</h1>
        <p className="text-lg text-slate-600">Component Tracker: <span className="font-semibold text-slate-900">{npd.itemName} ({npd.id})</span></p>
      </div>

      <Card>
        <CardHeader className={`${npd.stage >= 10 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-100'} border-b pb-4`}>
          <div className="flex justify-between items-center">
             <CardTitle className="text-xl">Status Summary</CardTitle>
             <span className={`px-3 py-1 rounded-full text-sm font-bold ${npd.stage >= 10 && npd.tatHealth !== 'red' && npd.tatHealth !== 'black' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-900'}`}>
               {npd.stage >= 10 ? 'APPROVED' : 'IN DEVELOPMENT'}
             </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
           <div className="grid grid-cols-2 gap-4 border-b pb-6">
             <div>
               <p className="text-sm font-medium text-slate-500 uppercase">Part Code Issued</p>
               <p className="font-bold text-lg text-slate-900 mt-1">{npd.stage >= 11 ? 'AMB-0412-S' : 'Pending'}</p>
             </div>
             <div>
               <p className="text-sm font-medium text-slate-500 uppercase">AICM Target Cost</p>
               <p className="font-bold text-lg text-slate-900 mt-1">{npd.cost ? `₹${npd.cost.toFixed(2)} / unit` : 'Pending'}</p>
             </div>
           </div>
           
           <div>
             <h3 className="font-bold text-slate-800 mb-4">Pricing Portal Sync Status</h3>
             {npd.stage === 12 ? (
                <div className="flex items-start bg-emerald-50 p-4 rounded border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-3 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-900">Synchronized</span>
                    <p className="text-sm text-emerald-700">Cost structure pushed to ERP and Pricing Portal.</p>
                  </div>
                </div>
             ) : (
                <div className="flex items-start bg-slate-50 p-4 rounded border border-slate-200">
                  <AlertCircle className="w-5 h-5 text-slate-400 mr-3 mt-0.5" />
                  <div>
                     <span className="font-semibold text-slate-700">Pending Approval</span>
                     <p className="text-sm text-slate-500">Awaiting R&D approval and AICM validation before sync.</p>
                  </div>
                </div>
             )}
           </div>

           <div className="pt-4 border-t">
             <label className="text-sm font-bold text-slate-700">Procurement Query (Routes to Sourcing SPOC)</label>
             <textarea className="w-full mt-2 p-3 border border-slate-300 rounded-md bg-white focus:ring-blue-900" rows={3} placeholder="Ask a question about this part's readiness..."></textarea>
             <div className="mt-2 text-right">
               <button className="bg-slate-900 text-white px-4 py-2 rounded font-medium hover:bg-slate-800">Send to SPOC</button>
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
