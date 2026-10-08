import * as React from "react"

import { cn } from "@/lib/utils"

/** The Marquee field look, multi-line: raised fill, radius 12, crimson focus ring. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-[12px] border-0 bg-raised px-4 py-3.5 text-base leading-6 text-fg outline-none transition-shadow duration-150 placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:shadow-[inset_0_0_0_1.5px_var(--mq-danger)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
