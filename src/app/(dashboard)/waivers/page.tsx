import { PageContainer } from '@/components/layout/page-container'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

export default function WaiversPage() {
  return (
    <PageContainer>
      <FadeIn>
        <Card className="card-balatro p-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Waiver Wire Tool</h1>
          <p className="text-muted-foreground">
            Coming in Phase 4 - FAAB optimization and waiver priority recommendations
          </p>
        </Card>
      </FadeIn>
    </PageContainer>
  )
}
