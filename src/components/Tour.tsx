"use client"

import { useState, useEffect } from "react"
import { Joyride } from "react-joyride"

export function Tour() {
  const [isMounted, setIsMounted] = useState(false)
  const [run, setRun] = useState(false)

  // Start the tour when the component mounts if not seen before
  useEffect(() => {
    setIsMounted(true)
    const hasSeenTour = localStorage.getItem("amber_tour_completed")
    if (!hasSeenTour) {
      setRun(true)
    }
  }, [])

  const steps: any[] = [
    {
      target: "body",
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">Welcome to Amber NPD!</h3>
          <p className="text-sm text-slate-600">Let's take a quick 4-step tour to familiarize you with the highly dense sourcing workspace.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: ".tour-sidebar",
      content: "This is your main navigation. Switch between your core dashboards like the Pipeline Board and the interactive Archive.",
      placement: "right",
    },
    {
      target: ".tour-role-selector",
      content: "Use this dropdown to switch Personas (SPOC, Sourcing Lead, R&D). It instantly reroutes your view and permissions.",
      placement: "bottom",
    },
    {
      target: ".tour-notifications",
      content: "Keep an eye on alerts here. It routes real-time warnings like TAT SLA Breaches or R&D PRTD Verdicts directly to you.",
      placement: "bottom-end",
    }
  ]

  const handleJoyrideCallback = (data: any) => {
    const { status } = data
    const finishedStatuses: string[] = ["finished", "skipped"]

    if (finishedStatuses.includes(status)) {
      setRun(false)
      localStorage.setItem("amber_tour_completed", "true")
    }
  }

  if (!isMounted) return null

  const JoyrideAny = Joyride as any

  return (
    <JoyrideAny
      callback={handleJoyrideCallback}
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
          textColor: "#334155",
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: "#1e3a8a",
          borderRadius: 4,
          fontSize: 14,
        },
        buttonBack: {
          marginRight: 10,
          color: "#475569",
        },
        buttonSkip: {
          color: "#94a3b8",
        }
      } as any}
    />
  )
}
