"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Database, Code, CheckCircle2, XCircle, ArrowRight, ExternalLink } from "lucide-react"

const DEFAULT_DELAY_STATUS = { "DEL-001": "pending", "DEL-002": "pending" }
const STORAGE_KEY = "approvals_delay_status"

export default function ApprovalsPage() {
  const [delayStatus, setDelayStatus] = useState<Record<string, string>>(DEFAULT_DELAY_STATUS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setDelayStatus(JSON.parse(stored))
    } catch {}
  }, [])

  const updateDelayStatus = (key: string, value: string) => {
    const next = { ...delayStatus, [key]: value }
    setDelayStatus(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approvals Queue</h1>
          <p className="text-sm text-slate-500">Review system changes and critical stage gates.</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 mt-6">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
           <CardTitle className="text-lg flex justify-between items-center">
              Dispatch Extension Queue
              {Object.values(delayStatus).filter(s => s === 'pending').length > 0 && (
                 <Badge variant="secondary" className="bg-rose-100 text-rose-700">{Object.values(delayStatus).filter(s => s === 'pending').length} Pending</Badge>
              )}
           </CardTitle>
           <CardDescription>Review automated delay flags initiated by vendors from the Update Portal.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
           <table className="w-full text-sm text-left align-middle border-collapse">
             <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-slate-100">
               <tr>
                 <th className="px-6 py-4 font-semibold">Vendor & Part</th>
                 <th className="px-6 py-4 font-semibold">Timeline Shift</th>
                 <th className="px-6 py-4 font-semibold w-1/3">Vendor Reason</th>
                 <th className="px-6 py-4 font-semibold text-right">Sourcing Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 bg-white">
               <tr className="hover:bg-slate-50/50">
                 <td className="px-6 py-5 align-top">
                   <p className="font-bold text-slate-900 mb-1">Alpha Component Systems</p>
                   <Link href="/npd/NPD-FY-2026-0008" className="text-blue-600 hover:underline text-xs flex items-center">NPD-FY-2026-0008 <ExternalLink className="w-3 h-3 ml-1" /></Link>
                 </td>
                 <td className="px-6 py-5 align-top">
                   <div className="flex items-center space-x-2 text-xs mt-1">
                     <span className="text-slate-500 line-through">12 Jun 2026</span>
                     <ArrowRight className="w-3 h-3 text-slate-400" />
                     <span className="font-bold text-rose-600">18 Jun 2026</span>
                   </div>
                 </td>
                 <td className="px-6 py-5 align-top text-slate-600 text-xs italic">
                   &quot;Raw material delay at port. Tooling will be complete but trial run needs extra 6 days.&quot;
                 </td>
                 <td className="px-6 py-5 align-top text-right">
                   {delayStatus["DEL-001"] === "pending" ? (
                     <div className="flex flex-col sm:flex-row gap-2 justify-end mt-1">
                       <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateDelayStatus("DEL-001", "rejected")}>Reject Extension</Button>
                       <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateDelayStatus("DEL-001", "extended")}>Extend Timeline</Button>
                     </div>
                   ) : delayStatus["DEL-001"] === "rejected" ? (
                     <Badge className="bg-red-50 text-red-700 border-red-200 mt-1"><XCircle className="w-3 h-3 mr-1"/> Rejected by Sourcing</Badge>
                   ) : (
                     <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1"><CheckCircle2 className="w-3 h-3 mr-1"/> Horizon Extended</Badge>
                   )}
                 </td>
               </tr>
               <tr className="hover:bg-slate-50/50">
                 <td className="px-6 py-5 align-top">
                   <p className="font-bold text-slate-900 mb-1">Supreme Plastics</p>
                   <Link href="/npd/NPD-FY-2026-0015" className="text-blue-600 hover:underline text-xs flex items-center">NPD-FY-2026-0015 <ExternalLink className="w-3 h-3 ml-1" /></Link>
                 </td>
                 <td className="px-6 py-5 align-top">
                   <div className="flex items-center space-x-2 text-xs mt-1">
                     <span className="text-slate-500 line-through">05 May 2026</span>
                     <ArrowRight className="w-3 h-3 text-slate-400" />
                     <span className="font-bold text-rose-600">20 May 2026</span>
                   </div>
                 </td>
                 <td className="px-6 py-5 align-top text-slate-600 text-xs italic">
                   &quot;Machine breakdown on primary injection unit. Cannot run pilot lot until repaired.&quot;
                 </td>
                 <td className="px-6 py-5 align-top text-right">
                   {delayStatus["DEL-002"] === "pending" ? (
                     <div className="flex flex-col sm:flex-row gap-2 justify-end mt-1">
                       <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateDelayStatus("DEL-002", "rejected")}>Reject Extension</Button>
                       <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateDelayStatus("DEL-002", "extended")}>Extend Timeline</Button>
                     </div>
                   ) : delayStatus["DEL-002"] === "rejected" ? (
                     <Badge className="bg-red-50 text-red-700 border-red-200 mt-1"><XCircle className="w-3 h-3 mr-1"/> Rejected by Sourcing</Badge>
                   ) : (
                     <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-1"><CheckCircle2 className="w-3 h-3 mr-1"/> Horizon Extended</Badge>
                   )}
                 </td>
               </tr>
             </tbody>
           </table>
        </CardContent>
      </Card>
    </div>
  )
}
