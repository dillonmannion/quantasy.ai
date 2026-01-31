'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { MonteCarloOutput } from '@/lib/algorithms/monte-carlo/types'
import { Activity, Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

interface SimulationOverlayProps {
  status: 'idle' | 'loading' | 'running' | 'complete' | 'error'
  progress: number
  results: MonteCarloOutput | null
  playerId: string
  className?: string
}

export function SimulationOverlay({
  status,
  progress,
  results,
  playerId,
  className
}: SimulationOverlayProps) {
  const recommendation = useMemo(() => {
    if (!results?.recommendations) return null
    const index = results.recommendations.findIndex(r => r.playerId === playerId)
    if (index === -1 || index >= 5) return null
    return results.recommendations[index]
  }, [results, playerId])

  const isLoading = status === 'loading' || status === 'running'
  
  if (isLoading) {
     return null
  }

  if (!recommendation) return null

  const { survivalRate } = recommendation
  
  const type: 'take_now' | 'wait' | 'consider' = survivalRate < 30 ? 'take_now' : survivalRate > 70 ? 'wait' : 'consider'
  const expectedValue = 0

  const badgeConfig = {
    take_now: {
      label: 'TAKE NOW',
      color: 'bg-green-500 hover:bg-green-600 border-transparent text-white',
      icon: Activity
    },
    wait: {
      label: 'WAIT',
      color: 'bg-yellow-500 hover:bg-yellow-600 border-transparent text-white',
      icon: Clock
    },
    consider: {
      label: 'CONSIDER',
      color: 'bg-orange-500 hover:bg-orange-600 border-transparent text-white',
      icon: AlertCircle
    }
  }

  const config = badgeConfig[type]
  const Icon = config.icon
  const evSign = expectedValue > 0 ? '+' : ''
  const evColor = expectedValue > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  const EvIcon = expectedValue > 0 ? TrendingUp : TrendingDown

  return (
    <div 
      className={cn(
        "absolute inset-0 flex items-center justify-end px-4 gap-4 bg-background/90 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none pointer-events-none",
        className
      )}
      data-testid="simulation-overlay"
    >
      <div className="flex flex-col items-end justify-center">
        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Survival</span>
        <span className={cn(
          "text-sm font-mono font-bold",
          survivalRate < 30 ? "text-red-500" : survivalRate > 70 ? "text-green-500" : "text-yellow-500"
        )}>
          {survivalRate.toFixed(0)}%
        </span>
      </div>

      <div className="hidden md:flex flex-col items-end justify-center min-w-[3rem]">
        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Exp. Val</span>
        <div className="flex items-center gap-1">
           <span className={cn("text-sm font-mono font-bold", evColor)}>
            {evSign}{expectedValue.toFixed(1)}
           </span>
        </div>
      </div>

      <Badge 
        variant="outline" 
        className={cn("h-7 px-3 shadow-sm whitespace-nowrap", config.color)}
      >
        <Icon className="w-3.5 h-3.5 md:mr-1.5" />
        <span className="hidden md:inline">{config.label}</span>
      </Badge>
    </div>
  )
}

export function SimulationProgress({ 
  status, 
  progress 
}: { 
  status: SimulationOverlayProps['status']
  progress: number 
}) {
  if (status !== 'running' && status !== 'loading') return null

  return (
    <div className="w-full px-4 py-2 bg-background/95 backdrop-blur border-b animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground animate-pulse">
          Running Monte Carlo Simulation...
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  )
}
