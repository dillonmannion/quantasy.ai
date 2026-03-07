'use client'

import { Card } from '@/components/ui/card'
import { ScoreCounter } from '@/components/animation/score-counter'
import { RefreshButton } from './refresh-button'
import type { SleeperLeague, SleeperRoster } from '@/lib/sleeper/types'
import { Trophy, TrendingUp, TrendingDown, Users } from 'lucide-react'

interface LeagueCardProps {
  league: SleeperLeague
  userRoster: SleeperRoster | null
  standing: number | null
  totalTeams: number
}

function StatBox({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'text-foreground',
}: {
  label: string
  value: string | number
  subValue?: string
  icon?: React.ElementType
  color?: string
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1 min-w-0">
        {Icon && <Icon className={`w-4 h-4 ${color} shrink-0`} />}
        <span className="text-sm text-muted-foreground whitespace-nowrap text-ellipsis overflow-hidden" title={label}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' ? (
          <ScoreCounter
            value={value}
            decimals={value % 1 !== 0 ? 1 : 0}
            duration={0.5}
          />
        ) : (
          value
        )}
      </div>
      {subValue && (
        <div className="text-sm text-muted-foreground mt-1">{subValue}</div>
      )}
    </div>
  )
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function LeagueCard({
  league,
  userRoster,
  standing,
  totalTeams,
}: LeagueCardProps) {
  const wins = userRoster?.settings.wins ?? 0
  const losses = userRoster?.settings.losses ?? 0
  const ties = userRoster?.settings.ties ?? 0
  const ptsFor = userRoster?.settings.fpts ?? 0
  const ptsAgainst = userRoster?.settings.fpts_against ?? 0

  const ptsDiff = ptsFor - ptsAgainst
  const ptsDiffColor =
    ptsDiff > 0
      ? 'text-green-500'
      : ptsDiff < 0
        ? 'text-red-500'
        : 'text-muted-foreground'

  const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`

  return (
    <Card className="card-balatro p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">{league.name}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{league.season} Season</span>
            <span>-</span>
            <span>{league.total_rosters} Teams</span>
            <span>-</span>
            <span>{formatStatus(league.status)}</span>
          </div>
        </div>
        <RefreshButton leagueId={league.league_id} />
      </div>

      {userRoster ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            label="Record"
            value={record}
            icon={Trophy}
            color={
              wins > losses
                ? 'text-green-500'
                : wins < losses
                  ? 'text-red-500'
                  : 'text-foreground'
            }
          />

          <StatBox
            label="Standing"
            value={standing ? getOrdinal(standing) : '-'}
            subValue={standing ? `of ${totalTeams}` : undefined}
            icon={Users}
            color={standing && standing <= 3 ? 'text-purple-400' : 'text-foreground'}
          />

          <StatBox
            label="Points For"
            value={ptsFor}
            icon={TrendingUp}
            color="text-green-500"
          />

          <StatBox
            label="Points Against"
            value={ptsAgainst}
            icon={TrendingDown}
            color="text-red-500"
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Could not find your roster in this league.</p>
          <p className="text-sm mt-2">
            This can happen if your Sleeper username differs from when you
            connected.
          </p>
        </div>
      )}

      {userRoster && (
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Point Differential</span>
          <span className={`font-bold ${ptsDiffColor}`}>
            {ptsDiff > 0 ? '+' : ''}
            {ptsDiff.toFixed(1)}
          </span>
        </div>
      )}
    </Card>
  )
}
