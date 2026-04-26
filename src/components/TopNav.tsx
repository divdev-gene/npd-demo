"use client"
import { useState, useEffect } from 'react'
import { Search, Bell, AlertTriangle, FileText, CheckCircle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [showNotifs, setShowNotifs] = useState(false)

  const [currentRole, setCurrentRole] = useState("rnd_user")

  useEffect(() => {
    const stored = localStorage.getItem('poc_role')
    if (stored) {
      setCurrentRole(stored)
    } else {
      localStorage.setItem('poc_role', 'rnd_user')
    }
  }, [])

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value
    setCurrentRole(newRole)
    localStorage.setItem('poc_role', newRole)
    window.dispatchEvent(new CustomEvent('rolechange', { detail: newRole }))
    router.push("/dashboard/lead")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 relative z-50">
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
            placeholder="Search NPD ID, Part Code, or Supplier..."
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        
        <select 
          value={currentRole}
          onChange={handleRoleChange}
          className="text-sm rounded-md border-slate-300 py-1 pl-3 pr-8 focus:ring-blue-900 focus:border-blue-900 bg-slate-50 font-medium text-slate-700 tour-role-selector"
        >
          <optgroup label="R&D">
             <option value="rnd_user">R&D User</option>
             <option value="rnd_head">R&D Head</option>
          </optgroup>
          <optgroup label="Sourcing">
             <option value="sourcing_spoc">Sourcing SPOC</option>
             <option value="sourcing_head">Sourcing Head</option>
          </optgroup>
          <optgroup label="Administration">
             <option value="super_admin">Super Admin</option>
          </optgroup>
        </select>

        <div className="relative tour-notifications">
          <button 
            type="button" 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`relative rounded-full p-1 transition-colors ${showNotifs ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-400 hover:text-slate-500'}`}
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl ring-1 ring-slate-900/10 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Notifications</h3>
                <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                 {/* Notification 1 */}
                 <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-3">
                    <div className="mt-0.5"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                    <div>
                       <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">NPD-FY-2026-0018 TAT Breach</p>
                       <p className="text-xs text-slate-600 line-clamp-2">Transit Packaging SLA has breached Stage 3. Sourcing Impact Assessment overdue by 0 days.</p>
                       <p className="text-[10px] text-slate-400 mt-1 font-medium">10 mins ago</p>
                    </div>
                 </div>
                 {/* Notification 2 */}
                 <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-3">
                    <div className="mt-0.5"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                       <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">TQR Verdict: Approved</p>
                       <p className="text-xs text-slate-600 line-clamp-2">R&D has fully approved the BLDC Motor Controller (NPD-FY-2026-0014) structural sample.</p>
                       <p className="text-[10px] text-slate-400 mt-1 font-medium">2 hours ago</p>
                    </div>
                 </div>
                 {/* Notification 3 */}
                 <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-3">
                    <div className="mt-0.5"><FileText className="w-5 h-5 text-blue-500" /></div>
                    <div>
                       <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">New Pricing Upload</p>
                       <p className="text-xs text-slate-600 line-clamp-2">Tubetech India has uploaded the Supplier Costing module for Copper Header Tube.</p>
                       <p className="text-[10px] text-slate-400 mt-1 font-medium">Yesterday</p>
                    </div>
                 </div>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                <span className="text-sm font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => {
                  setShowNotifs(false)
                  router.push("/settings")
                }}>Configure alerts in Settings</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
