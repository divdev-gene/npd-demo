"use client"
import { useState, useEffect, useRef } from 'react'
import { Search, Bell, AlertTriangle, FileText, CheckCircle, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { PUSH_NOTIFICATIONS_KEY, type PushNotification } from '@/lib/mockData'

const ROLE_GROUPS = [
  {
    label: "R&D",
    roles: [
      { value: "rnd_user", name: "R&D User",     area: "New Requests" },
      { value: "rnd_head", name: "R&D Head",      area: "All R&D" },
    ]
  },
  {
    label: "Sourcing SPOCs",
    roles: [
      { value: "Rahul Sharma", name: "Rahul Sharma", area: "Plastics" },
      { value: "Karan Mehta",  name: "Karan Mehta",  area: "Sheet Metal" },
      { value: "Priya Rajan",  name: "Priya Rajan",  area: "Electronics & Electrical" },
      { value: "Amit Kumar",   name: "Amit Kumar",   area: "Compressors & Motors" },
      { value: "Varun Joshi",  name: "Varun Joshi",  area: "Packaging & Others" },
    ]
  },
  {
    label: "Leadership",
    roles: [
      { value: "sourcing_head", name: "Sourcing Head", area: "All NPDs" },
    ]
  },
  {
    label: "Plant",
    roles: [
      { value: "plant_user", name: "Plant User", area: "Delivery & Testing" },
    ]
  },
  {
    label: "Administration",
    roles: [
      { value: "super_admin", name: "Super Admin", area: "Full Access" },
    ]
  },
]

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles)

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function getRoleBg(value: string) {
  if (value.startsWith("rnd"))       return "bg-violet-600"
  if (value === "sourcing_head")     return "bg-blue-800"
  if (value === "super_admin")       return "bg-slate-700"
  if (value === "plant_user")        return "bg-orange-600"
  return "bg-teal-600"
}

const FALLBACK_NOTIFS = [
  { icon: "alert" as const, title: "NPD-FY-2026-0018 TAT Breach", body: "Transit Packaging SLA breached Stage 3. Overdue.", time: "10 mins ago" },
  { icon: "check" as const, title: "TQR Verdict: Approved",       body: "BLDC Motor Controller structural sample approved.", time: "2 hours ago" },
  { icon: "mail"  as const, title: "New Pricing Upload",          body: "Tubetech India uploaded costing for Copper Header Tube.", time: "Yesterday" },
]

const PAGE_LABELS: Record<string, { label: string; sub?: string }> = {
  "/dashboard/lead": { label: "Lead Dashboard",  sub: "Sourcing intelligence overview" },
  "/dashboard/rnd":  { label: "R&D Dashboard",   sub: "Engineering team view" },
  "/archive":        { label: "All NPDs",         sub: "NPD repository" },
  "/npd/new":        { label: "Create Request",   sub: "Initiate a new NPD" },
  "/approvals":      { label: "Approvals",        sub: "Pending actions" },
  "/settings":       { label: "Settings",         sub: "System configuration" },
}

export function TopNav() {
  const router   = useRouter()
  const pathname = usePathname()
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [currentRole,    setCurrentRole]    = useState("rnd_user")
  const [pushNotifs,     setPushNotifs]     = useState<PushNotification[]>([])
  const roleRef  = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const loadNotifs = () => {
    const raw = localStorage.getItem(PUSH_NOTIFICATIONS_KEY)
    if (raw) setPushNotifs(JSON.parse(raw))
  }

  useEffect(() => {
    const stored = localStorage.getItem('poc_role')
    if (stored) setCurrentRole(stored)
    else localStorage.setItem('poc_role', 'rnd_user')
    loadNotifs()
    const onStorage = (e: StorageEvent) => { if (e.key === PUSH_NOTIFICATIONS_KEY) loadNotifs() }
    const onPush = () => loadNotifs()
    window.addEventListener('storage', onStorage)
    window.addEventListener('push_notification', onPush)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('push_notification', onPush)
    }
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

  const markAllRead = () => {
    const updated = pushNotifs.map(n => ({ ...n, read: true }))
    setPushNotifs(updated)
    localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(updated))
  }

  const unreadCount = pushNotifs.filter(n => !n.read).length
  const displayNotifs = pushNotifs.length > 0 ? pushNotifs : null

  const active   = ALL_ROLES.find(r => r.value === currentRole) ?? ALL_ROLES[0]
  const pageMeta = PAGE_LABELS[pathname] ?? (pathname.startsWith("/npd/") ? { label: "NPD Detail", sub: "Record view" } : { label: "" })

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-5 relative z-50 shrink-0">

      {/* Left — page title */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[13px] font-semibold text-slate-800 tracking-tight truncate">{pageMeta.label}</span>
        {pageMeta.sub && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="text-[12px] text-slate-400 truncate hidden sm:block">{pageMeta.sub}</span>
          </>
        )}
      </div>

      {/* Centre — search */}
      <div className="flex flex-1 justify-center px-8 max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            className="block w-full rounded-lg border-0 py-1.5 pl-9 pr-12 text-[13px] text-slate-800 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 bg-slate-50/70 outline-none"
            placeholder="Search NPD, part, supplier…"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5 leading-none select-none tracking-wider">⌘K</span>
        </div>
      </div>

      {/* Right — role + bell */}
      <div className="flex items-center gap-2 min-w-0 justify-end">

        {/* Role switcher */}
        <div ref={roleRef} className="relative tour-role-selector">
          <button
            onClick={() => setShowRolePicker(v => !v)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all border ${
              showRolePicker
                ? 'bg-slate-100 border-slate-200 shadow-inner'
                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0 ${getRoleBg(currentRole)}`}>
              {getInitials(active.name)}
            </span>
            <span className="hidden sm:block text-slate-700 max-w-[110px] truncate">{active.name}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${showRolePicker ? 'rotate-180' : ''}`} />
          </button>

          {showRolePicker && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 overflow-hidden z-50">
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Switch Persona</p>
              </div>
              {ROLE_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] bg-slate-50/50 border-b border-slate-50">
                    {group.label}
                  </div>
                  {group.roles.map(role => (
                    <button
                      key={role.value}
                      onClick={() => switchRole(role.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                        currentRole === role.value ? 'bg-slate-900' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold shrink-0 ${getRoleBg(role.value)}`}>
                        {getInitials(role.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-semibold leading-tight truncate ${currentRole === role.value ? 'text-white' : 'text-slate-800'}`}>
                          {role.name}
                        </p>
                        <p className={`text-[10px] truncate ${currentRole === role.value ? 'text-slate-400' : 'text-slate-400'}`}>
                          {role.area}
                        </p>
                      </div>
                      {currentRole === role.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
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
            onClick={() => { setShowNotifs(v => !v); if (!showNotifs) loadNotifs() }}
            className={`relative rounded-lg p-2 transition-colors ${
              showNotifs ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            <Bell className="h-4 w-4" />
            {(unreadCount > 0 || (displayNotifs === null && FALLBACK_NOTIFS.length > 0)) && (
              <span className="absolute top-1 right-1 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold border-[1.5px] border-white leading-none">
                {unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : FALLBACK_NOTIFS.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-slate-900">Notifications</p>
                  {(unreadCount > 0 || displayNotifs === null) && (
                    <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      {unreadCount > 0 ? unreadCount : FALLBACK_NOTIFS.length} new
                    </span>
                  )}
                </div>
                <button onClick={markAllRead} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {displayNotifs ? (
                  [...displayNotifs].reverse().map((n, i) => {
                    const iconMap = {
                      alert:   { Icon: AlertTriangle, color: "text-red-500",     bg: "bg-red-50"     },
                      check:   { Icon: CheckCircle,   color: "text-emerald-500", bg: "bg-emerald-50" },
                      mail:    { Icon: FileText,       color: "text-blue-500",   bg: "bg-blue-50"    },
                      package: { Icon: Package,        color: "text-orange-500", bg: "bg-orange-50"  },
                    }
                    const { Icon, color, bg } = iconMap[n.icon] ?? iconMap.mail
                    return (
                      <div key={n.id} className={`flex gap-3 px-4 py-3.5 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${n.read ? "hover:bg-slate-50" : "bg-blue-50/40 hover:bg-blue-50/60"}`}>
                        <div className={`mt-0.5 w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[12px] font-semibold text-slate-900 leading-tight mb-0.5">{n.title}</p>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{n.time}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  FALLBACK_NOTIFS.map((n, i) => {
                    const iconMap = {
                      alert:   { Icon: AlertTriangle, color: "text-red-500",     bg: "bg-red-50"     },
                      check:   { Icon: CheckCircle,   color: "text-emerald-500", bg: "bg-emerald-50" },
                      mail:    { Icon: FileText,       color: "text-blue-500",   bg: "bg-blue-50"    },
                      package: { Icon: Package,        color: "text-orange-500", bg: "bg-orange-50"  },
                    }
                    const { Icon, color, bg } = iconMap[n.icon]
                    return (
                      <div key={i} className="flex gap-3 px-4 py-3.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                        <div className={`mt-0.5 w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-900 leading-tight mb-0.5">{n.title}</p>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{n.time}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
                <button
                  onClick={() => { setShowNotifs(false); router.push("/settings") }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Configure alerts in Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
