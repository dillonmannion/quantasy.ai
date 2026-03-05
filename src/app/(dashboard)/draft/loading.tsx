import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <PageContainer>
      <div className="space-y-6" aria-live="polite" aria-busy="true">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex gap-2">
             <Skeleton className="h-10 w-24" />
             <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <Card className="card-balatro p-6">
             <div className="space-y-4">
               <div className="flex gap-4 mb-6">
                 <Skeleton className="h-10 flex-1" />
                 <Skeleton className="h-10 w-32" />
               </div>
               
               <div className="grid grid-cols-12 gap-4 pb-4 border-b border-white/10">
                 <Skeleton className="col-span-1 h-4" />
                 <Skeleton className="col-span-4 h-4" />
                 <Skeleton className="col-span-2 h-4" />
                 <Skeleton className="col-span-2 h-4" />
                 <Skeleton className="col-span-3 h-4" />
               </div>

               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="grid grid-cols-12 gap-4 py-3 border-b border-white/5">
                   <Skeleton className="col-span-1 h-5" />
                   <div className="col-span-4 space-y-1">
                     <Skeleton className="h-5 w-3/4" />
                     <Skeleton className="h-3 w-1/2 opacity-50" />
                   </div>
                   <Skeleton className="col-span-2 h-5" />
                   <Skeleton className="col-span-2 h-5" />
                   <Skeleton className="col-span-3 h-5" />
                 </div>
               ))}
             </div>
          </Card>

          <div className="space-y-6">
            <Card className="card-balatro p-4">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
