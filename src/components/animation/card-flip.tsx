'use client'

import { motion } from 'motion/react'
import { type ReactNode } from 'react'

interface CardFlipProps {
  front: ReactNode
  back: ReactNode
  isFlipped?: boolean
  onFlip?: () => void
  className?: string
}

export function CardFlip({ 
  front, 
  back, 
  isFlipped = false, 
  onFlip, 
  className = '' 
}: CardFlipProps) {
  return (
    <div 
      className={`relative cursor-pointer perspective-1000 ${className}`}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onFlip?.()
        }
      }}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ 
          duration: 0.6, 
          type: 'spring', 
          stiffness: 300, 
          damping: 30 
        }}
      >
        <div className="absolute inset-0 backface-hidden">
          {front}
        </div>
        <div 
          className="absolute inset-0 backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  )
}
