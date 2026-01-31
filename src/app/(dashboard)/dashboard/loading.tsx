import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Welcome header skeleton */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>

        {/* League card skeleton */}
        <Card className="card-balatro p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
            </div>
          </div>
        </Card>

        {/* Analysis Tools section */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />

          {/* Tool cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="card-balatro p-6">
                <div className="flex items-start gap-4">
                  {/* Icon circle skeleton */}
                  <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                  {/* Title and description skeleton */}
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
