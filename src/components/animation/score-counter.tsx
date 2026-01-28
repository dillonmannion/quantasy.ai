'use client'

import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface ScoreCounterProps {
  value: number
  duration?: number
  decimals?: number
  className?: string
}

export function ScoreCounter({ 
  value, 
  duration = 1, 
  decimals = 1, 
  className = '' 
}: ScoreCounterProps) {
  const prefersReducedMotion = useReducedMotion()
  const spring = useSpring(0, { duration: prefersReducedMotion ? 0 : duration * 1000 })
  const display = useTransform(spring, (current) => 
    current.toFixed(decimals)
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return (
    <motion.span data-testid="score-counter-animation" className={className}>
      {display}
    </motion.span>
  )
}
