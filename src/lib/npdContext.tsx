"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { NPDRecord, mockNPDs } from "./mockData"

type NPDContextType = {
  npds: NPDRecord[]
  addNPD: (npd: NPDRecord) => void
  updateNPD: (id: string, updates: Partial<NPDRecord>) => void
}

const NPDContext = createContext<NPDContextType | null>(null)

const STORAGE_KEY = "npd_records_v1"

export function NPDProvider({ children }: { children: ReactNode }) {
  const [npds, setNpds] = useState<NPDRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: NPDRecord[] = JSON.parse(stored)
        const deduped = parsed.filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i)
        setNpds(deduped)
      }
    } catch {
      // fallback to mockNPDs already set
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(npds))
    }
  }, [npds, loaded])

  const addNPD = (npd: NPDRecord) => {
    setNpds(prev => [npd, ...prev])
  }

  const updateNPD = (id: string, updates: Partial<NPDRecord>) => {
    setNpds(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
  }

  return (
    <NPDContext.Provider value={{ npds, addNPD, updateNPD }}>
      {children}
    </NPDContext.Provider>
  )
}

export function useNPDs() {
  const ctx = useContext(NPDContext)
  if (!ctx) throw new Error("useNPDs must be used within NPDProvider")
  return ctx
}
