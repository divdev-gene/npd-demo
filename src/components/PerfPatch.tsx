"use client"
import { useEffect } from "react"

export default function PerfPatch() {
  useEffect(() => {
    if (typeof performance === "undefined") return
    const orig = performance.measure.bind(performance)
    performance.measure = function (name, startOrOptions?, end?) {
      try {
        // Clamp negative start times — React 19 profiling can produce these
        // when marks get evicted from the browser's performance buffer.
        if (typeof startOrOptions === "object" && startOrOptions !== null) {
          const opts = { ...startOrOptions }
          if (typeof opts.start === "number" && opts.start < 0) opts.start = 0
          if (typeof opts.end === "number" && opts.end < 0) opts.end = 0
          return orig(name, opts)
        }
        return orig(name, startOrOptions as string | undefined, end)
      } catch { /* evicted mark — suppress */ }
    } as typeof performance.measure
  }, [])
  return null
}
