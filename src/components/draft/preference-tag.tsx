'use client'

import { useState, useRef } from 'react'
import { Heart, X, Ban, Minus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PlayerPreference } from '@/lib/algorithms/monte-carlo/types'

interface PreferenceTagProps {
  playerId: string
  preference: PlayerPreference
  onChange: (playerId: string, preference: PlayerPreference) => void
  className?: string
}

const CYCLE_NEXT: Partial<Record<PlayerPreference, PlayerPreference>> = {
  'neutral': 'like',
  'like': 'strongly_like',
  'strongly_like': 'neutral',
  'dislike': 'neutral',
  'strongly_dislike': 'neutral',
  'dnd': 'neutral'
}

export function PreferenceTag({ playerId, preference, onChange, className }: PreferenceTagProps) {
  const [isOpen, setIsOpen] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const getIcon = () => {
    switch (preference) {
      case 'strongly_like':
        return <Heart className="w-4 h-4 fill-current text-red-500" />
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />
      case 'dislike':
        return <X className="w-4 h-4 text-orange-500" />
      case 'strongly_dislike':
        return <X className="w-4 h-4 text-red-700 stroke-[3]" />
      case 'dnd':
        return <Ban className="w-4 h-4 text-gray-500" />
      case 'neutral':
      default:
        return <Minus className="w-4 h-4 text-muted-foreground/50" />
    }
  }

  const handleTouchStart = () => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setIsOpen(true)
    }, 800)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    // If long press occurred, don't cycle
    if (isLongPress.current) {
      isLongPress.current = false
      e.preventDefault() 
      return
    }

    // Only cycle if menu is closed
    if (!isOpen) {
        e.preventDefault() // Prevent menu trigger if it tries to open
        const next = CYCLE_NEXT[preference] || 'neutral'
        onChange(playerId, next)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsOpen(true)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/50 transition-colors cursor-pointer touch-manipulation focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
            preference !== 'neutral' && "bg-muted/30",
            className
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              const next = CYCLE_NEXT[preference] || 'neutral'
              onChange(playerId, next)
            }
          }}
        >
          {getIcon()}
          <span className="sr-only">Preference: {preference}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Preference</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange(playerId, 'strongly_like')}>
          <Heart className="w-4 h-4 mr-2 fill-red-500 text-red-500" />
          <span>Strongly Like (+6%)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(playerId, 'like')}>
          <Heart className="w-4 h-4 mr-2 text-red-500" />
          <span>Like (+3%)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(playerId, 'neutral')}>
          <Minus className="w-4 h-4 mr-2" />
          <span>Neutral (0%)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(playerId, 'dislike')}>
          <X className="w-4 h-4 mr-2 text-orange-500" />
          <span>Dislike (-3%)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(playerId, 'strongly_dislike')}>
          <X className="w-4 h-4 mr-2 text-red-700 stroke-[3]" />
          <span>Strongly Dislike (-6%)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange(playerId, 'dnd')} className="text-muted-foreground">
          <Ban className="w-4 h-4 mr-2" />
          <span>Do Not Draft</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
