"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { FABBidRange } from "@/lib/algorithms/types"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, ChevronUp, AlertCircle, TrendingUp } from "lucide-react"

interface FaabBidSliderProps {
  playerId: string
  bidRange: FABBidRange
  faabBudget: {
    total: number
    remaining: number
  }
  currentBid: number
  onBidChange: (bid: number) => void
  reasons?: string[]
  className?: string
}

export function FaabBidSlider({
  playerId,
  bidRange,
  faabBudget,
  currentBid,
  onBidChange,
  reasons = [],
  className
}: FaabBidSliderProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const maxAllowedBid = Math.max(0, faabBudget.remaining)
  const isDisabled = maxAllowedBid === 0

  const minMarkerPos = maxAllowedBid > 0 ? (bidRange.min / maxAllowedBid) * 100 : 0
  const maxMarkerPos = maxAllowedBid > 0 ? (bidRange.max / maxAllowedBid) * 100 : 0
  
  const percentOfRemaining = maxAllowedBid > 0 
    ? Math.round((currentBid / maxAllowedBid) * 100) 
    : 0

  const getBudgetColor = (pct: number) => {
    if (isDisabled) return "text-muted-foreground"
    if (pct < 25) return "text-green-500"
    if (pct < 50) return "text-yellow-500"
    if (pct < 75) return "text-orange-500"
    return "text-destructive"
  }

  const handleValueChange = (values: number[]) => {
    const value = Math.min(values[0], maxAllowedBid)
    onBidChange(value)
  }

  return (
    <div className={cn("space-y-4 select-none", className)} data-testid={`faab-slider-${playerId}`}>
       <div className="flex justify-between items-end">
          <label className="text-sm font-medium text-muted-foreground">
            Your Bid
          </label>
          <div className="text-right">
             <span 
               className={cn("text-2xl font-bold tabular-nums", isDisabled && "text-muted-foreground")} 
               data-testid="faab-slider-value"
             >
               ${currentBid}
             </span>
             <span className="text-muted-foreground ml-1 text-sm">
               / ${maxAllowedBid} remaining
             </span>
          </div>
       </div>

       <div className="relative py-2 px-1">
          <Slider
             value={[currentBid]}
             min={0}
             max={maxAllowedBid}
             step={1}
             disabled={isDisabled}
             onValueChange={handleValueChange}
             className="z-10 relative"
          />
          
          {!isDisabled && bidRange.min <= maxAllowedBid && (
             <div 
               className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full z-0 transition-all"
               style={{ left: `${minMarkerPos}%`, transform: 'translate(-50%, -50%)' }}
               title={`Min Recommended: $${bidRange.min}`}
             />
          )}
          {!isDisabled && bidRange.max <= maxAllowedBid && (
             <div 
               className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full z-0 transition-all"
               style={{ left: `${maxMarkerPos}%`, transform: 'translate(-50%, -50%)' }}
               title={`Max Recommended: $${bidRange.max}`}
             />
          )}
          
          {!isDisabled && bidRange.min <= maxAllowedBid && bidRange.max <= maxAllowedBid && (
             <div
                className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary/20 z-0 pointer-events-none rounded-full"
                style={{ 
                   left: `${minMarkerPos}%`, 
                   width: `${Math.max(0, maxMarkerPos - minMarkerPos)}%`,
                   transform: 'translateY(-50%)'
                }}
             />
          )}
       </div>

       <div className="flex justify-between items-center text-sm">
          <span 
            className={cn("font-medium transition-colors", getBudgetColor(percentOfRemaining))}
            data-testid="budget-percentage"
          >
            {isDisabled ? "No budget remaining" : `${percentOfRemaining}% of remaining budget`}
          </span>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-hidden"
            aria-expanded={isOpen}
          >
            Why this bid?
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
       </div>

       <AnimatePresence>
         {isOpen && (
           <motion.div
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: "auto", opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             className="overflow-hidden"
           >
             <div className="pt-2 text-sm text-muted-foreground space-y-2 bg-muted/30 p-3 rounded-md mt-2">
                <div className="flex items-start gap-2">
                   <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                   <div>
                     <span className="font-medium text-foreground">Recommended Range:</span>
                     <span className="ml-1">${bidRange.min} - ${bidRange.max}</span>
                     <p className="text-[10px] opacity-80 mt-0.5">
                       Based on VBD improvement and positional need.
                     </p>
                   </div>
                </div>
                
                {reasons.length > 0 && (
                   <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <ul className="space-y-1 list-disc pl-3">
                         {reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                         ))}
                      </ul>
                   </div>
                )}
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  )
}
