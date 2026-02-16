'use client'

import { useMemo } from 'react'
import { ChartVisualizationProps } from './types'
import { cn } from '@/lib/utils'

export interface SparklineProps extends Omit<ChartVisualizationProps, 'data' | 'width' | 'height'> {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

export function Sparkline({
  data = [],
  width = 60,
  height = 20,
  className,
  ariaLabel,
  color = 'var(--chart-1)',
  strokeWidth = 2,
}: SparklineProps) {
  // Normalize data to points
  const points = useMemo(() => {
    if (!data.length) return []
    
    // Handle single data point
    if (data.length === 1) {
      return [{ x: width / 2, y: height / 2, value: data[0] }]
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min
    
    const padding = strokeWidth
    const usableHeight = height - padding * 2
    const usableWidth = width
    
    return data.map((val, i) => {
      const x = (i / (data.length - 1)) * usableWidth
      // If range is 0 (all values same), center vertically
      const normalizedY = range === 0 
        ? 0.5 
        : (val - min) / range
      
      // Invert Y because SVG y=0 is top
      const y = (height - padding) - (normalizedY * usableHeight)
      return { x, y, value: val }
    })
  }, [data, width, height, strokeWidth])

  const pathD = useMemo(() => {
    if (points.length < 2) return ''
    return points.reduce((d, point, i) => {
      if (i === 0) return `M ${point.x},${point.y}`
      return `${d} L ${point.x},${point.y}`
    }, '')
  }, [points])

  if (data.length === 0) {
    return (
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('visualization-sparkline text-muted-foreground', className)}
      >
        <title>{ariaLabel}</title>
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dy=".3em" 
          fontSize={10} 
          fill="currentColor"
        >
          No data
        </text>
      </svg>
    )
  }

  const lastPoint = points[points.length - 1]

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('visualization-sparkline overflow-visible', className)}
    >
      <title>{ariaLabel}</title>
      
      {points.length > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300 ease-in-out motion-reduce:transition-none"
        />
      )}

      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={strokeWidth * 1.5}
        fill={color}
        className="transition-all duration-300 ease-in-out motion-reduce:transition-none"
      />
    </svg>
  )
}
