'use client'

import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'

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
  const spring = useSpring(0, { duration: duration * 1000 })
  const display = useTransform(spring, (current) => 
    current.toFixed(decimals)
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  )
}
