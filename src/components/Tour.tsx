"use client"

import { useState, useEffect } from "react"
import { Joyride } from "react-joyride"
import { BarChart3, CheckCircle2, Mail, Package, ShieldCheck, Layers } from "lucide-react"

function StepContent({ icon: Icon, tag, title, body, features, featuresRow }: {
  icon?: React.ElementType
  tag?: string
  title: string
  body: string
  features?: { label: string; desc: string }[]
  featuresRow?: boolean
}) {
  return (
    <div className="text-left" style={{ fontFamily: "inherit" }}>
      {tag && (
        <span style={{
          display: "inline-block", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#64748b", background: "#f1f5f9",
          border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", marginBottom: 10
        }}>
          {tag}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        {Icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "#0f172a",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Icon size={18} color="#ffffff" />
          </div>
        )}
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.3 }}>{title}</h3>
      </div>
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 12px 0" }}>{body}</p>
      {features && (
        <div style={{ display: "flex", flexDirection: featuresRow ? "row" : "column", gap: 6, flexWrap: featuresRow ? "wrap" : undefined }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "7px 10px",
              flex: featuresRow ? "1 1 auto" : undefined,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: "#1e3a8a",
                flexShrink: 0, marginTop: 5
              }} />
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{f.label}</span>
                <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WelcomeStep() {
  return (
    <div style={{ textAlign: "center", padding: "4px 0" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: "#0f172a",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px", boxShadow: "0 4px 20px rgba(15,23,42,0.25)"
      }}>
        <Layers size={26} color="#fff" />
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
        color: "#64748b", marginBottom: 8
      }}>
        Amber Enterprises · NPD Module
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 10px", lineHeight: 1.2 }}>
        NPD Command Centre
      </h2>
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.65, margin: "0 0 16px" }}>
        End-to-end sourcing intelligence for New Product Development,
        from request initiation to PP Lot Pricing, all in one workspace.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { label: "8-Stage Pipeline",    color: "#eff6ff", text: "#1d4ed8" },
          { label: "Live KPI Dashboard",  color: "#f0fdf4", text: "#15803d" },
          { label: "Vendor Sourcing",     color: "#fefce8", text: "#a16207" },
          { label: "MRN & FPA Approvals", color: "#fdf4ff", text: "#7e22ce" },
        ].map(b => (
          <span key={b.label} style={{
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: b.color, color: b.text, border: `1px solid ${b.color}`
          }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function PipelineStep() {
  const stages = [
    { n: 1, label: "Request\nInitialisation", color: "#e0e7ff", text: "#3730a3" },
    { n: 2, label: "Supplier Sourcing\n& Confirm",  color: "#dbeafe", text: "#1d4ed8" },
    { n: 3, label: "Supplier\nDispatch",      color: "#ede9fe", text: "#6d28d9" },
    { n: 4, label: "Design and\nFeasibility", color: "#fef3c7", text: "#b45309" },
    { n: 5, label: "RND Testing\n& TQR",      color: "#fef3c7", text: "#b45309" },
    { n: 6, label: "RND\nApproval",           color: "#fde68a", text: "#92400e" },
    { n: 7, label: "PP Pricing",              color: "#d1fae5", text: "#065f46" },
    { n: 8, label: "NPD Summary\n& Closure",  color: "#dcfce7", text: "#166534" },
  ]
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0",
          borderRadius: 4, padding: "2px 8px"
        }}>
          Pipeline
        </span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
        The 8-Stage NPD Pipeline
      </h3>
      <p style={{ fontSize: 12, color: "#475569", margin: "0 0 14px", lineHeight: 1.5 }}>
        Every NPD request flows through a structured lifecycle. The stage tracker on each NPD record shows exactly where it stands.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
        {stages.map(s => (
          <div key={s.n} style={{
            background: s.color, borderRadius: 8, padding: "6px 4px", textAlign: "center"
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.text, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: s.text, lineHeight: 1.3, marginTop: 3, whiteSpace: "pre-line" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Tour() {
  const [isMounted, setIsMounted] = useState(false)
  const [run,        setRun]      = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const seen = localStorage.getItem("amber_tour_completed_v2")
    if (!seen) setRun(true)
  }, [])

  const steps: any[] = [
    {
      target: "body",
      content: <WelcomeStep />,
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "body",
      content: <PipelineStep />,
      placement: "center",
      disableBeacon: true,
    },
    {
      target: ".tour-sidebar",
      content: (
        <StepContent
          icon={BarChart3}
          tag="Navigation"
          title="Your Main Workspace"
          body="The sidebar gives you instant access to every module — Lead Dashboard, All NPDs archive, Approvals queue, and Settings."
          features={[
            { label: "Lead Dashboard",  desc: "Live KPIs, TAT heatmap, stage distribution" },
            { label: "All NPDs",        desc: "Filter, search, and open any record" },
            { label: "Approvals",       desc: "MRN sign-offs and dispatch extensions" },
          ]}
        />
      ),
      placement: "right",
    },
    {
      target: ".tour-notifications",
      content: (
        <StepContent
          icon={Mail}
          tag="Alerts"
          title="Real-time Notifications"
          body="TAT SLA breaches, TQR verdicts, and supplier costing uploads surface here so nothing falls through the cracks."
          features={[
            { label: "TAT Breach alerts", desc: "Auto-flagged when SLA is exceeded" },
            { label: "TQR verdicts",      desc: "R&D approval and rejection outcomes" },
            { label: "Supplier activity", desc: "Submission uploads and status updates" },
          ]}
          featuresRow
        />
      ),
      placement: "bottom-end",
    },
  ]

  const handleCallback = (data: any) => {
    const { status } = data
    if (["finished", "skipped"].includes(status)) {
      setRun(false)
      localStorage.setItem("amber_tour_completed_v2", "true")
    }
  }

  if (!isMounted) return null

  const JoyrideAny = Joyride as any

  return (
    <JoyrideAny
      callback={handleCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          primaryColor: "#0f172a",
          textColor:    "#334155",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          arrowColor:   "#ffffff",
          zIndex: 10000,
          width: 420,
          borderRadius: 16,
        },
        tooltip: {
          borderRadius: 16,
          padding: "20px 22px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipFooter: {
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
        buttonNext: {
          backgroundColor: "#0f172a",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          padding: "8px 20px",
          color: "#ffffff",
          outline: "none",
          border: "none",
        },
        buttonBack: {
          marginRight: 6,
          color: "#64748b",
          fontSize: 13,
          fontWeight: 600,
          background: "transparent",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "7px 16px",
        },
        buttonSkip: {
          color: "#94a3b8",
          fontSize: 12,
          fontWeight: 500,
        },
      } as any}
      locale={{
        back: "Back",
        close: "Close",
        last: "Get Started →",
        next: "Next →",
        skip: "Skip tour",
      }}
    />
  )
}
