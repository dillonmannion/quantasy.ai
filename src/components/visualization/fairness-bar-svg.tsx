'use client'

import { ChartVisualizationProps } from './types'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

export interface FairnessBarSVGProps extends Omit<ChartVisualizationProps, 'data'> {
  giveValue: number
  receiveValue: number
  showExplain?: boolean
}

export function FairnessBarSVG({
  giveValue,
  receiveValue,
  width,
  height,
  ariaLabel,
  className,
  showExplain = false,
}: FairnessBarSVGProps) {
  // 1. Calculate Ratio
  const safeGive = giveValue === 0 ? 1 : giveValue // Avoid divide by zero
  const ratio = receiveValue / safeGive
  
  // 2. Determine Color/Gradient ID based on ratio
  // < 0.8: Red (Bad)
  // 0.8-0.95: Yellow (Slightly Unfair)
  // 0.95-1.05: Cyan (Fair)
  // 1.05-1.2: Yellow (Slightly Unfair)
  // > 1.2: Red (Unfair/Suspicious)
  
  const status = useMemo(() => {
    if (ratio < 0.8) return 'bad'
    if (ratio < 0.95) return 'warn'
    if (ratio <= 1.05) return 'fair'
    if (ratio <= 1.2) return 'warn'
    return 'bad'
  }, [ratio])

  const gradientId = `fairness-gradient-${status}`
  const neutralGradientId = 'fairness-gradient-neutral'

  // 3. Layout Calculations
  // We'll render two bars stacked vertically
  const padding = 4
  const barHeight = (height - padding) / 2
  const maxVal = Math.max(giveValue, receiveValue, 1)
  
  // Scale widths
  const giveWidth = (giveValue / maxVal) * width
  const receiveWidth = (receiveValue / maxVal) * width

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('visualization-fairness-bar', className)}
    >
      <title>{ariaLabel}</title>
      
      <defs>
        {/* Neutral Gradient (Give) */}
        <linearGradient id={neutralGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity="0.8" />
        </linearGradient>

        {/* Status Gradients (Receive) */}
        {/* Bad: Red */}
        <linearGradient id="fairness-gradient-bad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--chart-4)" />
          <stop offset="100%" stopColor="var(--chart-4)" stopOpacity="0.6" />
        </linearGradient>

        {/* Warn: Yellow */}
        <linearGradient id="fairness-gradient-warn" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--chart-1)" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.6" />
        </linearGradient>

        {/* Fair: Cyan/Green */}
        <linearGradient id="fairness-gradient-fair" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--chart-3)" />
          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Give Bar (Top) */}
      <rect
        x={0}
        y={0}
        width={giveWidth}
        height={barHeight}
        rx={4}
        fill={`url(#${neutralGradientId})`}
        className="transition-all duration-300 ease-in-out"
      />
      
      {/* Receive Bar (Bottom) */}
      <rect
        x={0}
        y={barHeight + padding}
        width={receiveWidth}
        height={barHeight}
        rx={4}
        fill={`url(#${gradientId})`}
        className="transition-all duration-300 ease-in-out"
      />

      {/* Optional Explain Callout */}
      {showExplain && (
        <g transform={`translate(${width - 24}, ${height / 2 - 12})`}>
          <circle cx={12} cy={12} r={10} fill="var(--background)" stroke="var(--muted-foreground)" />
          <text
            x={12}
            y={12}
            textAnchor="middle"
            dy=".3em"
            fontSize={12}
            fill="var(--muted-foreground)"
            fontWeight="bold"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  )
}
