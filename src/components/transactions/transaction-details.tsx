'use client'

import { motion } from 'motion/react'
import { ArrowRight, Coins } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PlayerCard } from '@/components/players/player-card'
import type { TransactionWithPlayers, TransactionPlayer } from '.'
import type { Database } from '@/lib/supabase/types'

type PlayerRow = Database['public']['Tables']['players']['Row']

interface TransactionDetailsProps {
  transaction: TransactionWithPlayers
}

export function TransactionDetails({ transaction }: TransactionDetailsProps) {
  const { resolved_adds, resolved_drops, draft_picks, waiver_budget } =
    transaction

  const hasAdds = resolved_adds && Object.keys(resolved_adds).length > 0
  const hasDrops = resolved_drops && Object.keys(resolved_drops).length > 0
  const hasPicks = draft_picks && draft_picks.length > 0
  const hasBudget = waiver_budget && waiver_budget.length > 0

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 pt-2"
      data-testid={`transaction-details-${transaction.transaction_id}`}
    >
      {(hasAdds || hasDrops) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasAdds && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider">
                Added
              </h4>
              <div className="space-y-2">
                {Object.values(resolved_adds!).map((player) => (
                  <motion.div key={player.player_id} variants={item}>
                    <PlayerCard
                      player={player as unknown as PlayerRow}
                      variant="compact"
                      className="bg-green-500/10 border border-green-500/20"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {hasDrops && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Dropped
              </h4>
              <div className="space-y-2">
                {Object.values(resolved_drops!).map((player) => (
                  <motion.div key={player.player_id} variants={item}>
                    <PlayerCard
                      player={player as unknown as PlayerRow}
                      variant="compact"
                      className="bg-red-500/10 border border-red-500/20 opacity-75"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasPicks && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Draft Picks
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {draft_picks!.map((pick, idx) => (
              <motion.div
                key={`${pick.season}-${pick.round}-${pick.owner_id}-${idx}`}
                variants={item}
                className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm"
              >
                <span className="font-bold text-blue-300">
                  {pick.season} Round {pick.round}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  From: Team {pick.previous_owner_id}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {hasBudget && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
            FAAB
          </h4>
          <div className="flex flex-wrap gap-2">
            {waiver_budget!.map((budget, idx) => (
              <motion.div
                key={idx}
                variants={item}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-sm"
              >
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="font-bold text-yellow-200">
                  ${budget.amount}
                </span>
                <span className="text-xs text-muted-foreground">
                  Team {budget.sender} → Team {budget.receiver}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
