import { Sidebar } from "@/components/Sidebar"
import { TopNav } from "@/components/TopNav"
import { Tour } from "@/components/Tour"
import { NPDProvider } from "@/lib/npdContext"

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NPDProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "#F2F4F7" }}>
        <Tour />
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto w-full p-6">
            {children}
          </main>
        </div>
      </div>
    </NPDProvider>
  )
}
