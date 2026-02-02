'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormatToggleProps {
  value: 'dynasty' | 'redraft'
  onChange: (value: 'dynasty' | 'redraft') => void
  className?: string
}

export function FormatToggle({ value, onChange, className }: FormatToggleProps) {
  const isDynasty = value === 'dynasty'

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Label
        htmlFor="format-toggle"
        className={cn(
          'cursor-pointer transition-colors text-sm',
          isDynasty ? 'text-muted-foreground' : 'text-foreground font-medium'
        )}
        onClick={() => onChange('redraft')}
      >
        Redraft
      </Label>
      <Switch
        id="format-toggle"
        checked={isDynasty}
        onCheckedChange={(checked) => onChange(checked ? 'dynasty' : 'redraft')}
        data-testid="dynasty-redraft-toggle"
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/50"
      />
      <Label
        htmlFor="format-toggle"
        className={cn(
          'cursor-pointer transition-colors text-sm',
          !isDynasty ? 'text-muted-foreground' : 'text-foreground font-medium'
        )}
        onClick={() => onChange('dynasty')}
      >
        Dynasty
      </Label>
    </div>
  )
}
