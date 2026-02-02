'use client'

import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react'
import type { DraftState, DraftAction, DraftPick } from './types'

const DraftContext = createContext<{
  state: DraftState
  dispatch: React.Dispatch<DraftAction>
} | null>(null)

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'MARK_DRAFTED': {
      const newPick: DraftPick = {
        pickNumber: state.currentPick + 1,
        playerId: action.playerId,
        playerName: action.playerName,
        position: action.position,
        rosterId: action.rosterId,
        timestamp: Date.now()
      }
      const newDrafted = new Set(state.draftedPlayerIds)
      newDrafted.add(action.playerId)
      return {
        ...state,
        picks: [...state.picks, newPick],
        draftedPlayerIds: newDrafted,
        currentPick: state.currentPick + 1
      }
    }
    
    case 'UNDO_LAST_PICK': {
      if (state.picks.length === 0) return state
      const lastPick = state.picks[state.picks.length - 1]
      const newDrafted = new Set(state.draftedPlayerIds)
      newDrafted.delete(lastPick.playerId)
      return {
        ...state,
        picks: state.picks.slice(0, -1),
        draftedPlayerIds: newDrafted,
        currentPick: state.currentPick - 1
      }
    }
    
    case 'LOAD_KEEPERS': {
      const newDrafted = new Set(state.draftedPlayerIds)
      action.playerIds.forEach(id => newDrafted.add(id))
      return {
        ...state,
        draftedPlayerIds: newDrafted
      }
    }
    
    case 'SYNC_PICKS': {
      const newDrafted = new Set<string>()
      action.picks.forEach(pick => newDrafted.add(pick.playerId))
      return {
        ...state,
        picks: action.picks,
        draftedPlayerIds: newDrafted,
        currentPick: action.picks.length
      }
    }
    
    case 'RESET': {
      return {
        ...state,
        status: 'mock',
        picks: [],
        draftedPlayerIds: new Set<string>(),
        currentPick: 0
      }
    }
    
    default:
      return state
  }
}

interface DraftStateProviderProps {
  children: ReactNode
  initialKeepers?: string[]
  draftId?: string | null
  status?: DraftState['status']
  userRosterId?: number | null
}

export function DraftStateProvider({
  children,
  initialKeepers = [],
  draftId = null,
  status = 'mock',
  userRosterId = null
}: DraftStateProviderProps) {
  const [state, dispatch] = useReducer(draftReducer, {
    draftId: draftId || null,
    status,
    picks: [],
    draftedPlayerIds: new Set<string>(),
    userRosterId: userRosterId || null,
    currentPick: 0
  } as DraftState)

  useEffect(() => {
    if (initialKeepers.length > 0) {
      dispatch({ type: 'LOAD_KEEPERS', playerIds: initialKeepers })
    }
  }, [initialKeepers])

  useEffect(() => {
    if (status === 'mock') {
      const stateToSave = {
        picks: state.picks,
        draftedPlayerIds: Array.from(state.draftedPlayerIds),
        currentPick: state.currentPick
      }
      localStorage.setItem('mock-draft-state', JSON.stringify(stateToSave))
    }
  }, [state.picks, state.draftedPlayerIds, state.currentPick, status])

   useEffect(() => {
     if (status === 'mock') {
       const saved = localStorage.getItem('mock-draft-state')
       if (saved) {
         try {
           const parsed = JSON.parse(saved)
           dispatch({
             type: 'SYNC_PICKS',
             picks: parsed.picks || []
           })
         } catch (e) {
           console.error('Failed to load mock draft state:', e)
         }
       }
     }
   }, [status])

   const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch])

   return (
     <DraftContext.Provider value={contextValue}>
       {children}
     </DraftContext.Provider>
   )
}

export function useDraftState() {
  const context = useContext(DraftContext)
  if (!context) {
    throw new Error('useDraftState must be used within DraftStateProvider')
  }
  return context
}
