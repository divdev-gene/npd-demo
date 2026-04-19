"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Database, Code, CheckCircle2, XCircle, ArrowRight, ExternalLink } from "lucide-react"

// Mock approval queue
const initialExternalChanges = [
  {
    id: "APP-001",
    npdId: "NPD-FY-2026-0008",
    npdName: "Compressor Heat Shield",
    sourceSystem: "AICM Cost Engine",
    changeType: "AICM Cost Revision",
    timestamp: "2 hours ago",
    oldValue: "₹ 115.00",
    newValue: "₹ 118.50",
    reason: "Raw material index adjustment Q2",
    escalated: false,
    icon: Database
  },
  {
    id: "APP-002",
    npdId: "NPD-FY-2026-0012",
    npdName: "Copper Header Tube",
    sourceSystem: "Pricing Portal",
    changeType: "Post-Approval Price Update",
    timestamp: "5 hours ago",
    oldValue: "₹ 310.00",
    newValue: "₹ 308.00",
    reason: "Volume discount successfully negotiated",
    escalated: false,
    icon: Database
  },
  {
    id: "APP-003",
    npdId: "NPD-FY-2026-0018",
    npdName: "Transit Packaging - 2Ton RAC",
    sourceSystem: "Siemens Teamcenter",
    changeType: "Drawing Revision Update",
    timestamp: "1 day ago",
    oldValue: "Rev 1",
    newValue: "Rev 2",
    reason: "Tolerance dimension update on side brackets",
    escalated: true,
    icon: Code
  }
]

export default function ApprovalsPage() {
  const [changes, setChanges] = useState(initialExternalChanges)

  const handleAction = (id: string) => {
    setChanges(changes.filter(c => c.id !== id))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approvals Queue</h1>
          <p className="text-sm text-slate-500">Review system changes and critical stage gates.</p>
        </div>
      </div>

      <Tabs defaultValue="external" className="w-full">
        <TabsList className="bg-white border text-slate-600 border-slate-200 rounded-lg p-1 mb-4 h-auto">
          <TabsTrigger value="external" className="py-2 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 font-medium">
            External System Changes 
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{changes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="internal" className="py-2 px-4 data-[state=active]:bg-slate-100 font-medium">
            Internal Stage Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external" className="space-y-4">
          
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start space-x-3 text-amber-900 text-sm mb-6 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Strict Rule Enforcement</p>
              <p className="text-amber-700 mt-1">Changes originating from AICM, Pricing Portal, or Teamcenter are held here in a Pending state. They will not update the canonical NPD record or reflect on the Buyer Link until Approved.</p>
            </div>
          </div>

          {changes.length === 0 ? (
            <div className="w-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
               <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
               <h3 className="text-lg font-bold text-slate-900">All Caught Up</h3>
               <p className="text-slate-500 max-w-sm mx-auto mt-1">There are no pending external changes awaiting your review.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {changes.map((change) => {
                const Icon = change.icon
                return (
                  <Card key={change.id} className={`shadow-sm overflow-hidden border-l-4 ${change.escalated ? 'border-l-red-500' : 'border-l-blue-500 border-slate-200'}`}>
                    <CardHeader className="bg-slate-50/50 py-3 border-b flex flex-row items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-white border border-slate-200 rounded shadow-sm">
                          <Icon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-900">
                            {change.changeType}
                          </CardTitle>
                          <div className="text-xs text-slate-500 mt-0.5">
                            via {change.sourceSystem} • {change.timestamp}
                          </div>
                        </div>
                      </div>
                      {change.escalated && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-none">Escalated (48H limit breached)</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="pt-5 pb-0">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex-1">
                          <Link href={`/npd/${change.npdId}`} className="text-blue-700 font-semibold text-lg hover:underline flex items-center">
                            {change.npdId} <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                          <p className="text-sm text-slate-500 mt-1">{change.npdName}</p>
                        </div>

                        <div className="flex items-center justify-center flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <div className="text-center">
                             <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Old Value</p>
                             <p className="font-mono text-slate-600 line-through decoration-slate-400">{change.oldValue}</p>
                           </div>
                           <ArrowRight className="w-5 h-5 mx-6 text-slate-400" />
                           <div className="text-center">
                             <p className="text-xs font-semibold text-slate-400 uppercase mb-1">New Value</p>
                             <p className="font-mono font-bold text-slate-900">{change.newValue}</p>
                           </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 border border-slate-100">
                        <span className="font-semibold">Source Reason: </span> {change.reason}
                      </div>

                    </CardContent>
                    <CardFooter className="pt-4 flex justify-end space-x-3 bg-white">
                      <Button variant="outline" className="text-slate-600" onClick={() => handleAction(change.id)}>
                         Escalate to Sourcing Lead
                      </Button>
                      <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => handleAction(change.id)}>
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(change.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Update NPD
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="internal">
           <div className="w-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white mt-4">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-500">No Pending Stage Approvals</h3>
              <p className="text-slate-400 max-w-sm mx-auto mt-1">You have no pending Stage 10 (Approval/Reject) tasks at the moment.</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
