"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Box, ShieldCheck, FlaskConical, LayoutDashboard, Layers, Check, Zap, Lock } from "lucide-react"

const ROLES = [
  {
    id: "spoc",
    title: "Sourcing SPOC",
    desc: "Commodity execution, RFQ management & supplier communication",
    icon: Box,
    accent: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    activeBorder: "#0891B2",
  },
  {
    id: "lead",
    title: "Sourcing Lead",
    desc: "Pipeline oversight, escalations, approvals & TAT analytics",
    icon: LayoutDashboard,
    accent: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    activeBorder: "#059669",
  },
  {
    id: "rnd",
    title: "R&D Engineer",
    desc: "Sample evaluation, FPA sign-off & technical quality review",
    icon: FlaskConical,
    accent: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    activeBorder: "#7C3AED",
  },
]

const FEATURES = [
  { label: "10-Stage NPD Pipeline",      sub: "End-to-end workflow visibility" },
  { label: "Live TAT & SLA Monitoring",  sub: "Real-time breach alerts" },
  { label: "Vendor RFQ & Quotations",    sub: "Sourcing intelligence layer" },
  { label: "MRN, FPA & Cost Sign-offs",  sub: "Multi-role approval flows" },
]

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isLoggingIn,  setIsLoggingIn]  = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setIsLoggingIn(true)
    setTimeout(() => {
      if (selectedRole === "spoc")       router.push("/")
      else if (selectedRole === "lead")  router.push("/dashboard/lead")
      else if (selectedRole === "rnd")   router.push("/dashboard/rnd")
    }, 700)
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#F8F9FC" }}>

      {/* ── Left panel ────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10 shrink-0"
        style={{ background: "#0F172A" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white text-[13px] font-bold leading-tight tracking-tight">NPD Command</p>
            <p className="text-slate-400 text-[10px] leading-none tracking-widest uppercase">Amber Enterprises</p>
          </div>
        </div>

        {/* Main copy */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-6" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">Sourcing Intelligence Platform</span>
          </div>
          <h1 className="text-white text-3xl font-extrabold leading-tight tracking-tight mb-4">
            Smarter sourcing.<br />
            Faster NPD cycles.
          </h1>
          <p className="text-slate-400 text-[14px] leading-relaxed mb-8">
            From request initiation to PP Lot Pricing — every stage, every role, every decision in one unified workspace.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold leading-tight">{f.label}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-slate-600" />
          <p className="text-slate-600 text-[11px]">Amber Enterprises India Ltd. &copy; 2026 · Internal Demo</p>
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-900 text-[13px] font-bold leading-tight">NPD Command</p>
              <p className="text-slate-400 text-[10px]">Amber Enterprises</p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/80 overflow-hidden">
            <div className="px-7 pt-7 pb-6 border-b border-slate-50">
              <h2 className="text-slate-900 text-xl font-bold tracking-tight">Sign in</h2>
              <p className="text-slate-500 text-[13px] mt-1">Select a demo persona to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="px-7 py-6 space-y-6">
              <div className="space-y-2.5">
                {ROLES.map((role) => {
                  const Icon = role.icon
                  const selected = selectedRole === role.id
                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className="relative flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        border: selected ? `2px solid ${role.activeBorder}` : "2px solid #F1F5F9",
                        background: selected ? role.bg : "#FAFAFA",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: selected ? role.accent : "#E2E8F0" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: selected ? "#fff" : "#94A3B8" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 leading-tight">{role.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{role.desc}</p>
                      </div>
                      <div
                        className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: selected ? role.activeBorder : "#CBD5E1",
                          background: selected ? role.activeBorder : "transparent",
                          width: 18, height: 18,
                        }}
                      >
                        {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                type="submit"
                disabled={!selectedRole || isLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all duration-150"
                style={{
                  background: !selectedRole ? "#CBD5E1" : isLoggingIn ? "#334155" : "#0F172A",
                  cursor: !selectedRole ? "not-allowed" : isLoggingIn ? "wait" : "pointer",
                  boxShadow: selectedRole && !isLoggingIn ? "0 2px 8px rgba(15,23,42,0.25)" : "none",
                }}
              >
                {isLoggingIn ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Launching workspace…
                  </>
                ) : (
                  <>
                    Enter Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5">
            Amber Enterprises India Ltd. · Internal System Demo · 2026
          </p>
        </div>
      </div>
    </div>
  )
}
