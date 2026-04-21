"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FlaskConical, Construction, FileCheck2, Timer } from "lucide-react"

export default function RndPocDashboard() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
            <FlaskConical className="w-6 h-6 mr-3 text-blue-600" />
            R&D Engineering Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Component testing queues, compliance verdicts, and Technical drawing push requests.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-3 shadow-sm min-h-[300px]">
        <div className="p-4 bg-amber-100 rounded-full">
           <Construction className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mt-2">R&D View Under Construction</h2>
        <p className="text-slate-600 max-w-md">
          The Sourcing SPOC and Sourcing Lead views were prioritized for Phase 1. 
          The TQR Testing & Verdict queues will be implemented in subsequent phases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 opacity-60">
         <Card className="shadow-none border-dashed bg-slate-50">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center text-slate-600"><Timer className="w-4 h-4 mr-2"/> Sample Receipt / MRN Cleared - Awaiting Test</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-2xl font-bold text-slate-400">14 Samples</p>
            </CardContent>
         </Card>
         <Card className="shadow-none border-dashed bg-slate-50">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center text-slate-600"><FlaskConical className="w-4 h-4 mr-2"/> Testing In-Progress</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-2xl font-bold text-slate-400">8 Samples</p>
            </CardContent>
         </Card>
         <Card className="shadow-none border-dashed bg-slate-50">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center text-slate-600"><FileCheck2 className="w-4 h-4 mr-2"/> Pending Teamcenter Push</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-2xl font-bold text-slate-400">3 Drawings</p>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
