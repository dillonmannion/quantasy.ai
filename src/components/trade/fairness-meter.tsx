'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface FairnessMeterProps {
  value: number
  label?: string
  className?: string
}

export function FairnessMeter({
  value,
  label = 'Trade Fairness',
  className,
}: FairnessMeterProps) {
  const clampedValue = Math.max(-100, Math.min(100, value))
  const percentage = (clampedValue + 100) / 2

  let verdict = 'Balanced'
  let verdictColor = 'text-yellow-400'

  if (clampedValue < -30) {
    verdict = 'You Lose'
    verdictColor = 'text-red-400'
  } else if (clampedValue < -10) {
    verdict = 'Slight Loss'
    verdictColor = 'text-orange-400'
  } else if (clampedValue > 30) {
    verdict = 'You Win'
    verdictColor = 'text-green-400'
  } else if (clampedValue > 10) {
    verdict = 'Slight Win'
    verdictColor = 'text-lime-400'
  }

  const getGradientColor = (pos: number) => {
    if (pos < 25) return 'from-red-500'
    if (pos < 50) return 'from-orange-500'
    if (pos < 50) return 'from-yellow-500'
    if (pos < 75) return 'from-lime-500'
    return 'from-green-500'
  }

  return (
    <div className={cn('space-y-3', className)} data-testid="fairness-meter">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm" data-testid="fairness-meter-label">{label}</h3>
        <motion.div
          key={clampedValue}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn('text-sm font-bold', verdictColor)}
          data-testid="fairness-meter-verdict"
        >
          {verdict}
        </motion.div>
      </div>

      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className={cn(
            'h-full bg-gradient-to-r to-transparent rounded-full',
            getGradientColor(percentage)
          )}
        />

        <motion.div
          initial={false}
          animate={{ left: `${percentage}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-primary"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
        <span>-100 (Loss)</span>
        <span>0 (Fair)</span>
        <span>+100 (Win)</span>
      </div>

      <motion.div
        key={clampedValue}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-sm font-semibold"
        data-testid="fairness-meter-value"
      >
        {clampedValue > 0 ? '+' : ''}
        {clampedValue}
      </motion.div>
    </div>
  )
}
