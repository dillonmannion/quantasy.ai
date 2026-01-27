'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertCircle, Zap } from 'lucide-react'
import type { LineupOutput } from '@/lib/algorithms/types'

interface ApplyOptimizationButtonProps {
  current: LineupOutput
  optimized: LineupOutput
  onApply: () => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export function ApplyOptimizationButton({
  current,
  optimized,
  onApply,
  isLoading = false,
  disabled = false,
  className,
}: ApplyOptimizationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const pointsDelta = optimized.projectedPoints - current.projectedPoints
  const hasChanges = pointsDelta !== 0

  const handleApply = async () => {
    setIsApplying(true)
    try {
      await onApply()
      setIsOpen(false)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled || isLoading || !hasChanges}
        className={className}
      >
        <Zap className="h-4 w-4 mr-2" />
        {isLoading ? 'Optimizing...' : 'Apply Optimization'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Lineup Optimization?</DialogTitle>
            <DialogDescription>
              This will update your lineup with the optimized configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  Current
                </div>
                <div className="text-2xl font-bold">
                  {current.projectedPoints.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">pts</div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">
                  Optimized
                </div>
                <div className="text-2xl font-bold text-primary">
                  {optimized.projectedPoints.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">pts</div>
              </div>
            </div>

            {hasChanges && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-3">
                <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">
                    +{pointsDelta.toFixed(1)} points improvement
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(
                      ((pointsDelta / current.projectedPoints) * 100).toFixed(1)
                    )}
                    % increase
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <div className="font-medium mb-1">Changes will be applied</div>
                <div className="text-xs opacity-90">
                  Your current lineup will be replaced with the optimized
                  configuration. You can always revert to your previous lineup.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying}
              className="bg-primary"
            >
              {isApplying ? 'Applying...' : 'Apply Optimization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
