'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const MobileNavAnimated = dynamic(
  () => import('./mobile-nav-animated').then(mod => mod.MobileNavAnimated),
  { 
    ssr: false,
    loading: () => (
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-card/80 backdrop-blur-md border-t border-border">
          <div className="grid grid-cols-6 h-16">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-2 w-8" />
              </div>
            ))}
          </div>
        </div>
      </nav>
    )
  }
)

export function MobileNav() {
  return <MobileNavAnimated />
}
