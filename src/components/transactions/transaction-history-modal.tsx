'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TransactionList } from '@/components/transactions/transaction-list'
import { ScrollText } from 'lucide-react'

interface TransactionHistoryModalProps {
  leagueId: string
}

export function TransactionHistoryModal({
  leagueId,
}: TransactionHistoryModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="view-transactions-button">
          <ScrollText className="mr-2 h-4 w-4" />
          Transactions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
          <DialogDescription>Recent activity in your league</DialogDescription>
        </DialogHeader>
        <TransactionList leagueId={leagueId} />
      </DialogContent>
    </Dialog>
  )
}
