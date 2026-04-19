export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800 text-white p-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-blue-600">Amber</span> NPD Portal
          </span>
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded ml-4 font-mono">External Secure Link</span>
        </div>
      </header>
      <main className="p-6 md:p-12">
        {children}
      </main>
    </div>
  )
}
