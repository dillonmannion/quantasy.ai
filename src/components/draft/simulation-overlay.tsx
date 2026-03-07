'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { MonteCarloOutput } from '@/lib/algorithms/monte-carlo/types'
import { Activity, Clock, AlertCircle } from 'lucide-react'

interface SimulationOverlayProps {
  status: 'idle' | 'loading' | 'running' | 'complete' | 'error'
  progress: number
  results: MonteCarloOutput | null
  playerId: string
  className?: string
}

export function SimulationOverlay({
  status,
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

  return (
    <div 
      className={cn(
        "flex items-center gap-2 shrink-0 pl-3 border-l border-border/50",
        className
      )}
      data-testid="simulation-overlay"
    >
      <div className="text-center">
        <div className="text-[10px] uppercase text-muted-foreground font-semibold hidden md:block">Survival</div>
        <span className={cn(
          "text-xs md:text-sm font-mono font-bold",
          survivalRate < 30 ? "text-red-500" : survivalRate > 70 ? "text-green-500" : "text-yellow-500"
        )}>
          {survivalRate.toFixed(0)}%
        </span>
      </div>

      <Badge 
        variant="outline" 
        className={cn("h-7 px-2 md:px-3 shadow-sm whitespace-nowrap", config.color)}
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
        <span className="text-sm font-medium text-muted-foreground animate-pulse">
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
