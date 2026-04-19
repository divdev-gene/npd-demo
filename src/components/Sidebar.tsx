"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FilePlus, Archive, CheckCircle, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'My Pipeline Board', icon: LayoutDashboard },
    { href: '/npd/new', label: 'Create Request', icon: FilePlus },
    { href: '/dashboard/lead', label: 'Lead Dashboard', icon: BarChart3 },
    { href: '/archive', label: 'All NPDs', icon: Archive },
    { href: '/approvals', label: 'Approvals', icon: CheckCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white tour-sidebar">
      <div className="flex h-16 items-center px-6 border-b border-slate-200">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-blue-600">Amber</span> 
          <span className="text-slate-900 ml-1">NPD</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  isActive 
                    ? "bg-slate-100 text-slate-900" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-slate-900" : "text-slate-400")} />
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="border-t p-4 border-slate-200">
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-700">Rahul Sharma</p>
            <p className="text-xs font-medium text-slate-500">Commodity SPOC</p>
          </div>
        </div>
      </div>
    </div>
  )
}
