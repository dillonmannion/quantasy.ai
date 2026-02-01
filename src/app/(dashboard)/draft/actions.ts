'use server'

import { getDraft, getLeagueRosters, getLeagueUsers } from '@/lib/sleeper'

export interface DraftMetadata {
  teams: number
  rounds: number
  rosters: Record<number, { ownerName: string }>
}

export async function getDraftMetadata(draftId: string): Promise<DraftMetadata> {
  const draft = await getDraft(draftId)
  if (!draft) {
    throw new Error('Draft not found')
  }

  const [rosters, users] = await Promise.all([
    getLeagueRosters(draft.league_id),
    getLeagueUsers(draft.league_id)
  ])

  const userMap = new Map(users.map(u => [u.user_id, u.display_name]))
  
  const rosterMap: Record<number, { ownerName: string }> = {}
  
  rosters.forEach(roster => {
    let ownerName = 'Unknown'
    if (roster.owner_id && userMap.has(roster.owner_id)) {
      ownerName = userMap.get(roster.owner_id)!
    }
    rosterMap[roster.roster_id] = { ownerName }
  })

  // If mock draft or incomplete data, ensure we have entries for all roster IDs
  const totalTeams = draft.settings.teams
  for (let i = 1; i <= totalTeams; i++) {
    if (!rosterMap[i]) {
      rosterMap[i] = { ownerName: `Team ${i}` }
    }
  }

  return {
    teams: draft.settings.teams,
    rounds: draft.settings.rounds,
    rosters: rosterMap
  }
}
