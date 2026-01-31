'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Fragment } from 'react'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  draft: 'Draft Assistant',
  roster: 'Roster Optimizer',
  trade: 'Trade Calculator',
  waivers: 'Waiver Wire',
  connect: 'Connect League'
}

function getLabel(segment: string): string {
  return routeLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

interface BreadcrumbItem {
  segment: string
  path: string
  isLast: boolean
  isEllipsis?: boolean
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  let items: BreadcrumbItem[] = segments.map((segment, index) => ({
    segment,
    path: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1
  }))

  if (segments.length > 3) {
    const first = items[0]
    const last = items[items.length - 1]
    items = [
      first,
      { segment: '...', path: '', isLast: false, isEllipsis: true },
      last
    ]
  }

  return (
    <nav aria-label="Breadcrumb" className="font-mono text-sm flex items-center space-x-2">
      {items.map((item, index) => {
        if (item.isEllipsis) {
          return (
            <Fragment key="ellipsis">
              <span className="text-border">/</span>
              <span className="text-muted-foreground">...</span>
            </Fragment>
          )
        }

        const label = getLabel(item.segment)

        return (
          <Fragment key={item.path}>
            {index > 0 && <span className="text-border">/</span>}
            {item.isLast ? (
              <span className="text-foreground">{label}</span>
            ) : (
              <Link 
                href={item.path} 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
