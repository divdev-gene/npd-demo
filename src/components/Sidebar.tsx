"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from "react"
import { FilePlus, Archive, CheckCircle, BarChart3, Settings, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_META: Record<string, { name: string; label: string; colorClass: string; dot: string }> = {
  rnd_user:       { name: "R&D User",      label: "New Requests",        colorClass: "bg-violet-600", dot: "bg-violet-500" },
  rnd_head:       { name: "R&D Head",       label: "R&D Leadership",      colorClass: "bg-violet-700", dot: "bg-violet-600" },
  "Rahul Sharma": { name: "Rahul Sharma",   label: "Plastics SPOC",       colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Karan Mehta":  { name: "Karan Mehta",    label: "Sheet Metal SPOC",    colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Priya Rajan":  { name: "Priya Rajan",    label: "Electronics SPOC",    colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Amit Kumar":   { name: "Amit Kumar",     label: "Compressors SPOC",    colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  "Varun Joshi":  { name: "Varun Joshi",    label: "Packaging SPOC",      colorClass: "bg-teal-600",   dot: "bg-teal-500"   },
  sourcing_head:  { name: "Sourcing Head",  label: "Sourcing Leadership", colorClass: "bg-blue-800",   dot: "bg-blue-700"   },
  super_admin:    { name: "Super Admin",    label: "Full Access",         colorClass: "bg-slate-700",  dot: "bg-slate-500"  },
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

const MAIN_LINKS = [
  { href: '/npd/new',        label: 'Create Request', icon: FilePlus,   restrictedTo: ['rnd_user', 'rnd_head', 'super_admin'] },
  { href: '/dashboard/lead', label: 'Lead Dashboard', icon: BarChart3  },
  { href: '/archive',        label: 'All NPDs',        icon: Archive     },
  { href: '/approvals',      label: 'Approvals',       icon: CheckCircle },
]

const ADMIN_LINKS = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [currentRole, setCurrentRole] = useState("rnd_user")

  useEffect(() => {
    const stored = localStorage.getItem('poc_role')
    if (stored) setCurrentRole(stored)
    const onRoleChange = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener('rolechange', onRoleChange as EventListener)
    return () => window.removeEventListener('rolechange', onRoleChange as EventListener)
  }, [])

  const meta = ROLE_META[currentRole] ?? ROLE_META.rnd_user

  const renderLink = (link: typeof MAIN_LINKS[0]) => {
    if (link.restrictedTo && !link.restrictedTo.includes(currentRole)) return null
    const Icon = link.icon
    const isActive = pathname === link.href
    return (
      <Link
        key={link.href}
        href={link.href}
        className={cn(
          "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative select-none",
          isActive
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        )}
      >
        <Icon className={cn("h-[15px] w-[15px] shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
        <span>{link.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-screen w-[220px] flex-col border-r border-slate-100 bg-white tour-sidebar">

      {/* Branding */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
          <Layers className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-900 leading-tight tracking-tight">NPD Command</p>
          <p className="text-[10px] text-slate-400 leading-none tracking-wide">Amber Enterprises</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] px-3 mb-1.5">Workspace</p>
        {MAIN_LINKS.map(renderLink)}

        <div className="pt-3">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] px-3 mb-1.5">System</p>
          {ADMIN_LINKS.map(renderLink)}
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
          <div className="relative shrink-0">
            <div className={cn("flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold", meta.colorClass)}>
              {getInitials(meta.name)}
            </div>
            <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white", meta.dot)} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">{meta.name}</p>
            <p className="text-[10px] text-slate-400 truncate leading-tight">{meta.label}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
