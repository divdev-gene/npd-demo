"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Bell, Shield, Plug, Mail, User } from "lucide-react"

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
    }, 600)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your sourcing workspace preferences and integrations.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-900 hover:bg-blue-800 text-white min-w-[120px]"
        >
          {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
        </Button>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="bg-white border text-slate-600 border-slate-200 rounded-lg p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-100"><Bell className="w-4 h-4 mr-2"/> Notifications & Alerts</TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-slate-100"><Plug className="w-4 h-4 mr-2"/> External Integrations</TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-slate-100"><User className="w-4 h-4 mr-2"/> Account & Profile</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-100"><Shield className="w-4 h-4 mr-2"/> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Workflow Triggers</CardTitle>
              <CardDescription>Configure which events trigger an alert in the top navigation bell.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Supplier Document Submission</Label>
                  <p className="text-sm text-slate-500">Receive alerts when suppliers submit quotes or defense documents.</p>
                </div>
                <Checkbox checked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">TAT Health Escalations</Label>
                  <p className="text-sm text-slate-500">Alert me when a part enters Amber (warning) or Red (critical) TAT thresholds.</p>
                </div>
                <Checkbox checked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">R&D PRTD Verdicts</Label>
                  <p className="text-sm text-slate-500">Notify immediately when R&D formally approves or rejects a component.</p>
                </div>
                <Checkbox checked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Email Digest Integrations</CardTitle>
              <CardDescription>Configure offline notification routing.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
               <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-slate-400" />
                  <div>
                    <Label className="text-base">Daily Pipeline Digest</Label>
                    <p className="text-sm text-slate-500">Send an 8:00 AM summary of my pending actions and delayed parts.</p>
                  </div>
                </div>
                <Checkbox />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Enterprise System Auth Tokens</CardTitle>
              <CardDescription>Manage your connections to Amber's core infrastructure.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                   <div className="flex flex-col">
                     <span className="font-bold text-slate-900">Siemens Teamcenter (PLM)</span>
                     <span className="text-sm text-emerald-600 font-medium">✓ Connected</span>
                   </div>
                   <Button variant="outline" size="sm">Revoke Token</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                   <div className="flex flex-col">
                     <span className="font-bold text-slate-900">AICM (Amber Integrated Costing Module)</span>
                     <span className="text-sm text-emerald-600 font-medium">✓ Connected</span>
                   </div>
                   <Button variant="outline" size="sm">Revoke Token</Button>
                </div>
                <div className="flex items-center justify-between pb-2">
                   <div className="flex flex-col">
                     <span className="font-bold text-slate-900">SAP ERP Hub</span>
                     <span className="text-sm text-slate-500 font-medium">Disconneced</span>
                   </div>
                   <Button size="sm" className="bg-blue-900 hover:bg-blue-800 text-white">Connect Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Empty tabs for brevity, to hold the layout structure */}
        <TabsContent value="account" className="mt-6">
           <Card>
              <CardContent className="p-10 text-center text-slate-500">
                 Account profile details synced via Windows Active Directory.
              </CardContent>
           </Card>
        </TabsContent>
        <TabsContent value="security" className="mt-6">
           <Card>
              <CardContent className="p-10 text-center text-slate-500">
                 Role-based access lists and session active-time settings.
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
