'use client'

import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface LastUpdatedProps {
  timestamp: Date
  isStale?: boolean
}

export function LastUpdated({ timestamp, isStale }: LastUpdatedProps) {
  return (
    <span className={cn('text-sm text-muted-foreground', isStale && 'text-yellow-500')}>
      Updated {formatDistanceToNow(timestamp, { addSuffix: true })}
    </span>
  )
}
