'use client'

import { motion } from 'motion/react'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface TradeExplanationProps {
  youGive: PlayerRow[]
  youReceive: PlayerRow[]
  explanation?: string
  className?: string
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

export function TradeExplanation({
  youGive,
  youReceive,
  explanation,
  className,
}: TradeExplanationProps) {
  const totalPointsGive = youGive.reduce(
    (sum, p) => sum + (p.projected_points ?? 0),
    0
  )
  const totalPointsReceive = youReceive.reduce(
    (sum, p) => sum + (p.projected_points ?? 0),
    0
  )
  const pointsDifference = totalPointsReceive - totalPointsGive

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-balatro p-4 space-y-3"
        >
          <h3 className="font-bold text-sm">You Give</h3>
          <div className="space-y-2">
            {youGive.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players</p>
            ) : (
              youGive.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-semibold shrink-0',
                        positionColors[player.position ?? ''] ??
                          'text-gray-400 bg-gray-400/20'
                      )}
                    >
                      {player.position}
                    </span>
                    <span className="truncate">{player.full_name}</span>
                  </div>
                  <span className="text-accent font-semibold shrink-0">
                    {player.projected_points?.toFixed(1) ?? '0'}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-accent">{totalPointsGive.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-balatro p-4 space-y-3"
        >
          <h3 className="font-bold text-sm">You Receive</h3>
          <div className="space-y-2">
            {youReceive.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players</p>
            ) : (
              youReceive.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-semibold shrink-0',
                        positionColors[player.position ?? ''] ??
                          'text-gray-400 bg-gray-400/20'
                      )}
                    >
                      {player.position}
                    </span>
                    <span className="truncate">{player.full_name}</span>
                  </div>
                  <span className="text-accent font-semibold shrink-0">
                    {player.projected_points?.toFixed(1) ?? '0'}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-accent">
                {totalPointsReceive.toFixed(1)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-balatro p-4 space-y-2"
      >
        <h3 className="font-bold text-sm">Net Value</h3>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Points Difference</span>
          <motion.span
            key={pointsDifference}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={cn(
              'text-lg font-bold',
              pointsDifference > 0
                ? 'text-green-400'
                : pointsDifference < 0
                  ? 'text-red-400'
                  : 'text-yellow-400'
            )}
          >
            {pointsDifference > 0 ? '+' : ''}
            {pointsDifference.toFixed(1)}
          </motion.span>
        </div>
      </motion.div>

      {explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-balatro p-4 space-y-2"
        >
          <h3 className="font-bold text-sm">Analysis</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {explanation}
          </p>
        </motion.div>
      )}
    </div>
  )
}
