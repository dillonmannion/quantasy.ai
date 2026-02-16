import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-2 rounded-full" />
          ))}
        </div>

        <Card className="card-balatro p-8">
          <form className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-4 w-80" />
            </div>

            <Skeleton className="h-12 w-full rounded" />
          </form>
        </Card>
      </div>
    </PageContainer>
  )
}
