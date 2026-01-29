import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-full md:w-48" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Card className="card-balatro">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                       <Skeleton className="h-5 w-32" />
                       <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </Card>
          </div>

          <div className="space-y-6">
             <div className="space-y-6">
               <Skeleton className="h-8 w-48" />
               <Card className="card-balatro p-4">
                 <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                      </div>
                    ))}
                 </div>
               </Card>
             </div>
             
             <Card className="card-balatro p-6 opacity-70">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-20 w-full" />
             </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
