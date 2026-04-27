"use client"
import { useState, useEffect, useRef } from 'react'
import { Search, Bell, AlertTriangle, FileText, CheckCircle, ChevronDown } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

const ROLE_GROUPS = [
  {
    label: "R&D",
    roles: [
      { value: "rnd_user",      name: "R&D User",      area: "New Requests" },
      { value: "rnd_head",      name: "R&D Head",       area: "All R&D" },
    ]
  },
  {
    label: "Sourcing SPOCs",
    roles: [
      { value: "Rahul Sharma",  name: "Rahul Sharma",   area: "Plastics" },
      { value: "Karan Mehta",   name: "Karan Mehta",    area: "Sheet Metal" },
      { value: "Priya Rajan",   name: "Priya Rajan",    area: "Electronics & Electrical" },
      { value: "Amit Kumar",    name: "Amit Kumar",     area: "Compressors & Motors" },
      { value: "Varun Joshi",   name: "Varun Joshi",    area: "Packaging & Others" },
    ]
  },
  {
    label: "Sourcing Leadership",
    roles: [
      { value: "sourcing_head", name: "Sourcing Head",  area: "All NPDs" },
    ]
  },
  {
    label: "Administration",
    roles: [
      { value: "super_admin",   name: "Super Admin",    area: "Full Access" },
    ]
  },
]

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles)

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function getRoleColor(value: string) {
  if (value.startsWith("rnd")) return "bg-violet-600"
  if (value === "sourcing_head") return "bg-blue-900"
  if (value === "super_admin") return "bg-slate-700"
  return "bg-teal-600"
}

const NOTIF_COUNT = 3

export function TopNav() {
  const router   = useRouter()
  const pathname = usePathname()
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [currentRole,    setCurrentRole]    = useState("rnd_user")
  const roleRef  = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('poc_role')
    if (stored) setCurrentRole(stored)
    else localStorage.setItem('poc_role', 'rnd_user')
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setShowRolePicker(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const switchRole = (value: string) => {
    setCurrentRole(value)
    setShowRolePicker(false)
    localStorage.setItem('poc_role', value)
    window.dispatchEvent(new CustomEvent('rolechange', { detail: value }))
    router.push("/dashboard/lead")
  }

  const active = ALL_ROLES.find(r => r.value === currentRole) ?? ALL_ROLES[0]

  // page label from pathname
  const PAGE_LABELS: Record<string, string> = {
    "/dashboard/lead": "Lead Dashboard",
    "/dashboard/rnd":  "R&D Dashboard",
    "/archive":        "All NPDs",
    "/npd/new":        "Create Request",
    "/approvals":      "Approvals",
    "/settings":       "Settings",
  }
  const pageLabel = PAGE_LABELS[pathname] ?? (pathname.startsWith("/npd/") ? "NPD Detail" : "")

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 relative z-50">

      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2 min-w-[160px]">
        {pageLabel && (
          <span className="text-sm font-semibold text-slate-700 tracking-tight">{pageLabel}</span>
        )}
      </div>

      {/* Centre — search */}
      <div className="flex flex-1 justify-center px-6 max-w-xl mx-auto">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            className="block w-full rounded-lg border-0 py-1.5 pl-9 pr-14 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 text-sm bg-slate-50"
            placeholder="Search NPD ID, part, supplier…"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 leading-none select-none">⌘K</span>
        </div>
      </div>

      {/* Right — role pill + bell */}
      <div className="flex items-center gap-3 min-w-[160px] justify-end">

        {/* Role switcher */}
        <div ref={roleRef} className="relative tour-role-selector">
          <button
            onClick={() => setShowRolePicker(v => !v)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors border ${showRolePicker ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0 ${getRoleColor(currentRole)}`}>
              {getInitials(active.name)}
            </span>
            <span className="hidden sm:block text-slate-700 max-w-[120px] truncate">{active.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showRolePicker ? 'rotate-180' : ''}`} />
          </button>

          {showRolePicker && (
            <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {ROLE_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                    {group.label}
                  </div>
                  {group.roles.map(role => (
                    <button
                      key={role.value}
                      onClick={() => switchRole(role.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${currentRole === role.value ? 'bg-blue-50' : ''}`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold shrink-0 ${getRoleColor(role.value)}`}>
                        {getInitials(role.name)}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight truncate ${currentRole === role.value ? 'text-blue-900' : 'text-slate-800'}`}>{role.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{role.area}</p>
                      </div>
                      {currentRole === role.value && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative tour-notifications">
          <button
            type="button"
            onClick={() => setShowNotifs(v => !v)}
            className={`relative rounded-lg p-1.5 transition-colors ${showNotifs ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold border-2 border-white leading-none">
              {NOTIF_COUNT}
            </span>
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-1.5 w-80 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{NOTIF_COUNT}</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-3">
                  <div className="mt-0.5 shrink-0"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight mb-0.5">NPD-FY-2026-0018 TAT Breach</p>
                    <p className="text-xs text-slate-500 line-clamp-2">Transit Packaging SLA breached Stage 3. Overdue by 0 days.</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">10 mins ago</p>
                  </div>
                </div>
                <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-3">
                  <div className="mt-0.5 shrink-0"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight mb-0.5">TQR Verdict: Approved</p>
                    <p className="text-xs text-slate-500 line-clamp-2">BLDC Motor Controller (NPD-FY-2026-0014) structural sample approved.</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">2 hours ago</p>
                  </div>
                </div>
                <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-3">
                  <div className="mt-0.5 shrink-0"><FileText className="w-4 h-4 text-blue-500" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight mb-0.5">New Pricing Upload</p>
                    <p className="text-xs text-slate-500 line-clamp-2">Tubetech India uploaded costing for Copper Header Tube.</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Yesterday</p>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => { setShowNotifs(false); router.push("/settings") }}>
                  Configure alerts in Settings
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
