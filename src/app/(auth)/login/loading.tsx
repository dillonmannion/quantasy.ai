import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { FadeIn } from "@/components/animation/fade-in"

export default function Loading() {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <FadeIn className="w-[32rem] max-w-full">
        <Card className="p-6 md:p-10 gap-6 md:gap-8 border-white/10 shadow-2xl">
          <div className="text-center space-y-3">
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>

          <form className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-12 w-full rounded" />
            </div>

            <Skeleton className="h-12 w-full rounded" />
          </form>
        </Card>
      </FadeIn>
    </div>
  )
}
