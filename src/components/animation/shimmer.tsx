'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface ShimmerProps {
  className?: string
}

export function Shimmer({ className = '' }: ShimmerProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      data-testid="shimmer-animation"
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent ${className}`}
      animate={prefersReducedMotion ? { x: 0 } : { x: ['-100%', '100%'] }}
      transition={prefersReducedMotion ? { duration: 0 } : { 
        repeat: Infinity, 
        duration: 1.5, 
        ease: 'linear' 
      }}
    />
  )
}
