'use client'

import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import type { TradePlayerBreakdown } from '@/lib/algorithms/types'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface TradeExplanationProps {
  youGive: PlayerRow[]
  youReceive: PlayerRow[]
  explanation?: string
  className?: string
  playerBreakdown?: TradePlayerBreakdown[]
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

const PlayerRowItem = ({
  player,
  breakdown,
}: {
  player: PlayerRow
  breakdown?: TradePlayerBreakdown
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center justify-between text-sm">
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
        <div className="flex items-center gap-4 shrink-0">
          {breakdown?.externalValues?.consensus !== undefined && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-blue-400 font-bold"
                  data-testid={`consensus-value-${player.id}`}
                >
                  {breakdown.externalValues.consensus.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-medium">
                  Z-Score
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-accent font-semibold">
              {player.projected_points?.toFixed(1) ?? '0'}
            </span>
            <span className="text-xs text-[#a1a1aa] font-medium">
              VBD
            </span>
          </div>
        </div>
      </div>

      {breakdown?.externalValues?.consensus !== undefined && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <button
              className="text-[10px] text-[#a1a1aa] hover:text-accent flex items-center gap-1 ml-auto"
              data-testid={`value-dropdown-${player.id}`}
            >
              What is this?
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted/30 rounded text-xs space-y-3">
              <p className="text-[#a1a1aa] leading-relaxed">
                We translate values from multiple sources to the same scale
                using statistical normalization (Z-scores), then average them.
                This consensus represents the market&apos;s collective opinion.
              </p>

              <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-2">
                <div className="font-semibold text-[#a1a1aa]">
                  Source
                </div>
                <div className="font-semibold text-[#a1a1aa] text-right">
                  Value
                </div>
                <div className="font-semibold text-[#a1a1aa] text-right">
                  Scale
                </div>

                {breakdown.externalValues.sources?.map((source) => (
                  <div key={source.source} className="contents group">
                    <div
                      className="text-foreground/90 group-hover:text-accent transition-colors"
                      data-testid={`source-${source.source}-${player.id}`}
                    >
                      {source.source}
                    </div>
                    <div className="text-right font-mono">
                      {source.value.toFixed(1)}
                    </div>
                    <div className="text-right text-[#a1a1aa] italic">
                      {source.originalScale || 'N/A'}
                    </div>
                  </div>
                ))}

                {(!breakdown.externalValues.sources ||
                  breakdown.externalValues.sources.length === 0) && (
                  <div className="col-span-3 text-center text-[#a1a1aa] py-1">
                    No individual sources available
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export const TradeExplanation = memo(function TradeExplanation({
  youGive,
  youReceive,
  explanation,
  className,
  playerBreakdown,
}: TradeExplanationProps) {
  const [isOpenCalculation, setIsOpenCalculation] = useState(false)

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
    <div className={cn('space-y-4', className)} data-testid="trade-explanation">
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-balatro p-4 space-y-3"
        >
          <h3 className="font-bold text-sm">You Give</h3>
          <div className="space-y-2">
            {youGive.length === 0 ? (
              <p className="text-sm text-foreground/80">No players</p>
            ) : (
               youGive.map((player) => (
                 <PlayerRowItem
                   key={player.id}
                   player={player}
                   breakdown={playerBreakdown?.find(
                     (p) => p.playerId === player.id
                   )}
                 />
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
              <p className="text-sm text-foreground/80">No players</p>
            ) : (
               youReceive.map((player) => (
                 <PlayerRowItem
                   key={player.id}
                   player={player}
                   breakdown={playerBreakdown?.find(
                     (p) => p.playerId === player.id
                   )}
                 />
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
         className="card-balatro p-4 space-y-4"
         data-testid="trade-net-value"
       >
         <div className="space-y-2">
           <h3 className="font-bold text-sm">Net Value</h3>
           <div className="flex items-center justify-between">
             <span className="text-foreground/80" data-testid="trade-points-label">Points Difference</span>
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
         </div>

         {/* Show calculation expandable section */}
         <Collapsible
           open={isOpenCalculation}
           onOpenChange={setIsOpenCalculation}
           className="space-y-2"
         >
           <CollapsibleTrigger className="flex items-center justify-between w-full group" data-testid="show-calculation">
             <span className="text-sm font-medium text-accent">Show calculation</span>
             <ChevronDown
               className={cn(
                 'h-4 w-4 transition-transform duration-200',
                 isOpenCalculation ? 'rotate-180' : ''
               )}
             />
           </CollapsibleTrigger>
           <CollapsibleContent className="space-y-3 pt-2">
             <div className="bg-background/50 rounded p-3 space-y-2">
               <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wide">
                 VBD Methodology
               </p>
               <p className="text-sm text-foreground/80 leading-relaxed">
                 Value Based Drafting (VBD) measures a player&apos;s value relative to a baseline replacement player at their position. This accounts for position scarcity and helps identify true value in trades.
               </p>
               <div className="bg-background rounded p-2 mt-2">
                 <p className="text-xs font-mono text-accent">
                   VBD = Projected Points - Position Baseline
                 </p>
               </div>
               <p className="text-xs text-[#a1a1aa]">
                 Higher VBD = More valuable player relative to replacement level
               </p>
             </div>
           </CollapsibleContent>
         </Collapsible>
       </motion.div>

      {explanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-balatro p-4 space-y-2"
        >
          <h3 className="font-bold text-sm">Analysis</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {explanation}
          </p>
        </motion.div>
      )}
    </div>
  )
})
