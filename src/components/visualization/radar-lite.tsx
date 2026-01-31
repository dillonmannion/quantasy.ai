'use client'

import React, { useMemo } from 'react'
import { SVGVisualizationProps } from './types'
import { cn } from '@/lib/utils'

export interface RadarLiteDataPoint {
  label: string
  value: number
  max: number
}

export interface RadarLiteProps extends Omit<SVGVisualizationProps, 'data' | 'width' | 'height'> {
  data: RadarLiteDataPoint[]
  comparisonData?: RadarLiteDataPoint[]
  width?: number
  height?: number
  size?: number
  colors?: string[]
}

/**
 * RadarLite component for visualizing multi-dimensional data.
 * 
 * Typically used for player comparison (stats, attributes).
 * Supports up to 6 axes.
 */
export function RadarLite({
  data,
  comparisonData,
  ariaLabel,
  className,
  width,
  height,
  size = 150,
  colors = ['var(--chart-1)', 'var(--chart-3)'],
  title,
}: RadarLiteProps) {
  const w = width ?? size
  const h = height ?? size
  
  const cx = w / 2
  const cy = h / 2
  // Use 80% of available space to allow room for labels/stroke
  const maxRadius = Math.min(w, h) / 2 * 0.8
  
  const anglePerAxis = (Math.PI * 2) / data.length
  
  // Helper to calculate coordinates for a value on an axis
  const getCoordinates = (value: number, max: number, index: number) => {
    // Start at -90deg (top)
    const angle = index * anglePerAxis - Math.PI / 2
    // Clamp value between 0 and max
    const normalizedValue = Math.max(0, Math.min(value, max))
    const radius = (normalizedValue / max) * maxRadius
    
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    }
  }

  const generatePoints = (dataset: RadarLiteDataPoint[]) => {
    return dataset.map((d, i) => {
      const { x, y } = getCoordinates(d.value, d.max, i)
      return `${x},${y}`
    }).join(' ')
  }

  const { axes, mainPolygon, comparisonPolygon } = useMemo(() => {
    const axesLines = data.map((d, i) => {
      const { x, y } = getCoordinates(d.max, d.max, i) // Point at outer edge
      return {
        x1: cx,
        y1: cy,
        x2: x,
        y2: y,
        label: d.label,
        labelX: x,
        labelY: y,
        // Adjust label position slightly based on quadrant for better visibility
        anchor: (Math.abs(x - cx) < 1 ? 'middle' : x > cx ? 'start' : 'end') as React.SVGProps<SVGTextElement>['textAnchor'],
        baseline: (Math.abs(y - cy) < 1 ? 'middle' : y > cy ? 'hanging' : 'auto') as React.SVGProps<SVGTextElement>['dominantBaseline']
      }
    })

    const mainPoly = generatePoints(data)
    const compPoly = comparisonData ? generatePoints(comparisonData) : null

    return { axes: axesLines, mainPolygon: mainPoly, comparisonPolygon: compPoly }
  }, [data, comparisonData, cx, cy, maxRadius, anglePerAxis])

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn('visualization-radar-lite overflow-visible', className)}
    >
      {title && <title>{title}</title>}
      
      {/* Background/Axes */}
      <g className="axes" stroke="var(--border)" strokeWidth="1">
        {/* Outer polygon (border) */}
        <polygon
          points={axes.map(a => `${a.x2},${a.y2}`).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeDasharray="4 4"
        />
        
        {/* Axis lines */}
        {axes.map((axis, i) => (
          <line
            key={`axis-${i}`}
            x1={axis.x1}
            y1={axis.y1}
            x2={axis.x2}
            y2={axis.y2}
          />
        ))}
      </g>

      {/* Data Polygons */}
      <g className="data-layers">
        {/* Comparison Data (Background) */}
        {comparisonPolygon && (
          <polygon
            points={comparisonPolygon}
            fill={colors[1]}
            fillOpacity="0.3"
            stroke={colors[1]}
            strokeWidth="2"
            className="transition-all duration-300 ease-in-out"
          />
        )}

        {/* Main Data (Foreground) */}
        <polygon
          points={mainPolygon}
          fill={colors[0]}
          fillOpacity="0.3"
          stroke={colors[0]}
          strokeWidth="2"
          className="transition-all duration-300 ease-in-out"
        />
      </g>

      {/* Axis Labels */}
      <g className="labels" fill="var(--muted-foreground)" fontSize="10" fontFamily="var(--font-mono)">
        {axes.map((axis, i) => {
           // Push labels out slightly
           const labelOffset = 10
           const angle = i * anglePerAxis - Math.PI / 2
           const lx = axis.labelX + Math.cos(angle) * labelOffset
           const ly = axis.labelY + Math.sin(angle) * labelOffset
           
           return (
            <text
              key={`label-${i}`}
              x={lx}
              y={ly}
              textAnchor={axis.anchor}
              dominantBaseline={axis.baseline}
            >
              {axis.label}
            </text>
          )
        })}
      </g>
    </svg>
  )
}
