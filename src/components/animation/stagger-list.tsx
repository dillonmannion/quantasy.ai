'use client'

import { motion, type Variants } from 'motion/react'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  },
}

interface StaggerListProps {
  children: ReactNode
  className?: string
}

export function StaggerList({ children, className }: StaggerListProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      data-testid="stagger-list-animation"
      variants={containerVariants}
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div 
      data-testid="stagger-item-animation"
      variants={itemVariants} 
      initial={prefersReducedMotion ? 'visible' : undefined}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
