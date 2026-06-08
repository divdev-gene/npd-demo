"use client"
import { useEffect } from "react"

export default function PerfPatch() {
  useEffect(() => {
    if (typeof performance === "undefined") return
    const orig = performance.measure.bind(performance)
    performance.measure = function (...args) {
      try { return orig(...args) } catch { /* React profiling mark evicted */ }
    } as typeof performance.measure
  }, [])
  return null
}
