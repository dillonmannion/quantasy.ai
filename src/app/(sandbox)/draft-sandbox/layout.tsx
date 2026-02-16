import type { ReactNode } from 'react'

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-primary">Quantasy</span>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-500">
              Sandbox
            </span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
