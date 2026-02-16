'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { TransactionRow } from './transaction-row'
import type { TransactionWithPlayers } from '.'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface TransactionListProps {
  leagueId: string
  initialWeek?: number
}

export function TransactionList({ leagueId, initialWeek }: TransactionListProps) {
  const [transactions, setTransactions] = useState<TransactionWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [week, setWeek] = useState<number | undefined>(initialWeek)

  useEffect(() => {
    let mounted = true

    async function fetchTransactions() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(
          `/api/transactions?leagueId=${leagueId}${week ? `&week=${week}` : ''}`
        )
        const data = await res.json()

        if (!mounted) return

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch transactions')
        }

        setTransactions(data.transactions)
        if (!week && data.week) {
          setWeek(data.week)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchTransactions()

    return () => {
      mounted = false
    }
  }, [leagueId, week])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description={`No transactions found for Week ${week}`}
        variant="minimal"
      />
    )
  }

  return (
    <div className="space-y-4" data-testid="transaction-list">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Week {week} Transactions</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!week || week <= 1}
            onClick={() => setWeek((w) => (w ? w - 1 : 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!week || week >= 18}
            onClick={() => setWeek((w) => (w ? w + 1 : 18))}
          >
            Next
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        {transactions.map((transaction, index) => (
          <TransactionRow
            key={transaction.transaction_id}
            transaction={transaction}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
