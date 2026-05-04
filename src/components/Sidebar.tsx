"use client"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from "react"
import {
  FilePlus, Archive, CheckCircle, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_META: Record<string, { name: string; label: string; colorClass: string; dot: string }> = {
  rnd_user:       { name: "Ankit Jain",      label: "R&D User",            colorClass: "bg-violet-600", dot: "bg-violet-500" },
  rnd_head:       { name: "Harshit Kumar",    label: "R&D Head",            colorClass: "bg-violet-700", dot: "bg-violet-600" },
  "Rahul Sharma": { name: "Rahul Sharma",     label: "Plastics SPOC",       colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Karan Mehta":  { name: "Karan Mehta",      label: "Sheet Metal SPOC",    colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Priya Rajan":  { name: "Priya Rajan",      label: "Electronics SPOC",    colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Amit Kumar":   { name: "Amit Kumar",       label: "Compressors SPOC",    colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Varun Joshi":  { name: "Varun Joshi",      label: "Packaging SPOC",      colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  sourcing_head:  { name: "Sourcing Head",    label: "Sourcing Leadership", colorClass: "bg-blue-800",   dot: "bg-blue-700"   },
  super_admin:    { name: "Super Admin",      label: "Full Access",         colorClass: "bg-slate-700",  dot: "bg-slate-500"  },
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

type NavLink = {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]  // if set, only shown to these roles; omit for all roles
}

const SPOC_NAMES = ["Rahul Sharma", "Karan Mehta", "Priya Rajan", "Amit Kumar", "Varun Joshi"]
const ALL_ROLES  = ["rnd_user", "rnd_head", ...SPOC_NAMES, "sourcing_head", "super_admin"]

const NAV: NavLink[] = [
  {
    href: '/npd/new',
    label: 'New Request',
    icon: FilePlus,
    roles: ['rnd_user', 'rnd_head', 'super_admin'],
  },
  {
    href: '/dashboard/lead',
    label: 'Dashboard',
    icon: BarChart3,
  },
  {
    href: '/archive',
    label: 'All NPDs',
    icon: Archive,
  },
  {
    href: '/approvals',
    label: 'Approvals',
    icon: CheckCircle,
    roles: ['rnd_head', ...SPOC_NAMES, 'sourcing_head', 'super_admin'],
  },
  {
    href: '/mdm',
    label: 'Master Data',
    icon: Database,
    roles: ['super_admin'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['super_admin', 'sourcing_head'],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [currentRole, setCurrentRole] = useState("rnd_user")
  const [collapsed,   setCollapsed]   = useState(false)

  useEffect(() => {
    const storedRole = localStorage.getItem('poc_role')
    if (storedRole) setCurrentRole(storedRole)
    const storedCollapsed = localStorage.getItem('sidebar_collapsed')
    if (storedCollapsed === 'true') setCollapsed(true)

    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener('rolechange', onRoleChange as EventListener)
    return () => window.removeEventListener('rolechange', onRoleChange as EventListener)
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  const resetAndLogout = () => {
    localStorage.removeItem("has_visited")
    router.push("/login")
  }

  const meta = ROLE_META[currentRole] ?? ROLE_META.rnd_user

  const visibleLinks = NAV.filter(link => !link.roles || link.roles.includes(currentRole))

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-slate-100 bg-white transition-all duration-200",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}
    >
      {/* Branding */}
      {collapsed ? (
        <div className="flex items-center justify-center h-14 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <span className="text-white text-[15px] font-black leading-none select-none">A</span>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-b border-slate-100 px-4 py-3 relative overflow-hidden">
          {/* amber left glow accent */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(180deg,#F59E0B,#D97706)" }} />
          <div className="absolute left-0 top-0 bottom-0 w-8 opacity-[0.04]" style={{ background: "linear-gradient(90deg,#F59E0B,transparent)" }} />
          <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain mb-1.5" />
          <p className="text-[13px] font-bold text-slate-900 leading-tight tracking-tight">NPD Command</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] mt-0.5" style={{ color: "#D97706" }}>Sourcing Tracker</p>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] px-2 mb-1.5">Workspace</p>
        )}
        {visibleLinks.map(link => {
          const Icon     = link.icon
          const isActive = pathname === link.href || (link.href !== '/dashboard/lead' && pathname.startsWith(link.href + '/'))
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "group flex items-center rounded-lg text-[13px] font-medium transition-all select-none",
                collapsed ? "justify-center w-9 h-9 mx-auto" : "gap-2.5 px-3 py-2",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              )}
            >
              <Icon className={cn("shrink-0", collapsed ? "h-4 w-4" : "h-[15px] w-[15px]", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </div>

      {/* Collapse toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center rounded-lg text-[12px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors w-full",
            collapsed ? "justify-center w-9 h-9 mx-auto" : "gap-2 px-3 py-2"
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></>
          }
        </button>
      </div>

      {/* User footer */}
      <div className="border-t border-slate-100 p-2 space-y-1">
        <div className={cn(
          "flex items-center rounded-lg hover:bg-slate-50 transition-colors cursor-default",
          collapsed ? "justify-center p-1.5" : "gap-2.5 px-2 py-1.5"
        )}>
          <div className="relative shrink-0">
            <div className={cn("flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold", meta.colorClass)}>
              {getInitials(meta.name)}
            </div>
            <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white", meta.dot)} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">{meta.name}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">{meta.label}</p>
            </div>
          )}
        </div>

        {/* Reset / logout */}
        <button
          onClick={resetAndLogout}
          title="Reset & back to login"
          className={cn(
            "flex items-center rounded-lg text-[11px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors w-full",
            collapsed ? "justify-center w-9 h-8 mx-auto" : "gap-2 px-2 py-1.5"
          )}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>Reset session</span>}
        </button>
      </div>
    </div>
  )
}
