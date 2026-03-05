'use client'

import { type ReactNode } from 'react'

interface SwipeablePlayerRowProps {
  children: ReactNode
  playerId: string
  playerName: string
  position: string
  vbd: number
  onDraft: (playerId: string) => void
  isDraftable: boolean
  enableDrag: boolean
}

export function SwipeablePlayerRow({
  children,
  playerId,
  playerName,
  position,
  vbd,
  onDraft,
  isDraftable,
  enableDrag,
}: SwipeablePlayerRowProps) {
  const handleClick = () => {
    if (isDraftable) {
      onDraft(playerId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isDraftable) {
        onDraft(playerId)
      }
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${playerName}, ${position}, VBD ${vbd.toFixed(1)}${isDraftable ? ', press Enter to draft' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: isDraftable && enableDrag ? 'grab' : 'default' }}
    >
      {children}
    </div>
  )
}
