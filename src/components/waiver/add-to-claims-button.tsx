'use client'

import { Button } from '@/components/ui/button'

interface Props {
  playerId: string
}

export function AddToClaimsButton({ playerId }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    // Try deep link first
    const deepLink = `sleeper://players/${playerId}`
    const webFallback = `https://sleeper.app/players/${playerId}`
    
    // Attempt deep link
    window.location.href = deepLink
    
    // Fallback to web after timeout
    setTimeout(() => {
      window.location.href = webFallback
    }, 500)
  }
  
  return (
    <Button 
      onClick={handleClick}
      className="bg-primary hover:bg-primary/90"
      size="sm"
      aria-label="Add player to waiver claims"
    >
      Add to Claims
    </Button>
  )
}
