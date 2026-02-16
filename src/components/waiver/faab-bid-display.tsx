import type { FABBidRange } from '@/lib/algorithms/types'

interface Props {
  bid: FABBidRange
}

export function FaabBidDisplay({ bid }: Props) {
  return (
    <div className="mt-2">
      <p className="font-semibold">Suggested FAAB Bid:</p>
      <p className="text-sm">
        ${bid.min} - ${bid.max} 
        <span className="text-muted-foreground ml-2">
          ({bid.budgetPercentageMin}% - {bid.budgetPercentageMax}% of budget)
        </span>
      </p>
    </div>
  )
}
