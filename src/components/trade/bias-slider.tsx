'use client'

import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface BiasSliderProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function BiasSlider({ value, onChange, className }: BiasSliderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">Fairness Bias</label>
         <span className="text-sm text-muted-foreground font-medium">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <Slider
        data-testid="bias-slider"
        aria-label="Fairness Bias"
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
        max={20}
        step={1}
        className="w-full"
      />
       <div className="flex justify-between text-xs text-muted-foreground">
        <span className={cn(value === 0 && "text-primary font-bold")}>Fair</span>
        <span className={cn(value > 0 && value <= 0.1 && "text-primary font-bold")}>Slight Edge</span>
        <span className={cn(value > 0.1 && "text-primary font-bold")}>Advantage</span>
      </div>
    </div>
  )
}
