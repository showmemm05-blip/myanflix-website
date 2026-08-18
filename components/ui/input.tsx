import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // THE ONE FIELD LOOK: 44px tall, a hairline border and a 4% white fill
        // on the rounded-xl shape. A text field is a touch target before it is
        // a control, and the whole app is used thumb-first — so this is the
        // default rather than something every form re-declares.
        "h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1 text-base transition-[color,background-color,border-color,box-shadow] duration-200 ease-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-white/16 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
