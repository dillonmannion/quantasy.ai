import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <PageContainer>
      <div className="space-y-6" aria-live="polite" aria-busy="true">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-balatro p-6">
            <Skeleton className="h-7 w-32 mb-4" />
            <div className="space-y-3 mb-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full" />
          </Card>

          <Card className="card-balatro p-6">
            <Skeleton className="h-7 w-40 mb-4" />
            <div className="space-y-3 mb-4">
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full" />
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
