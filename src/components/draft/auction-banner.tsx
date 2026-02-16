'use client'

import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function AuctionBanner() {
  return (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Auction Mode - Rankings Only</AlertTitle>
      <AlertDescription>
        VBD rankings are displayed for reference. Full auction support (bidding, budget tracking) coming soon.
      </AlertDescription>
    </Alert>
  )
}
