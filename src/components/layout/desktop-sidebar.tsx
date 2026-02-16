'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const DesktopSidebarAnimated = dynamic(
  () => import('./desktop-sidebar-animated').then(mod => mod.DesktopSidebarAnimated),
  { 
    ssr: false,
    loading: () => (
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-border bg-card">
        <div className="flex flex-col flex-1 px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40 mt-1" />
          </div>
          <div className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>

          <div className="mt-auto" />
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    )
  }
)

export function DesktopSidebar() {
  return <DesktopSidebarAnimated />
}
