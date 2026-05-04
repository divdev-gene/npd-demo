"use client"

import { useState, useEffect } from "react"
import {
  Plus, Trash2, Users, Package, MapPin, Building2,
  ShieldCheck, AlertTriangle, CheckCircle2, Search, X, FlaskConical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TEST_TEMPLATES } from "@/lib/mockData"

// ── Types ──────────────────────────────────────────────────────────────────

type MDMUser = {
  id: string; name: string; role: string; email: string; phone: string; department: string
}
type MDMCommodity = {
  id: string; name: string; spoc: string; vendorCount: number; description: string
}
type MDMPlant = {
  id: string; name: string; city: string; state: string; division: string
}
type MDMSupplier = {
  id: string; name: string; tier: "Tier 1" | "Tier 2" | "Tier 3"; commodity: string
  auditScore: number; certifications: string; status: "verified" | "audit_overdue" | "new"
}
type MDMTest = {
  id: string; commodity: string; testName: string; testType: string
  unit: string; expectedRange: string; durationDays: number
}

// ── Seed data ──────────────────────────────────────────────────────────────

const SEED_USERS: MDMUser[] = [
  { id: "u1",  name: "Ankit Jain",      role: "R&D User",       department: "R&D",              email: "ankit.jain@amber.com",      phone: "+91 98100 99001" },
  { id: "u2",  name: "Harshit Kumar",   role: "R&D Head",       department: "R&D",              email: "harshit.kumar@amber.com",   phone: "+91 98100 88002" },
  { id: "u3",  name: "Rahul Sharma",    role: "Sourcing SPOC",  department: "Sourcing",         email: "rahul.sharma@amber.com",    phone: "+91 98100 11223" },
  { id: "u4",  name: "Karan Mehta",     role: "Sourcing SPOC",  department: "Sourcing",         email: "karan.mehta@amber.com",     phone: "+91 98100 44556" },
  { id: "u5",  name: "Priya Rajan",     role: "Sourcing SPOC",  department: "Sourcing",         email: "priya.rajan@amber.com",     phone: "+91 98100 77889" },
  { id: "u6",  name: "Amit Kumar",      role: "Sourcing SPOC",  department: "Sourcing",         email: "amit.kumar@amber.com",      phone: "+91 98100 22334" },
  { id: "u7",  name: "Varun Joshi",     role: "Sourcing SPOC",  department: "Sourcing",         email: "varun.joshi@amber.com",     phone: "+91 98100 55667" },
  { id: "u8",  name: "Sourcing Head",   role: "Sourcing Head",  department: "Leadership",       email: "sourcing.head@amber.com",   phone: "+91 98100 00001" },
  { id: "u9",  name: "Ankit Jain",      role: "R&D User",       department: "R&D",              email: "ankit.jain@amber.com",      phone: "+91 98100 00002" },
  { id: "u10", name: "Super Admin",     role: "Administrator",  department: "IT / Admin",       email: "admin@amber.com",           phone: "+91 98100 00000" },
]

const SEED_COMMODITIES: MDMCommodity[] = [
  { id: "c1", name: "Plastics",                              spoc: "Rahul Sharma", vendorCount: 4, description: "Injection-moulded & extruded plastic components" },
  { id: "c2", name: "Sheet Metal",                           spoc: "Karan Mehta",  vendorCount: 4, description: "Pressed, formed, and welded sheet metal parts" },
  { id: "c3", name: "Electronics & Electrical",              spoc: "Priya Rajan",  vendorCount: 4, description: "PCBs, controllers, wiring harnesses, displays" },
  { id: "c4", name: "Compressors & Motors",                  spoc: "Amit Kumar",   vendorCount: 4, description: "Compressor units, BLDC motors, drive assemblies" },
  { id: "c5", name: "Packaging & Others",                    spoc: "Varun Joshi",  vendorCount: 3, description: "Transit, primary, and secondary packaging materials" },
  { id: "c6", name: "Compliance & Regulatory",               spoc: "Priya Rajan",  vendorCount: 3, description: "Certification and testing laboratory services" },
  { id: "c7", name: "Commodity-Based Component Development", spoc: "Rahul Sharma", vendorCount: 5, description: "Cross-category new component sourcing" },
  { id: "c8", name: "Others",                                spoc: "—",            vendorCount: 2, description: "Miscellaneous and unclassified items" },
]

const SEED_TESTS: MDMTest[] = Object.entries(TEST_TEMPLATES).flatMap(([commodity, tests]) =>
  tests.map((t, i) => ({
    id: `t_${commodity.replace(/\s+/g, "_")}_${i}`,
    commodity,
    testName:      t.testName,
    testType:      t.testType,
    unit:          t.unit,
    expectedRange: t.expectedRange ?? "",
    durationDays:  t.durationDays,
  }))
)

const SEED_PLANTS: MDMPlant[] = [
  { id: "p1", name: "Rajpura Plant – Grade A", city: "Rajpura",  state: "Punjab",        division: "Room Air Conditioners" },
  { id: "p2", name: "Rajpura Plant – Commercial", city: "Rajpura", state: "Punjab",      division: "Commercial Air Conditioners" },
  { id: "p3", name: "Jhajjar Plant",           city: "Jhajjar",   state: "Haryana",       division: "Room Air Conditioners" },
  { id: "p4", name: "Sricity Plant",           city: "Sricity",   state: "Andhra Pradesh",division: "Room Air Conditioners" },
  { id: "p5", name: "Air Purifier Division",   city: "Rajpura",   state: "Punjab",        division: "Air Purifiers" },
  { id: "p6", name: "Water Purifier Division", city: "Rajpura",   state: "Punjab",        division: "Water Dispensers" },
]

const SEED_SUPPLIERS: MDMSupplier[] = [
  { id: "s1",  name: "Tubetech India Pvt Ltd",      tier: "Tier 1", commodity: "Commodity-Based",  auditScore: 94, certifications: "ISO 9001:2015, IATF 16949",  status: "verified"      },
  { id: "s2",  name: "MetalWorks India",             tier: "Tier 1", commodity: "Sheet Metal",      auditScore: 92, certifications: "ISO 9001:2015, IATF 16949",  status: "verified"      },
  { id: "s3",  name: "Alpha Component Systems",      tier: "Tier 2", commodity: "Sheet Metal",      auditScore: 78, certifications: "ISO 9001:2015",              status: "verified"      },
  { id: "s4",  name: "National Metalfabs",           tier: "Tier 2", commodity: "Sheet Metal",      auditScore: 71, certifications: "—",                          status: "audit_overdue" },
  { id: "s5",  name: "Supreme Plastics Ltd",         tier: "Tier 1", commodity: "Plastics",         auditScore: 91, certifications: "ISO 9001:2015, IATF 16949",  status: "verified"      },
  { id: "s6",  name: "Hindustan Polymers Pvt Ltd",   tier: "Tier 1", commodity: "Plastics",         auditScore: 83, certifications: "ISO 9001:2015",              status: "verified"      },
  { id: "s7",  name: "MicroElectrix Systems",        tier: "Tier 1", commodity: "Electronics",      auditScore: 91, certifications: "ISO 9001:2015, UL, CE Mark", status: "verified"      },
  { id: "s8",  name: "Shenzhen Optoelectronics",     tier: "Tier 2", commodity: "Electronics",      auditScore: 83, certifications: "CE Mark, RoHS",              status: "verified"      },
  { id: "s9",  name: "Synapse Electronics Pvt Ltd",  tier: "Tier 2", commodity: "Electronics",      auditScore: 68, certifications: "—",                          status: "audit_overdue" },
  { id: "s10", name: "Tecumseh India Ltd",           tier: "Tier 1", commodity: "Compressors",      auditScore: 95, certifications: "ISO 9001:2015, IATF 16949",  status: "verified"      },
  { id: "s11", name: "Emerson Electric India",       tier: "Tier 1", commodity: "Compressors",      auditScore: 93, certifications: "ISO 9001:2015, UL Listed",   status: "verified"      },
  { id: "s12", name: "Packwell Solutions",           tier: "Tier 1", commodity: "Packaging",        auditScore: 88, certifications: "ISO 9001:2015, FSC",         status: "verified"      },
  { id: "s13", name: "PrintPack Industries",         tier: "Tier 2", commodity: "Packaging",        auditScore: 75, certifications: "ISO 9001:2015",              status: "verified"      },
  { id: "s14", name: "TUV SUD India",                tier: "Tier 1", commodity: "Compliance",       auditScore: 99, certifications: "NABL, ISO 17025",            status: "verified"      },
  { id: "s15", name: "Bureau Veritas",               tier: "Tier 1", commodity: "Compliance",       auditScore: 97, certifications: "NABL, ISO 17025",            status: "verified"      },
]

// ── Storage keys ───────────────────────────────────────────────────────────
const MDM_USERS_KEY      = "mdm_users_v1"
const MDM_COMMODITIES_KEY= "mdm_commodities_v1"
const MDM_PLANTS_KEY     = "mdm_plants_v1"
const MDM_SUPPLIERS_KEY  = "mdm_suppliers_v1"
const MDM_TESTS_KEY      = "mdm_tests_v1"

function loadOrSeed<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : seed
  } catch { return seed }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Helpers ────────────────────────────────────────────────────────────────
type Tab = "users" | "commodities" | "plants" | "suppliers" | "tests"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "users",       label: "Users",       icon: Users        },
  { id: "commodities", label: "Commodities", icon: Package      },
  { id: "plants",      label: "Plants",      icon: Building2    },
  { id: "suppliers",   label: "Suppliers",   icon: MapPin       },
  { id: "tests",       label: "Tests",       icon: FlaskConical },
]

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function TierBadge({ tier }: { tier: string }) {
  const c = tier === "Tier 1" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : tier === "Tier 2" ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-slate-50 text-slate-500 border-slate-200"
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c}`}>{tier}</span>
}

function StatusDot({ status }: { status: string }) {
  if (status === "verified")      return <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold"><CheckCircle2 className="w-3 h-3" />Verified</span>
  if (status === "audit_overdue") return <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold"><AlertTriangle className="w-3 h-3" />Audit Due</span>
  return <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold"><ShieldCheck className="w-3 h-3" />New</span>
}

function SectionHeader({ title, count, onAdd, isAdmin }: {
  title: string; count: number; onAdd: () => void; isAdmin: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">{count} records</p>
      </div>
      {isAdmin && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      )}
    </div>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

// ── Add-form components ────────────────────────────────────────────────────

function AddUserForm({ onAdd, onClose }: { onAdd: (u: MDMUser) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: "", role: "R&D User", department: "R&D", email: "", phone: "" })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name || !f.email) return
    onAdd({ id: uid(), ...f })
    onClose()
  }
  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <Field label="Full Name *"   value={f.name}       onChange={v => setF(p => ({ ...p, name: v }))} />
      <Field label="Email *"       value={f.email}      onChange={v => setF(p => ({ ...p, email: v }))} />
      <Field label="Phone"         value={f.phone}      onChange={v => setF(p => ({ ...p, phone: v }))} />
      <Field label="Department"    value={f.department} onChange={v => setF(p => ({ ...p, department: v }))} />
      <SelectField label="Role" value={f.role} onChange={v => setF(p => ({ ...p, role: v }))}
        options={["R&D User","R&D Head","Sourcing SPOC","Sourcing Head","Administrator"]} />
      <div className="col-span-2 flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Cancel</button>
        <button type="submit"                   className="px-3 py-1.5 text-[12px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add User</button>
      </div>
    </form>
  )
}

function AddCommodityForm({ onAdd, onClose }: { onAdd: (c: MDMCommodity) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: "", spoc: "Rahul Sharma", description: "", vendorCount: 0 })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name) return
    onAdd({ id: uid(), ...f })
    onClose()
  }
  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <Field label="Commodity Name *" value={f.name}       onChange={v => setF(p => ({ ...p, name: v }))} />
      <SelectField label="SPOC" value={f.spoc} onChange={v => setF(p => ({ ...p, spoc: v }))}
        options={["Rahul Sharma","Karan Mehta","Priya Rajan","Amit Kumar","Varun Joshi","—"]} />
      <div className="col-span-2">
        <Field label="Description" value={f.description} onChange={v => setF(p => ({ ...p, description: v }))} />
      </div>
      <div className="col-span-2 flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Cancel</button>
        <button type="submit"                   className="px-3 py-1.5 text-[12px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add Commodity</button>
      </div>
    </form>
  )
}

function AddPlantForm({ onAdd, onClose }: { onAdd: (p: MDMPlant) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: "", city: "", state: "", division: "" })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name) return
    onAdd({ id: uid(), ...f })
    onClose()
  }
  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <Field label="Plant Name *" value={f.name}     onChange={v => setF(p => ({ ...p, name: v }))} />
      <Field label="City"         value={f.city}     onChange={v => setF(p => ({ ...p, city: v }))} />
      <Field label="State"        value={f.state}    onChange={v => setF(p => ({ ...p, state: v }))} />
      <Field label="Division"     value={f.division} onChange={v => setF(p => ({ ...p, division: v }))} />
      <div className="col-span-2 flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Cancel</button>
        <button type="submit"                   className="px-3 py-1.5 text-[12px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add Plant</button>
      </div>
    </form>
  )
}

function AddSupplierForm({ onAdd, onClose }: { onAdd: (s: MDMSupplier) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: "", tier: "Tier 2" as MDMSupplier["tier"], commodity: "", auditScore: 75, certifications: "", status: "new" as MDMSupplier["status"] })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name) return
    onAdd({ id: uid(), ...f })
    onClose()
  }
  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <Field label="Supplier Name *" value={f.name}           onChange={v => setF(p => ({ ...p, name: v }))} />
      <Field label="Commodity"       value={f.commodity}      onChange={v => setF(p => ({ ...p, commodity: v }))} />
      <SelectField label="Tier" value={f.tier} onChange={v => setF(p => ({ ...p, tier: v as MDMSupplier["tier"] }))}
        options={["Tier 1","Tier 2","Tier 3"]} />
      <SelectField label="Status" value={f.status} onChange={v => setF(p => ({ ...p, status: v as MDMSupplier["status"] }))}
        options={["verified","audit_overdue","new"]} />
      <Field label="Audit Score (0–100)" value={String(f.auditScore)} onChange={v => setF(p => ({ ...p, auditScore: Number(v) || 0 }))} />
      <Field label="Certifications"      value={f.certifications}     onChange={v => setF(p => ({ ...p, certifications: v }))} />
      <div className="col-span-2 flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Cancel</button>
        <button type="submit"                   className="px-3 py-1.5 text-[12px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add Supplier</button>
      </div>
    </form>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function AddTestForm({ onAdd, onClose }: { onAdd: (t: MDMTest) => void; onClose: () => void }) {
  const COMMODITY_OPTIONS = Object.keys(TEST_TEMPLATES)
  const TEST_TYPE_OPTIONS  = ["Physical","Mechanical","Thermal","Safety","Dimensional","Corrosion","Surface","Electrical","Functional","Reliability","Compliance","NVH","Quality","Transport","Material","Chemical","QC"]
  const [f, setF] = useState({
    commodity: COMMODITY_OPTIONS[0], testName: "", testType: "Mechanical",
    unit: "", expectedRange: "", durationDays: 1,
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.testName) return
    onAdd({ id: uid(), ...f, durationDays: Number(f.durationDays) || 1 })
    onClose()
  }
  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <SelectField label="Commodity" value={f.commodity} onChange={v => setF(p => ({ ...p, commodity: v }))} options={COMMODITY_OPTIONS} />
      <Field label="Test Name *" value={f.testName} onChange={v => setF(p => ({ ...p, testName: v }))} />
      <SelectField label="Test Type" value={f.testType} onChange={v => setF(p => ({ ...p, testType: v }))} options={TEST_TYPE_OPTIONS} />
      <Field label="Unit" value={f.unit} onChange={v => setF(p => ({ ...p, unit: v }))} />
      <Field label="Expected Range" value={f.expectedRange} onChange={v => setF(p => ({ ...p, expectedRange: v }))} />
      <Field label="TAT (days)" value={String(f.durationDays)} onChange={v => setF(p => ({ ...p, durationDays: Number(v) || 1 }))} />
      <div className="col-span-2 flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg">Cancel</button>
        <button type="submit"                   className="px-3 py-1.5 text-[12px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add Test</button>
      </div>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function MDMPage() {
  const [activeTab,    setActiveTab]    = useState<Tab>("users")
  const [currentRole,  setCurrentRole]  = useState("")
  const [search,       setSearch]       = useState("")
  const [showAddUser,  setShowAddUser]  = useState(false)
  const [showAddComm,  setShowAddComm]  = useState(false)
  const [showAddPlant, setShowAddPlant] = useState(false)
  const [showAddSupp,  setShowAddSupp]  = useState(false)
  const [showAddTest,  setShowAddTest]  = useState(false)

  const [users,       setUsers]       = useState<MDMUser[]>([])
  const [commodities, setCommodities] = useState<MDMCommodity[]>([])
  const [plants,      setPlants]      = useState<MDMPlant[]>([])
  const [suppliers,   setSuppliers]   = useState<MDMSupplier[]>([])
  const [tests,       setTests]       = useState<MDMTest[]>([])

  useEffect(() => {
    setCurrentRole(localStorage.getItem("poc_role") || "")
    setUsers(loadOrSeed(MDM_USERS_KEY, SEED_USERS))
    setCommodities(loadOrSeed(MDM_COMMODITIES_KEY, SEED_COMMODITIES))
    setPlants(loadOrSeed(MDM_PLANTS_KEY, SEED_PLANTS))
    setSuppliers(loadOrSeed(MDM_SUPPLIERS_KEY, SEED_SUPPLIERS))
    // Merge stored custom tests with seed so seed entries are never lost
    const stored: MDMTest[] = loadOrSeed(MDM_TESTS_KEY, [])
    const seedIds = new Set(SEED_TESTS.map(t => t.id))
    const customOnly = stored.filter(t => !seedIds.has(t.id))
    setTests([...SEED_TESTS, ...customOnly])
    const onRole = (e: CustomEvent) => setCurrentRole(e.detail)
    window.addEventListener("rolechange", onRole as EventListener)
    return () => window.removeEventListener("rolechange", onRole as EventListener)
  }, [])

  const isAdmin = currentRole === "super_admin"

  // Persist helpers
  const updateUsers      = (d: MDMUser[])       => { setUsers(d);       save(MDM_USERS_KEY, d)       }
  const updateCommodities= (d: MDMCommodity[])  => { setCommodities(d); save(MDM_COMMODITIES_KEY, d) }
  const updatePlants     = (d: MDMPlant[])      => { setPlants(d);      save(MDM_PLANTS_KEY, d)      }
  const updateSuppliers  = (d: MDMSupplier[])   => { setSuppliers(d);   save(MDM_SUPPLIERS_KEY, d)   }
  const updateTests      = (d: MDMTest[])       => { setTests(d); save(MDM_TESTS_KEY, d.filter(t => !new Set(SEED_TESTS.map(x => x.id)).has(t.id))) }

  const q = search.toLowerCase()

  const filteredUsers      = users.filter(u => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  const filteredCommodities= commodities.filter(c => c.name.toLowerCase().includes(q) || c.spoc.toLowerCase().includes(q))
  const filteredPlants     = plants.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
  const filteredSuppliers  = suppliers.filter(s => s.name.toLowerCase().includes(q) || s.commodity.toLowerCase().includes(q))

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-800">Access Restricted</h2>
          <p className="text-[13px] text-slate-400 mt-1">This section is only available to Super Admins.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900">Master Data</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Manage users, commodities, plants, and suppliers</p>
        </div>
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any record…"
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 self-start">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch("") }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Users ───────────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <SectionHeader title="Users & Personas" count={filteredUsers.length} isAdmin={isAdmin} onAdd={() => setShowAddUser(v => !v)} />
            {showAddUser && <AddUserForm onAdd={u => { updateUsers([...users, u]); setShowAddUser(false) }} onClose={() => setShowAddUser(false)} />}
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                {["Name", "Role", "Department", "Email", "Phone", ""].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] font-semibold text-slate-900">{u.name}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-slate-500">{u.department}</td>
                  <td className="px-5 py-3 text-[12px] text-blue-600 font-mono">{u.email}</td>
                  <td className="px-5 py-3 text-[12px] text-slate-500 font-mono">{u.phone}</td>
                  <td className="px-5 py-3 text-right">
                    <DeleteBtn onClick={() => updateUsers(users.filter(x => x.id !== u.id))} />
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[12px] text-slate-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Commodities ─────────────────────────────────────────────────── */}
      {activeTab === "commodities" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <SectionHeader title="Commodity Categories" count={filteredCommodities.length} isAdmin={isAdmin} onAdd={() => setShowAddComm(v => !v)} />
            {showAddComm && <AddCommodityForm onAdd={c => { updateCommodities([...commodities, c]); setShowAddComm(false) }} onClose={() => setShowAddComm(false)} />}
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                {["Commodity", "SPOC", "Vendor Count", "Description", ""].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCommodities.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] font-semibold text-slate-900">{c.name}</td>
                  <td className="px-5 py-3">
                    <span className="text-[12px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">{c.spoc}</span>
                  </td>
                  <td className="px-5 py-3 text-[13px] font-mono text-slate-600">{c.vendorCount}</td>
                  <td className="px-5 py-3 text-[12px] text-slate-400 max-w-xs truncate">{c.description}</td>
                  <td className="px-5 py-3 text-right">
                    <DeleteBtn onClick={() => updateCommodities(commodities.filter(x => x.id !== c.id))} />
                  </td>
                </tr>
              ))}
              {filteredCommodities.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[12px] text-slate-400">No commodities found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Plants ──────────────────────────────────────────────────────── */}
      {activeTab === "plants" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <SectionHeader title="Plant Locations" count={filteredPlants.length} isAdmin={isAdmin} onAdd={() => setShowAddPlant(v => !v)} />
            {showAddPlant && <AddPlantForm onAdd={p => { updatePlants([...plants, p]); setShowAddPlant(false) }} onClose={() => setShowAddPlant(false)} />}
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                {["Plant Name", "City", "State", "Division", ""].map(h => (
                  <th key={h} className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPlants.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    {p.name}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-slate-600">{p.city}</td>
                  <td className="px-5 py-3 text-[12px] text-slate-500">{p.state}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">{p.division}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DeleteBtn onClick={() => updatePlants(plants.filter(x => x.id !== p.id))} />
                  </td>
                </tr>
              ))}
              {filteredPlants.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[12px] text-slate-400">No plants found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Suppliers ───────────────────────────────────────────────────── */}
      {activeTab === "suppliers" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <SectionHeader title="Supplier / Vendor Registry" count={filteredSuppliers.length} isAdmin={isAdmin} onAdd={() => setShowAddSupp(v => !v)} />
            {showAddSupp && <AddSupplierForm onAdd={s => { updateSuppliers([...suppliers, s]); setShowAddSupp(false) }} onClose={() => setShowAddSupp(false)} />}
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                {["Supplier", "Tier", "Commodity", "Audit Score", "Certifications", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3"><TierBadge tier={s.tier} /></td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{s.commodity}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[12px] font-bold font-mono",
                      s.auditScore >= 90 ? "text-emerald-600" : s.auditScore >= 75 ? "text-amber-600" : "text-red-600"
                    )}>{s.auditScore}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 max-w-[180px] truncate" title={s.certifications}>{s.certifications}</td>
                  <td className="px-4 py-3"><StatusDot status={s.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <DeleteBtn onClick={() => updateSuppliers(suppliers.filter(x => x.id !== s.id))} />
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-[12px] text-slate-400">No suppliers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tests ───────────────────────────────────────────────────────── */}
      {activeTab === "tests" && (() => {
        const TEST_TYPE_COLOR: Record<string, string> = {
          Physical:    "bg-sky-50 text-sky-700 border-sky-200",
          Mechanical:  "bg-violet-50 text-violet-700 border-violet-200",
          Thermal:     "bg-orange-50 text-orange-700 border-orange-200",
          Safety:      "bg-red-50 text-red-700 border-red-200",
          Dimensional: "bg-slate-100 text-slate-600 border-slate-200",
          Corrosion:   "bg-amber-50 text-amber-700 border-amber-200",
          Surface:     "bg-teal-50 text-teal-700 border-teal-200",
          Electrical:  "bg-blue-50 text-blue-700 border-blue-200",
          Functional:  "bg-emerald-50 text-emerald-700 border-emerald-200",
          Reliability: "bg-indigo-50 text-indigo-700 border-indigo-200",
          Compliance:  "bg-pink-50 text-pink-700 border-pink-200",
          NVH:         "bg-purple-50 text-purple-700 border-purple-200",
          Quality:     "bg-green-50 text-green-700 border-green-200",
          Transport:   "bg-cyan-50 text-cyan-700 border-cyan-200",
          Material:    "bg-lime-50 text-lime-700 border-lime-200",
          Chemical:    "bg-yellow-50 text-yellow-700 border-yellow-200",
          QC:          "bg-slate-100 text-slate-600 border-slate-200",
        }
        const filtered = tests.filter(t =>
          t.commodity.toLowerCase().includes(q) ||
          t.testName.toLowerCase().includes(q) ||
          t.testType.toLowerCase().includes(q)
        )
        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4">
              <SectionHeader title="R&D Test Templates" count={filtered.length} isAdmin={isAdmin} onAdd={() => setShowAddTest(v => !v)} />
              {showAddTest && <AddTestForm onAdd={t => { updateTests([...tests, t]); setShowAddTest(false) }} onClose={() => setShowAddTest(false)} />}
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr>
                  {["Commodity", "Test Name", "Test Type", "Unit", "Expected Range", "TAT (days)", ""].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">{t.commodity}</span>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-900">{t.testName}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", TEST_TYPE_COLOR[t.testType] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                        {t.testType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12px] font-mono text-slate-600">{t.unit}</td>
                    <td className="px-5 py-3 text-[12px] text-slate-500">{t.expectedRange || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-[12px] font-bold font-mono",
                        t.durationDays <= 0.5 ? "text-emerald-600" : t.durationDays <= 2 ? "text-amber-600" : "text-red-600"
                      )}>{t.durationDays}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DeleteBtn onClick={() => updateTests(tests.filter(x => x.id !== t.id))} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-[12px] text-slate-400">No tests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      })()}

    </div>
  )
}
