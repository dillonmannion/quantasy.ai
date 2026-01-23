'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3, ArrowLeftRight, TrendingUp, Users } from 'lucide-react'
import { motion } from 'motion/react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/draft', label: 'Draft Assistant', icon: BarChart3 },
  { href: '/dashboard/roster', label: 'Roster Optimizer', icon: Users },
  { href: '/dashboard/trade', label: 'Trade Calculator', icon: ArrowLeftRight },
  { href: '/dashboard/waivers', label: 'Waiver Wire', icon: TrendingUp },
]

export function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-border bg-card">
      <div className="flex flex-col flex-1 px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Quantasy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Fantasy Football Tools</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group"
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-nav-indicator"
                    className="absolute inset-0 bg-accent/20 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                <span
                  className={`text-sm relative z-10 ${
                    isActive 
                      ? 'text-primary font-semibold' 
                      : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
