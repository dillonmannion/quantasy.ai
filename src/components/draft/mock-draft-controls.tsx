'use client'

import { Button } from '@/components/ui/button'
import { useDraftState } from '@/lib/draft'

export function MockDraftControls() {
  const { state, dispatch } = useDraftState()

  const handleStart = () => {
    dispatch({ type: 'RESET' })
  }

  const handleUndo = () => {
    dispatch({ type: 'UNDO_LAST_PICK' })
  }

  const handleReset = () => {
    if (confirm('Clear all picks and start over?')) {
      dispatch({ type: 'RESET' })
    }
  }

  if (state.status !== 'mock') {
    return (
      <Button 
        onClick={handleStart} 
        size="lg" 
        data-testid="start-mock-draft"
        aria-label="Start a new mock draft"
      >
        Start Mock Draft
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={handleUndo}
        disabled={state.picks.length === 0}
        aria-label="Undo the last pick"
      >
        Undo Last Pick
      </Button>
      <Button 
        variant="outline"
        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" 
        onClick={handleReset}
        aria-label="Reset the draft and clear all picks"
      >
        Reset Draft
      </Button>
      <div className="flex items-center px-4 py-2 bg-muted rounded-md">
        <span className="text-sm font-medium">
          Pick {state.currentPick + 1}
        </span>
      </div>
    </div>
  )
}
