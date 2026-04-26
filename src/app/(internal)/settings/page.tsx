"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Users, ShieldCheck, Mail, Map, Settings, RotateCcw } from "lucide-react"

export default function SuperAdminPage() {
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [currentRole, setCurrentRole] = useState("")

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "")
  }, [])

  const handleReset = () => {
    setResetting(true)
    setTimeout(() => {
      localStorage.clear()
      window.location.reload()
    }, 400)
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 600)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Super Admin Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage holistic User RBAC, Site Mappings, and Automated Workflows.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white min-w-[120px]">
          {saving ? 'Saved Successfully' : <><Save className="w-4 h-4 mr-2" /> Save Config</>}
        </Button>
      </div>

      <Tabs defaultValue="management" className="w-full">
        <TabsList className="bg-white border text-slate-600 border-slate-200 rounded-lg p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="management" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900"><Map className="w-4 h-4 mr-2"/> User & Site Management</TabsTrigger>
          <TabsTrigger value="rbac" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900"><ShieldCheck className="w-4 h-4 mr-2"/> RBAC Architecture</TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900"><Mail className="w-4 h-4 mr-2"/> Email Templates</TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-slate-100"><Settings className="w-4 h-4 mr-2"/> Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">System Hierarchy (Horizontal Layout)</CardTitle>
              <CardDescription>Drag or assign users across the geographical hierarchy. (Only 1 ID allowed per critical node level)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
               {/* Horizontal Site Layout */}
               <div className="flex flex-row gap-4 overflow-x-auto pb-4">
                  {/* Site 1 */}
                  <div className="flex-1 min-w-[250px] border border-slate-200 bg-slate-50 rounded-lg p-4">
                    <h3 className="font-bold text-slate-900 border-b pb-2 mb-3">Rajpura Grade A Plant</h3>
                    <div className="space-y-3">
                       <div className="text-sm bg-white border border-slate-200 p-2 rounded flex justify-between items-center shadow-sm">
                         <div>
                           <div className="font-semibold text-blue-900">R&D Head</div>
                           <div className="text-xs text-slate-500">rajpura.rnd@amber.com</div>
                         </div>
                         <Badge variant="outline" className="text-[10px]">Primary ID</Badge>
                       </div>
                       <div className="text-sm bg-white border border-slate-200 p-2 rounded flex justify-between items-center opacity-60">
                         <div>
                           <div className="font-semibold text-slate-700">+ Add Assignee</div>
                           <div className="text-[10px] text-red-500 mt-1">Rule: Max 1 Head ID allowed</div>
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Site 2 */}
                  <div className="flex-1 min-w-[250px] border border-slate-200 bg-slate-50 rounded-lg p-4">
                    <h3 className="font-bold text-slate-900 border-b pb-2 mb-3">Jhajjhar RAC</h3>
                    <div className="space-y-3">
                       <div className="text-sm bg-white border border-slate-200 p-2 rounded flex justify-between items-center shadow-sm">
                         <div>
                           <div className="font-semibold text-blue-900">Sourcing Head</div>
                           <div className="text-xs text-slate-500">jhj.sourcing@amber.com</div>
                         </div>
                         <Badge variant="outline" className="text-[10px]">Primary ID</Badge>
                       </div>
                       <div className="text-sm bg-white border border-slate-200 p-2 rounded flex flex-col gap-2 shadow-sm mt-3">
                          <label className="text-xs font-bold text-slate-600">Assign Operations User</label>
                          <select className="text-xs border-slate-200 rounded p-1 w-full">
                            <option>Rishabh S. (SPOC)</option>
                            <option>Amit K. (SPOC)</option>
                          </select>
                       </div>
                    </div>
                  </div>

                  {/* Site 3 */}
                  <div className="flex-1 min-w-[250px] border border-slate-200 bg-slate-50 rounded-lg p-4">
                    <h3 className="font-bold text-slate-900 border-b pb-2 mb-3">Corporate / Sricity</h3>
                    <div className="space-y-3">
                       <div className="text-sm bg-white border border-slate-200 p-2 rounded flex justify-between items-center shadow-sm">
                         <div>
                           <div className="font-semibold text-blue-900">Global Admin</div>
                           <div className="text-xs text-slate-500">global.admin@amber.com</div>
                         </div>
                         <Badge variant="outline" className="text-[10px]">Primary ID</Badge>
                       </div>
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rbac" className="mt-6">
           <Card>
             <CardHeader className="pb-3 border-b">
                <CardTitle>Role-Based Module Distribution</CardTitle>
                <CardDescription>Grant multi-system access to individual user roles.</CardDescription>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse text-sm">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                       <th className="p-3 font-semibold text-slate-600">Role Persona</th>
                       <th className="p-3 font-semibold text-slate-600 text-center">NPD / Pricing System</th>
                       <th className="p-3 font-semibold text-slate-600 text-center">CAPEX Portal</th>
                       <th className="p-3 font-semibold text-slate-600 text-center">INDENT Portal</th>
                       <th className="p-3 font-semibold text-slate-600 text-center">TRANSPORT</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     <tr>
                       <td className="p-3 font-medium">Sourcing Head</td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                     </tr>
                     <tr>
                       <td className="p-3 font-medium">R&D Head</td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                     </tr>
                     <tr>
                       <td className="p-3 font-medium">ST I / SPOC</td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                     </tr>
                     <tr>
                       <td className="p-3 font-medium">Logistics Manager</td>
                       <td className="p-3 text-center"><Checkbox /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                       <td className="p-3 text-center"><Checkbox /></td>
                       <td className="p-3 text-center"><Checkbox checked /></td>
                     </tr>
                   </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <Card>
             <CardHeader className="pb-3 border-b">
                <CardTitle>Mandatory Email Templates</CardTitle>
                <CardDescription>Configure the exact phrasing used when ASR shoots an automated trigger.</CardDescription>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
               <div className="space-y-2">
                 <Label className="font-bold text-blue-900">R&D to Sourcing Handoff Email</Label>
                 <textarea className="w-full h-24 p-3 border border-slate-200 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-900 focus:border-blue-900" 
                  defaultValue={`Subject: NEW NPD ASSIGNMENT - {npd_id} - {item_name}
Hello Sourcing SPOC,

R&D Head has formally approved Request {npd_id}. 
Commodity: {commodity}
Drawing Link: {drawing_link}

Please initiate Supplier Selection immediately.`} 
                 />
                 <p className="text-[10px] text-slate-500">Variables available: {`{npd_id}`}, {`{item_name}`}, {`{commodity}`}, {`{drawing_link}`}</p>
               </div>
               
               <div className="space-y-2 border-t pt-4">
                 <Label className="font-bold text-emerald-900">Bulk RFQ to Vendor (7-Day Validity)</Label>
                 <textarea className="w-full h-32 p-3 border border-slate-200 rounded-md text-sm font-mono focus:ring-2 focus:ring-emerald-900 focus:border-emerald-900" 
                  defaultValue={`Subject: URGENT QUOTE REQUIRED: {npd_id}

Dear Vendor Partner,

Amber is initiating development for {item_name}.
Please find attached specifications and drawings.

PORTAL LINK: https://asr.amber.com/quote/{secure_hash}
(Note: This link remains active for exactly 7 Days)

Tentative Sample Delivery Date: {sample_eta}

Regards,
Amber Sourcing Operations`} 
                 />
               </div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardContent className="p-10 text-center text-slate-500">
               Third-party Enterprise System Auth Tokens (SAP / Teamcenter) configuration view.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {currentRole === "super_admin" && <Card className="border-red-200 bg-red-50/30">
        <CardHeader className="pb-3 border-b border-red-100">
          <CardTitle className="text-base text-red-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Demo Tools
          </CardTitle>
          <CardDescription className="text-red-600/70">
            Resets all session data — NPD records, approvals, and role — back to the original mock state.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-100"
            onClick={handleReset}
            disabled={resetting}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {resetting ? "Resetting…" : "Reset Demo Data"}
          </Button>
        </CardContent>
      </Card>}
    </div>
  )
}

function Badge({ className, children, variant }: any) {
  return <span className={`px-2 py-0.5 rounded-full font-bold ${variant === 'outline' ? 'border border-slate-200 text-slate-600' : 'bg-slate-100 text-slate-800'} ${className}`}>{children}</span>
}
