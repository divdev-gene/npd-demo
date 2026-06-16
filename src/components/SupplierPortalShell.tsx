import type { ReactNode } from "react"

interface Props {
  portalLabel: string
  children: ReactNode
  maxWidth?: "2xl" | "3xl" | "4xl"
  noPad?: boolean
}

export function SupplierPortalShell({ portalLabel, children, maxWidth = "3xl", noPad }: Props) {
  const mw = maxWidth === "2xl" ? "max-w-2xl" : maxWidth === "4xl" ? "max-w-4xl" : "max-w-3xl"
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Brand bar — not sticky, no nav links */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-8 py-3.5">
        <div className={`${mw} mx-auto flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-black leading-none">A</span>
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-tight">Amber Enterprises</span>
            <span className="text-slate-200">|</span>
            <span className="text-sm text-slate-500">{portalLabel}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden sm:block">
            Supplier Portal
          </span>
        </div>
      </div>

      <div className={`${mw} mx-auto ${noPad ? "" : "px-4 py-8 space-y-6"}`}>
        {children}
      </div>
    </div>
  )
}
