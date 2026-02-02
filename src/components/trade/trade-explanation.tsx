'use client'

import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
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
}

const positionColors: Record<string, string> = {
  QB: 'text-red-400 bg-red-400/20',
  RB: 'text-green-400 bg-green-400/20',
  WR: 'text-blue-400 bg-blue-400/20',
  TE: 'text-yellow-400 bg-yellow-400/20',
  K: 'text-purple-400 bg-purple-400/20',
  DEF: 'text-orange-400 bg-orange-400/20',
}

export const TradeExplanation = memo(function TradeExplanation({
  youGive,
  youReceive,
  explanation,
  className,
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
                   <div className="flex items-center gap-2 shrink-0">
                     <span className="text-accent font-semibold">
                       {player.projected_points?.toFixed(1) ?? '0'}
                     </span>
                     <span className="text-xs text-muted-foreground font-medium">
                       VBD
                     </span>
                   </div>
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
                   <div className="flex items-center gap-2 shrink-0">
                     <span className="text-accent font-semibold">
                       {player.projected_points?.toFixed(1) ?? '0'}
                     </span>
                     <span className="text-xs text-muted-foreground font-medium">
                       VBD
                     </span>
                   </div>
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
         className="card-balatro p-4 space-y-4"
         data-testid="trade-net-value"
       >
         <div className="space-y-2">
           <h3 className="font-bold text-sm">Net Value</h3>
           <div className="flex items-center justify-between">
             <span className="text-muted-foreground" data-testid="trade-points-label">Points Difference</span>
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
               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                 VBD Methodology
               </p>
               <p className="text-sm text-muted-foreground leading-relaxed">
                 Value Based Drafting (VBD) measures a player&apos;s value relative to a baseline replacement player at their position. This accounts for position scarcity and helps identify true value in trades.
               </p>
               <div className="bg-background rounded p-2 mt-2">
                 <p className="text-xs font-mono text-accent">
                   VBD = Projected Points - Position Baseline
                 </p>
               </div>
               <p className="text-xs text-muted-foreground">
                 Higher VBD = More valuable player relative to replacement level
               </p>
               {/* TODO P2: Add multi-source values (KTC, FantasyCalc) */}
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
          <p className="text-sm text-muted-foreground leading-relaxed">
            {explanation}
          </p>
        </motion.div>
      )}
    </div>
  )
})
