"use client"

import { useState } from "react"
import Link from "next/link"
import { getStageName } from "@/lib/mockData"
import { useNPDs } from "@/lib/npdContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, SlidersHorizontal } from "lucide-react"

export default function ArchivePage() {
  const { npds } = useNPDs()
  const [searchTerm, setSearchTerm] = useState("")

  const getTatBadge = (health: string, days: number) => {
    switch (health) {
      case "green": return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">{days} Days Left</Badge>
      case "amber": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">{days} Days Left</Badge>
      case "red": return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none">Due Today</Badge>
      case "black": return <Badge className="bg-slate-900 text-white hover:bg-slate-800 border-none">Overdue ({days})</Badge>
      default: return <Badge variant="outline">{days} Days</Badge>
    }
  }

  const filteredNPDs = npds.filter((npd) => {
    const term = searchTerm.toLowerCase()
    return (
      npd.id.toLowerCase().includes(term) ||
      npd.itemName.toLowerCase().includes(term) ||
      npd.supplier.toLowerCase().includes(term) ||
      npd.spoc.toLowerCase().includes(term)
    )
  })

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All NPD Requests</h1>
          <p className="text-sm text-slate-500">Search and filter through the entire historical and active repository.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-900">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by ID, Item, Supplier, or SPOC..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filter Options
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="font-semibold text-slate-600">NPD ID</TableHead>
                <TableHead className="font-semibold text-slate-600">Item Name</TableHead>
                <TableHead className="font-semibold text-slate-600">Type & Vertical</TableHead>
                <TableHead className="font-semibold text-slate-600">Supplier</TableHead>
                <TableHead className="font-semibold text-slate-600">Progress Stage</TableHead>
                <TableHead className="font-semibold text-slate-600">TAT Health</TableHead>
                <TableHead className="font-semibold text-slate-600">SPOC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNPDs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No matching NPD records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredNPDs.map((npd) => (
                  <TableRow key={npd.id} className="hover:bg-blue-50/50 cursor-pointer group transition-colors">
                    <TableCell className="font-medium">
                      <Link href={`/npd/${npd.id}`} className="text-blue-700 hover:underline">
                        {npd.id}
                      </Link>
                      {npd.gradeA && <Badge variant="secondary" className="ml-2 text-[10px] bg-purple-100 text-purple-800 hover:bg-purple-100">Grade A</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 group-hover:text-blue-900">{npd.itemName}</div>
                      <div className="text-xs text-slate-500">{npd.productLine}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{npd.typeOfWork.split(' (')[0]}</div>
                      <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title={npd.itemCategory}>
                        {npd.itemCategory}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {npd.supplier}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm font-medium">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] mr-2">
                          {npd.stage}
                        </span>
                        <span className="text-slate-700">{getStageName(npd.stage, npd.typeOfWork)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTatBadge(npd.tatHealth, npd.tatDaysRemaining)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {npd.spoc}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination mock */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50/30">
          <div>
            Showing <span className="font-medium text-slate-900">{filteredNPDs.length}</span> of <span className="font-medium text-slate-900">{npds.length}</span> results
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-slate-200 rounded text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-100">Next</button>
          </div>
        </div>

      </div>
    </div>
  )
}
