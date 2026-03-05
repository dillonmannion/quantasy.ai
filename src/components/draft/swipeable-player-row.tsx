'use client'

import { useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

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
  const prefersReducedMotion = useReducedMotion()
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const didSwipeDraft = useRef(false)

  const maxSwipe = 96
  const swipeThreshold = 60

  const handleClick = () => {
    if (didSwipeDraft.current) {
      didSwipeDraft.current = false
      return
    }
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableDrag || !isDraftable) return
    touchStartX.current = e.touches[0]?.clientX ?? null
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartX.current === null) return
    const deltaX = (e.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    const nextOffset = Math.max(0, Math.min(maxSwipe, deltaX))
    if (nextOffset > 0) e.preventDefault()
    setOffsetX(nextOffset)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    touchStartX.current = null
    if (offsetX > swipeThreshold && isDraftable) {
      didSwipeDraft.current = true
      setOffsetX(maxSwipe)
      onDraft(playerId)
    }
    setOffsetX(0)
  }

  return (
    <div className="relative overflow-hidden">
      {isDraftable && (
        <button
          type="button"
          onClick={() => onDraft(playerId)}
          className="absolute left-0 top-0 h-full w-24 bg-green-600 text-sm font-semibold text-white"
          aria-label={`Draft ${playerName}`}
        >
          Draft
        </button>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${playerName}, ${position}, VBD ${vbd.toFixed(1)}${isDraftable ? ', press Enter to draft' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          cursor: isDraftable && enableDrag ? 'grab' : 'default',
          transform: `translateX(${offsetX}px)`,
          transition: prefersReducedMotion || isDragging ? 'none' : 'transform 160ms ease-out',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
