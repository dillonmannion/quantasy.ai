'use client'

import { type ReactNode } from 'react'

interface SwipeablePlayerRowProps {
  children: ReactNode
  playerId: string
  onDraft: (playerId: string) => void
  isDraftable: boolean
  enableDrag: boolean
}

export function SwipeablePlayerRow({
  children,
  playerId,
  onDraft,
  isDraftable,
  enableDrag,
}: SwipeablePlayerRowProps) {
  const handleClick = () => {
    if (isDraftable) {
      onDraft(playerId)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{ cursor: isDraftable && enableDrag ? 'grab' : 'default' }}
    >
      {children}
    </div>
  )
}
