"use client"

import { useState } from "react"
import Link from "next/link"
import { mockNPDs, getStageName } from "@/lib/mockData"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, MessageSquare, CheckCircle, Filter } from "lucide-react"

export default function PipelineBoard() {
  const [filter, setFilter] = useState("All")
  const [refresh, setRefresh] = useState(0)

  // For SPOC Dashboard, we just mock "Rahul Sharma" pipeline.
  const myNPDs = mockNPDs.filter(npd => npd.spoc === "Rahul Sharma" || filter === "All")

  const getTatBadge = (health: string, days: number) => {
    switch (health) {
      case "green": return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none text-[10px] uppercase font-bold tracking-wider">{days}D Left</Badge>
      case "amber": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none text-[10px] uppercase font-bold tracking-wider">{days}D Left</Badge>
      case "red": return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none text-[10px] uppercase font-bold tracking-wider">Due Today</Badge>
      case "black": return <Badge className="bg-slate-900 text-white hover:bg-slate-800 border-none text-[10px] uppercase font-bold tracking-wider">Overdue</Badge>
      default: return <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{days}D</Badge>
    }
  }

  // Group by Stages roughly
  const columns = [
    { id: "new", title: "Initiation & Allocation", stages: [1, 2, 3] },
    { id: "active", title: "Supplier & Samples", stages: [4, 5, 6, 7] },
    { id: "testing", title: "R&D Testing", stages: [8, 9, 10] },
    { id: "closing", title: "Commercial & PP", stages: [11, 12] }
  ]

  const Pill = ({ label, active }: { label: string, active: boolean }) => (
    <button 
      onClick={() => setFilter(label)}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold tracking-tight transition-colors ${
        active 
          ? 'bg-blue-900 text-white shadow-sm' 
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="h-full flex flex-col space-y-4 max-w-[1600px] mx-auto overflow-hidden">
      
      {/* Filters Toolbar */}
      <div className="flex-none flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center space-x-2">
          <Pill label="All" active={filter === "All"} />
          <Pill label="NTD" active={filter === "NTD"} />
          <Pill label="ECN" active={filter === "ECN"} />
          <Pill label="Compliance" active={filter === "Compliance"} />
        </div>
        <button className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm">
          <Filter className="w-4 h-4 mr-2 text-slate-400" /> Filter View
        </button>
      </div>

      {/* Today's Actions */}
      <div className="flex-none">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
          Today's Priority Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm ring-1 ring-slate-100 border-l-4 border-l-red-500 hover:shadow transition-shadow">
            <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overdue Sample</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-base font-bold text-slate-900 leading-tight">NPD-FY-2026-0027</div>
              <p className="text-xs text-slate-500 mt-1">LED Display Panel • -2 Days</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-slate-100 border-l-4 border-l-amber-500 hover:shadow transition-shadow">
            <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wide">Clarification Pending</CardTitle>
              <MessageSquare className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-base font-bold text-slate-900 leading-tight">NPD-FY-2026-0012</div>
              <p className="text-xs text-slate-500 mt-1">New message from Tubetech India</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-slate-100 border-l-4 border-l-emerald-500 hover:shadow transition-shadow">
            <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ready for Commercial</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-base font-bold text-slate-900 leading-tight">NPD-FY-2026-0005</div>
              <p className="text-xs text-slate-500 mt-1">Fan Blade Assembly • Approved</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-2">
        {columns.map(col => {
          const columnNpds = myNPDs.filter(n => col.stages.includes(n.stage))
          return (
            <div 
              key={col.id} 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const npd = mockNPDs.find(n => n.id === id);
                if (npd) {
                  npd.stage = col.stages[0];
                  setRefresh(r => r + 1);
                }
              }}
              className="flex-1 min-w-[300px] max-w-[400px] bg-slate-100/50 rounded-xl p-3 flex flex-col ring-1 ring-slate-200/60 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 px-1 flex-none">
                <h3 className="text-sm font-bold text-slate-700">{col.title}</h3>
                <span className="bg-white ring-1 ring-slate-200 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {columnNpds.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2 scrollbar-thin">
                {columnNpds.map(npd => (
                  <div 
                    key={npd.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", npd.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <Link href={`/npd/${npd.id}`} className="block group">
                      <Card className="border-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] ring-1 ring-slate-200/80 hover:ring-blue-900/30 hover:shadow-md transition-all">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[11px] font-bold text-slate-500 tracking-tight">{npd.id}</span>
                          {getTatBadge(npd.tatHealth, npd.tatDaysRemaining)}
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm leading-tight mb-1 max-w-[90%] group-hover:text-blue-900 transition-colors line-clamp-2">
                          {npd.itemName}
                        </h4>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mb-3">
                          {npd.supplier}
                        </div>
                        
                        <div className="flex items-center bg-slate-50 px-2 py-1.5 rounded-md text-[10px] text-slate-600 ring-1 ring-slate-100 font-bold uppercase tracking-wider">
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              npd.tatHealth === 'green' ? 'bg-emerald-400' :
                              npd.tatHealth === 'amber' ? 'bg-amber-400' : 
                              npd.tatHealth === 'red' ? 'bg-red-400' : 'bg-slate-400'
                          }`}></span>
                          Stage {npd.stage}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
                
                {columnNpds.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium">
                    No requests in this stage
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
    </div>
  )
}
