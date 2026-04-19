"use client"

import { useParams } from "next/navigation"
import { mockNPDs } from "@/lib/mockData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, CloudUpload, MessageSquare, Download, Clock } from "lucide-react"

export default function SupplierPublicLink() {
  const params = useParams()
  const npdId = params.id as string
  const npd = mockNPDs.find(n => n.id === npdId) || mockNPDs[0]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Request for Development (RFD)</h1>
        <p className="text-lg text-slate-600">Please review the requirements for <span className="font-semibold text-slate-900">{npd.itemName} ({npd.id})</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-slate-100 border-b pb-3">
            <CardTitle className="text-lg font-bold">Requirement Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between border-b border-slate-100 pb-2">
               <span className="text-slate-500">Type</span>
               <span className="font-semibold">{npd.typeOfWork}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
               <span className="text-slate-500">Drawing</span>
               <a href="#" className="font-semibold text-blue-700 flex items-center hover:underline"><Download className="w-3 h-3 mr-1" /> TMC-DRW-0982-v2</a>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
               <span className="text-slate-500">Spec Sheet</span>
               <a href="#" className="font-semibold text-blue-700 flex items-center hover:underline"><Download className="w-3 h-3 mr-1" /> Download PDF</a>
            </div>
            <div className="flex justify-between pt-1">
               <span className="text-slate-500">Required Quantity</span>
               <span className="font-semibold">50 Units / Sample</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50 border-b border-amber-100 pb-3">
            <CardTitle className="text-lg font-bold text-amber-900 flex items-center"><Clock className="w-5 h-5 mr-2" /> Sample Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-black text-slate-900 flex items-end justify-center mb-2">
              {npd.tatDaysRemaining} <span className="text-lg text-slate-500 font-medium ml-2 mb-1">Days Remaining</span>
            </div>
            <p className="text-sm text-amber-800 font-medium">To submit physical sample and documentation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-1 space-y-4">
           <Button className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white">
             <CheckCircle2 className="w-5 h-5 mr-2" /> Accept RFD
           </Button>
           <Button className="w-full h-14 text-lg bg-blue-900 hover:bg-blue-800 text-white">
             <CloudUpload className="w-5 h-5 mr-2" /> Upload Dispatch
           </Button>
           <Button variant="outline" className="w-full h-14 text-lg text-slate-700">
             <MessageSquare className="w-5 h-5 mr-2" /> Raise Clarification
           </Button>
         </div>
         
         <div className="md:col-span-2">
           <Card>
             <CardHeader className="border-b pb-3 bg-slate-50">
               <CardTitle className="text-lg">PRTD Evaluation Criteria Preview</CardTitle>
             </CardHeader>
             <CardContent className="pt-4 text-sm space-y-4">
                <p className="text-slate-600 mb-2">You will be evaluated on the following criteria by Amber R&D:</p>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded border">
                    <span className="font-bold text-slate-900">Price (25%)</span> - Alignment with Amber Cost Target
                  </div>
                  <div className="bg-slate-50 p-3 rounded border">
                    <span className="font-bold text-slate-900">Reliability (30%)</span> - Strict adherence to drawing tolerances.
                  </div>
                  <div className="bg-slate-50 p-3 rounded border">
                    <span className="font-bold text-slate-900">Time / TAT (20%)</span> - Strict adherence to the 45-day sample clock.
                  </div>
                  <div className="bg-slate-50 p-3 rounded border">
                    <span className="font-bold text-slate-900">Delivery (25%)</span> - Transit packaging quality and AWB correctness.
                  </div>
                </div>
             </CardContent>
           </Card>
         </div>
      </div>
    </div>
  )
}
