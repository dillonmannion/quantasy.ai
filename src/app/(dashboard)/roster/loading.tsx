import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <div className="flex gap-1">
                 {Array.from({ length: 10 }).map((_, i) => (
                   <Skeleton key={i} className="h-9 w-10" />
                 ))}
              </div>
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </Card>

        <Card className="p-8 relative overflow-hidden">
           <div className="space-y-6">
             <Skeleton className="h-12 w-full rounded" />
             <div className="grid grid-cols-3 gap-4">
               <Skeleton className="h-20 w-full rounded" />
               <Skeleton className="h-20 w-full rounded" />
               <Skeleton className="h-20 w-full rounded" />
             </div>
             <div className="space-y-4 pt-4">
               {Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="grid grid-cols-2 gap-8">
                   <Skeleton className="h-16 w-full rounded" />
                   <Skeleton className="h-16 w-full rounded" />
                 </div>
               ))}
             </div>
           </div>
        </Card>
      </div>
    </PageContainer>
  )
}
