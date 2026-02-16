'use client'

import { motion, type Variants } from 'motion/react'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const variants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.3, 
  className 
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      data-testid="fade-animation"
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      variants={variants}
      transition={prefersReducedMotion ? { duration: 0 } : { delay, duration, ease: 'easeOut' }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
