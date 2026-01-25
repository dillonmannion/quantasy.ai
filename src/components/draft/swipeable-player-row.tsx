'use client'

import { motion, type PanInfo } from 'motion/react'
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
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.x > 50 && isDraftable) {
      onDraft(playerId)
    }
  }

  return (
    <motion.div
      drag={enableDrag ? 'x' : false}
      dragConstraints={{ left: 0, right: 100 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
      style={{ cursor: isDraftable && enableDrag ? 'grab' : 'default' }}
    >
      {children}
    </motion.div>
  )
}
