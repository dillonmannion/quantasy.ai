'use client'

import { motion } from 'motion/react'

interface ShimmerProps {
  className?: string
}

export function Shimmer({ className = '' }: ShimmerProps) {
  return (
    <motion.div
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent ${className}`}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.5, 
        ease: 'linear' 
      }}
    />
  )
}
