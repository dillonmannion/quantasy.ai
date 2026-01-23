'use client'

import { useState, useCallback } from 'react'

export function useCelebration(autoHideMs = 2000) {
  const [isShowing, setIsShowing] = useState(false)
  const [value, setValue] = useState<number | string>(0)
  const [label, setLabel] = useState<string>()

  const celebrate = useCallback((
    newValue: number | string, 
    newLabel?: string
  ) => {
    setValue(newValue)
    setLabel(newLabel)
    setIsShowing(true)

    if (autoHideMs > 0) {
      setTimeout(() => setIsShowing(false), autoHideMs)
    }
  }, [autoHideMs])

  const hide = useCallback(() => setIsShowing(false), [])

  return { isShowing, value, label, celebrate, hide }
}
