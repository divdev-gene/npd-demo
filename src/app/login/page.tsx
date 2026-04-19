"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Box, ShieldCheck, FlaskConical, LayoutDashboard } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return

    setIsLoggingIn(true)
    
    // Simulate network delay for effect
    setTimeout(() => {
      if (selectedRole === "spoc") {
        router.push("/")
      } else if (selectedRole === "lead") {
        router.push("/dashboard/lead")
      } else if (selectedRole === "rnd") {
        router.push("/dashboard/rnd")
      }
    }, 800)
  }

  const roles = [
    {
      id: "spoc",
      title: "Sourcing SPOC",
      desc: "Commodity execution, RFDs, and supplier communication",
      icon: Box,
      color: "bg-blue-600",
      textColor: "text-blue-600",
      lightBg: "bg-blue-50",
      border: "border-blue-200 hover:border-blue-600"
    },
    {
      id: "lead",
      title: "Sourcing Lead",
      desc: "Supplier aggregate monitoring, escalations, and approvals",
      icon: LayoutDashboard,
      color: "bg-emerald-600",
      textColor: "text-emerald-600",
      lightBg: "bg-emerald-50",
      border: "border-emerald-200 hover:border-emerald-600"
    },
    {
      id: "rnd",
      title: "R&D Engineer",
      desc: "Technical testing, Stage 10 PRTD verdicts, and Teamcenter syncs",
      icon: FlaskConical,
      color: "bg-amber-600",
      textColor: "text-amber-600",
      lightBg: "bg-amber-50",
      border: "border-amber-200 hover:border-amber-600"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
             <ShieldCheck className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Amber Enterprises
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500 uppercase tracking-widest">
          Sourcing & NPD Workspace
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-sm text-slate-500 mt-1">Select your demonstrator persona to continue.</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            
            <div className="space-y-3">
              {roles.map((role) => {
                const Icon = role.icon
                const isSelected = selectedRole === role.id
                return (
                  <div 
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected ? role.border + ' ring-4 ring-opacity-20 ' + role.lightBg : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${isSelected ? role.color : 'bg-slate-100'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {role.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {role.desc}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? role.border + ' border-opacity-100 ' + role.color : 'border-slate-300'}`}>
                         {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedRole || isLoggingIn}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all ${
                  !selectedRole 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : isLoggingIn 
                      ? 'bg-slate-800 cursor-wait' 
                      : 'bg-slate-900 hover:bg-slate-800 hover:shadow-md'
                }`}
              >
                {isLoggingIn ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating Workspace...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Launch Sourcing Module <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </div>

          </form>

        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Amber Enterprises India Ltd. &copy; 2026. Internal System Demo.
        </p>

      </div>
    </div>
  )
}
