'use client'

import { useState, useCallback } from 'react'

export function useCelebration(autoHideMs = 2000) {
  const [isShowing, setIsShowing] = useState(false)
  const [value, setValue] = useState<number | string>(0)
  const [label, setLabel] = useState<string>()
  const [variant, setVariant] = useState<'gold' | 'green' | 'purple'>('gold')

  const celebrate = useCallback((
    newValue: number | string, 
    newLabel?: string,
    newVariant: 'gold' | 'green' | 'purple' = 'gold'
  ) => {
    setValue(newValue)
    setLabel(newLabel)
    setVariant(newVariant)
    setIsShowing(true)

    if (autoHideMs > 0) {
      setTimeout(() => setIsShowing(false), autoHideMs)
    }
  }, [autoHideMs])

  const hide = useCallback(() => setIsShowing(false), [])

  return { 
    isShowing, 
    value, 
    label, 
    variant,
    celebration: { show: isShowing, value, label, variant, onComplete: hide },
    celebrate, 
    hide 
  }
}
