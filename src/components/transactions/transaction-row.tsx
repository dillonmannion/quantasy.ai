'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ArrowRightLeft, UserPlus, ShoppingCart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { TransactionDetails } from './transaction-details'
import type { TransactionWithPlayers } from '.'

interface TransactionRowProps {
  transaction: TransactionWithPlayers
  index: number
}

export function TransactionRow({ transaction, index }: TransactionRowProps) {
  const [isOpen, setIsOpen] = useState(false)

  const date = new Date(transaction.created)
  const timeAgo = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)

  const getTypeIcon = () => {
    switch (transaction.type) {
      case 'trade':
        return <ArrowRightLeft className="h-4 w-4" />
      case 'waiver':
        return <ShoppingCart className="h-4 w-4" />
      case 'free_agent':
        return <UserPlus className="h-4 w-4" />
      default:
        return <UserPlus className="h-4 w-4" />
    }
  }

  const getTypeColor = () => {
    switch (transaction.type) {
      case 'trade':
        return 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20'
      case 'waiver':
        return 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20'
      case 'free_agent':
        return 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400'
    }
  }

  const getSummary = () => {
    const teams = transaction.roster_ids.map((id) => `Team ${id}`).join(', ')
    
    if (transaction.type === 'trade') {
      return `Trade between ${teams}`
    }
    
    if (transaction.type === 'waiver') {
      const bid = transaction.settings?.waiver_bid
      return `Waiver Claim by ${teams}${bid ? ` ($${bid})` : ''}`
    }

    return `Free Agent Add by ${teams}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      data-testid={`transaction-row-${index}`}
    >
      <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border/80 transition-colors">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Badge variant="outline" className={cn('gap-1 shrink-0', getTypeColor())}>
                {getTypeIcon()}
                <span className="capitalize">{transaction.type.replace('_', ' ')}</span>
              </Badge>
              
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{getSummary()}</span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="shrink-0 w-8 h-8 p-0"
                data-testid={`transaction-toggle-${index}`}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isOpen ? 'rotate-180' : ''
                  )}
                />
                <span className="sr-only">Toggle details</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <AnimatePresence>
            {isOpen && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 border-t border-border/50"
                >
                  <TransactionDetails transaction={transaction} />
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>
    </motion.div>
  )
}
