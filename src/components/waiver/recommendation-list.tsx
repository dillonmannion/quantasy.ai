import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation'
import { FaabBidDisplay } from './faab-bid-display'
import { AddToClaimsButton } from './add-to-claims-button'
import type { WaiverRecommendation } from '@/lib/algorithms/types'

interface Props {
  recommendations: WaiverRecommendation[]
}

export function RecommendationList({ recommendations }: Props) {
  if (recommendations.length === 0) {
    return (
      <Card className="card-balatro p-8 text-center">
        <p className="text-muted-foreground">No waiver recommendations available</p>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      {recommendations.map((rec, idx) => (
        <FadeIn key={rec.player.playerId} delay={idx * 0.05}>
          <Card className="card-balatro p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{rec.player.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  {rec.player.position} - {rec.player.team}
                </p>
                <div className="mt-2 space-y-1">
                  <p>
                    <span className="font-semibold">Priority Score:</span> {rec.priorityScore.toFixed(1)}
                  </p>
                  <p>
                    <span className="font-semibold">VBD Improvement:</span> +{rec.vbdImprovement.toFixed(1)}
                  </p>
                </div>
                {rec.suggestedFaabBid && (
                  <FaabBidDisplay bid={rec.suggestedFaabBid} />
                )}
              </div>
              <AddToClaimsButton playerId={rec.player.playerId} />
            </div>
            
            {/* Show Your Work */}
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-semibold hover:text-primary transition-colors">Show Your Work</summary>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground pl-4 border-l-2 border-border ml-1">
                {rec.reasons.map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </details>
          </Card>
        </FadeIn>
      ))}
    </div>
  )
}
