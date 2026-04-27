"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Users, ShieldCheck, Mail, Map, Settings, RotateCcw, Plus, Trash2, GripVertical, FormInput } from "lucide-react"
import { SUPPLIER_FORM_DEFAULTS, SUPPLIER_FORM_KEY, VENDOR_RFQ_TEMPLATE_KEY, DEFAULT_RFQ_TEMPLATE, type FormQuestion } from "@/lib/mockData"

const HEAD_ROLES = ["rnd_head", "sourcing_head", "super_admin"]

const QUESTION_TYPES = [
  { value: "text",     label: "Short Text"    },
  { value: "number",   label: "Number (₹ / qty)" },
  { value: "date",     label: "Date"          },
  { value: "select",   label: "Dropdown"      },
  { value: "file",     label: "File Upload"   },
  { value: "textarea", label: "Long Text"     },
]

export default function SuperAdminPage() {
  const [saving,       setSaving]       = useState(false)
  const [resetting,    setResetting]    = useState(false)
  const [currentRole,  setCurrentRole]  = useState("")
  const [questions,    setQuestions]    = useState<FormQuestion[]>(SUPPLIER_FORM_DEFAULTS)
  const [formSaved,    setFormSaved]    = useState(false)
  const [newLabel,     setNewLabel]     = useState("")
  const [newType,      setNewType]      = useState<FormQuestion["type"]>("text")
  const [newRequired,  setNewRequired]  = useState(false)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editLabel,    setEditLabel]    = useState("")
  const [rfqTemplate,  setRfqTemplate]  = useState(DEFAULT_RFQ_TEMPLATE)
  const [rfqSaved,     setRfqSaved]     = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("poc_role") || ""
    setCurrentRole(role)
    const stored = localStorage.getItem(SUPPLIER_FORM_KEY)
    if (stored) {
      try { setQuestions(JSON.parse(stored)) } catch { /* keep defaults */ }
    }
    const savedTemplate = localStorage.getItem(VENDOR_RFQ_TEMPLATE_KEY)
    if (savedTemplate) setRfqTemplate(savedTemplate)
  }, [])

  const saveRfqTemplate = () => {
    localStorage.setItem(VENDOR_RFQ_TEMPLATE_KEY, rfqTemplate)
    setRfqSaved(true)
    setTimeout(() => setRfqSaved(false), 2000)
  }

  const saveFormConfig = () => {
    localStorage.setItem(SUPPLIER_FORM_KEY, JSON.stringify(questions))
    setFormSaved(true)
    setTimeout(() => setFormSaved(false), 2000)
  }

  const addQuestion = () => {
    if (!newLabel.trim()) return
    const q: FormQuestion = {
      id: `q_${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
    }
    setQuestions(prev => [...prev, q])
    setNewLabel("")
    setNewType("text")
    setNewRequired(false)
  }

  const deleteQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id))

  const startEdit = (q: FormQuestion) => { setEditingId(q.id); setEditLabel(q.label) }

  const commitEdit = () => {
    setQuestions(prev => prev.map(q => q.id === editingId ? { ...q, label: editLabel } : q))
    setEditingId(null)
    setEditLabel("")
  }

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
          {HEAD_ROLES.includes(currentRole) && (
            <TabsTrigger value="formbuilder" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-900"><FormInput className="w-4 h-4 mr-2"/> Enquiry Form Builder</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="management" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">System Hierarchy (Horizontal Layout)</CardTitle>
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
                 <div className="flex items-center justify-between">
                   <Label className="font-bold text-emerald-900">Bulk RFQ to Vendor</Label>
                   <Button size="sm" onClick={saveRfqTemplate} className="bg-emerald-700 hover:bg-emerald-800 text-white h-7 text-xs">
                     {rfqSaved ? "Saved ✓" : <><Save className="w-3 h-3 mr-1" />Save Template</>}
                   </Button>
                 </div>
                 <textarea
                   className="w-full h-48 p-3 border border-slate-200 rounded-md text-sm font-mono focus:ring-2 focus:ring-emerald-900 focus:border-emerald-900"
                   value={rfqTemplate}
                   onChange={e => setRfqTemplate(e.target.value)}
                 />
                 <p className="text-[10px] text-slate-500">Variables: {"{npd_id}"}, {"{item_name}"}, {"{commodity}"}, {"{vendor_name}"}, {"{portal_link}"}, {"{valid_until}"}, {"{drawing_link}"}</p>
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

        {HEAD_ROLES.includes(currentRole) && (
          <TabsContent value="formbuilder" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Supplier Enquiry Form Builder</CardTitle>
                </div>
                <Button
                  onClick={saveFormConfig}
                  className="bg-purple-700 hover:bg-purple-800 text-white min-w-[130px]"
                >
                  {formSaved ? "Saved ✓" : <><Save className="w-4 h-4 mr-2" /> Save Form</>}
                </Button>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">

                {/* Question list */}
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>

                    {editingId === q.id ? (
                      <input
                        autoFocus
                        className="flex-1 text-sm border border-purple-300 rounded px-2 py-1 focus:ring-purple-400"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === "Enter" && commitEdit()}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(q)}
                        className="flex-1 text-left text-sm font-medium text-slate-800 hover:text-purple-700 truncate"
                        title="Click to rename"
                      >
                        {q.label}
                      </button>
                    )}

                    <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5 uppercase">
                      {QUESTION_TYPES.find(t => t.value === q.type)?.label ?? q.type}
                    </span>
                    {q.required && (
                      <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">Required</span>
                    )}
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="shrink-0 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {questions.length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-6">No questions configured. Add one below.</p>
                )}
              </CardContent>
            </Card>

            {/* Add question */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Add Question</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Question Label</Label>
                    <input
                      type="text"
                      placeholder="e.g. Warranty Period (months)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-purple-400 focus:border-purple-400"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addQuestion()}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-[160px]">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</Label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-purple-400 focus:border-purple-400"
                      value={newType}
                      onChange={e => setNewType(e.target.value as FormQuestion["type"])}
                    >
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      id="newRequired"
                      checked={newRequired}
                      onChange={e => setNewRequired(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-400"
                    />
                    <label htmlFor="newRequired" className="text-sm font-medium text-slate-600 whitespace-nowrap">Required</label>
                  </div>
                  <Button
                    onClick={addQuestion}
                    disabled={!newLabel.trim()}
                    className="bg-purple-700 hover:bg-purple-800 text-white shrink-0 pb-2"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {currentRole === "super_admin" && <Card className="border-red-200 bg-red-50/30">
        <CardHeader className="pb-3 border-b border-red-100">
          <CardTitle className="text-base text-red-700 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Demo Tools
          </CardTitle>
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
