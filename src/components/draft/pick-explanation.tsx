'use client'

import { memo, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { PickValueOutput } from '@/lib/algorithms/types'

interface PickExplanationProps {
  pickValue: PickValueOutput
  pickNumber: number
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

export const PickExplanation = memo(function PickExplanation({
  pickValue,
  pickNumber,
  className,
}: PickExplanationProps) {
  const { breakdown, explanation } = pickValue
  const { expectedPlayers, positionalValues, biasAdjustment } = breakdown

  // State for collapsible sections (default open for key info)
  const [isOpenExpected, setIsOpenExpected] = useState(true)
  const [isOpenValues, setIsOpenValues] = useState(true)
  const [isOpenDetails, setIsOpenDetails] = useState(false)

  return (
    <div className={cn('space-y-4', className)} data-testid="pick-explanation">
      {/* Header Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h3 className="font-bold text-lg">Pick #{pickNumber} Analysis</h3>
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(explanation.timestamp).toLocaleTimeString()}
        </span>
      </motion.div>

      {/* Expected Players Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card-balatro p-4"
        data-testid="expected-players"
      >
        <Collapsible
          open={isOpenExpected}
          onOpenChange={setIsOpenExpected}
          className="space-y-2"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <h4 className="font-bold text-sm text-accent">Expected Available</h4>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpenExpected ? 'rotate-180' : ''
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {expectedPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              expectedPlayers.map((player) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-semibold shrink-0',
                        positionColors[player.position] ??
                          'text-gray-400 bg-gray-400/20'
                      )}
                    >
                      {player.position}
                    </span>
                    <span className="truncate">{player.fullName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground text-xs">
                      {(player.probability * 100).toFixed(0)}%
                    </span>
                    <span className="text-accent font-semibold w-8 text-right">
                      {player.projectedPoints.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* Position Values Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-balatro p-4"
        data-testid="position-values"
      >
        <Collapsible
          open={isOpenValues}
          onOpenChange={setIsOpenValues}
          className="space-y-2"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h4 className="font-bold text-sm text-accent">Positional Value</h4>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpenValues ? 'rotate-180' : ''
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {positionalValues.map((pv) => (
              <div
                key={pv.position}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-semibold w-10 text-center',
                    positionColors[pv.position] ??
                      'text-gray-400 bg-gray-400/20'
                  )}
                >
                  {pv.position}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-xs">
                    x{pv.scarcityMultiplier.toFixed(2)} scarcity
                  </span>
                  <span className="text-accent font-semibold w-10 text-right">
                    {pv.expectedValue.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* Details & Methodology Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-balatro p-4"
        data-testid="vbd-breakdown"
      >
        <Collapsible
          open={isOpenDetails}
          onOpenChange={setIsOpenDetails}
          className="space-y-2"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h4 className="font-bold text-sm text-muted-foreground">
              Methodology & Adjustments
            </h4>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpenDetails ? 'rotate-180' : ''
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Bias Adjustment */}
            {biasAdjustment.factor !== 1.0 && biasAdjustment.position && (
              <div className="text-sm border-l-2 border-accent pl-3 py-1">
                <span className="font-semibold text-accent">Bias Active: </span>
                <span
                  className={cn(
                    'px-1 py-0.5 rounded text-xs font-semibold mx-1',
                    positionColors[biasAdjustment.position] ?? ''
                  )}
                >
                  {biasAdjustment.position}
                </span>
                <span className="text-muted-foreground">
                  adjusted by {((biasAdjustment.factor - 1) * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Position Runs */}
            {explanation.positionRunInfo.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                  Market Context
                </span>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {explanation.positionRunInfo.map((info, idx) => (
                    <li key={idx}>{info}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Algorithm Info */}
            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
              <p>Method: {explanation.methodology}</p>
              {explanation.caveats.length > 0 && (
                <ul className="list-disc list-inside opacity-75">
                  {explanation.caveats.map((caveat, idx) => (
                    <li key={idx}>{caveat}</li>
                  ))}
                </ul>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>
    </div>
  )
})
