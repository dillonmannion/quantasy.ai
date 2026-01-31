import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-muted rounded-md after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:animate-[shimmer_1.5s_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
