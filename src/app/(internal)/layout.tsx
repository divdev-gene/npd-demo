import { Sidebar } from "@/components/Sidebar"
import { TopNav } from "@/components/TopNav"
import { Tour } from "@/components/Tour"

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Tour />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto w-full p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
