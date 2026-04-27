"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from "react"
import { FilePlus, Archive, CheckCircle, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_META: Record<string, { name: string; label: string; color: string }> = {
  rnd_user:       { name: "R&D User",      label: "New Requests",            color: "bg-violet-600" },
  rnd_head:       { name: "R&D Head",       label: "R&D Leadership",          color: "bg-violet-700" },
  "Rahul Sharma": { name: "Rahul Sharma",   label: "Plastics SPOC",           color: "bg-teal-600"   },
  "Karan Mehta":  { name: "Karan Mehta",    label: "Sheet Metal SPOC",        color: "bg-teal-600"   },
  "Priya Rajan":  { name: "Priya Rajan",    label: "Electronics SPOC",        color: "bg-teal-600"   },
  "Amit Kumar":   { name: "Amit Kumar",     label: "Compressors SPOC",        color: "bg-teal-600"   },
  "Varun Joshi":  { name: "Varun Joshi",    label: "Packaging SPOC",          color: "bg-teal-600"   },
  sourcing_head:  { name: "Sourcing Head",  label: "Sourcing Leadership",     color: "bg-blue-900"   },
  super_admin:    { name: "Super Admin",    label: "Full Access",             color: "bg-slate-700"  },
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

const MAIN_LINKS = [
  { href: '/npd/new',       label: 'Create Request', icon: FilePlus,   restrictedTo: ['rnd_user', 'rnd_head', 'super_admin'] },
  { href: '/dashboard/lead',label: 'Lead Dashboard', icon: BarChart3  },
  { href: '/archive',       label: 'All NPDs',       icon: Archive     },
  { href: '/approvals',     label: 'Approvals',      icon: CheckCircle },
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
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
          isActive
            ? "bg-blue-950/[0.07] text-blue-900"
            : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-800"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-900 rounded-full" />
        )}
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-900" : "text-slate-400")} />
        <span>{link.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white tour-sidebar">

      {/* Logo */}
      <div className="flex h-14 items-center px-5 border-b border-slate-100">
        <img src="/amber-logo.png" alt="Amber" className="h-7 w-auto object-contain" />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
        {MAIN_LINKS.map(renderLink)}

        <div className="pt-4 pb-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Admin</p>
          {ADMIN_LINKS.map(renderLink)}
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-1 py-1 rounded-lg">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0", meta.color)}>
            {getInitials(meta.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{meta.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{meta.label}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
