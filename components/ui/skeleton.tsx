import { cn } from "@/lib/utils"

/** Loading block: raised #1C1C23, pulse 1.4s (stops under reduced motion). Never a spinner for rows. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("mq-skeleton rounded-[6px]", className)}
      {...props}
    />
  )
}

export { Skeleton }
