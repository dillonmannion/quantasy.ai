'use client'

import { Slider } from '@/components/ui/slider'

interface RiskSliderProps {
  value: number // 0-2
  onChange: (value: number) => void
}

export function RiskSlider({ value, onChange }: RiskSliderProps) {
  return (
    <div className="space-y-3 w-full max-w-[260px] md:max-w-xs">
      <div className="flex justify-between items-center">
         <label className="text-sm font-medium">Risk Tolerance</label>
         <span className="text-xs text-muted-foreground font-mono">{value.toFixed(1)}</span>
      </div>
      <Slider
        min={0}
        max={2}
        step={0.1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        className="cursor-pointer"
        aria-label="Risk Tolerance"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        <span>Aggressive</span>
        <span>Balanced</span>
        <span>Conservative</span>
      </div>
    </div>
  )
}
