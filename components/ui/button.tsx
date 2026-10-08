import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * MARQUEE BUTTONS (DesignSystem "Buttons", SHELL.md §12).
 *
 * Radius 12. Hover: opacity 0.88 (tonal fills step to 24% white). Press:
 * scale 0.97. Focus: 2px #FF4D55 ring, 2px offset. Disabled: 40% opacity.
 *
 * Roles — pick by meaning, not by look:
 *   play    white, ink text — the ONE Play per screen
 *   commit  crimson — Continue, Save, Confirm, Show N results, Deposit
 *           (`default` is the same thing, kept for older call sites)
 *   tonal   16% white — secondary actions (My List, Cancel, Clear all)
 *   gold    Subscribe and Premium only
 *   danger  destructive actions only (Delete account)
 *   text    crimson text link look (See all, Clear, Retry-as-link)
 *   ghost   no fill until hover — icon buttons in bars and lists
 *
 * Sizes: hero 52 · cta 48 · toolbar 40 · block (full width, 52) ·
 * icon-hero 52 square · icon-round 44 disc · icon-play 64 disc.
 * The older names (default/sm/lg/pill/pill-sm/icon*) are kept for pages that
 * have not been rebuilt yet; they now render on the Marquee shapes.
 *
 * `busy` swaps the label for three white dots at 60% opacity, sets
 * aria-busy and disables the button (keep the label for screen readers via
 * `busyLabel`, defaults to the children text).
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-[12px] border-0 bg-clip-padding font-bold whitespace-nowrap outline-none select-none transition-[opacity,transform,background-color,color] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link active:not-disabled:scale-[0.97] aria-disabled:pointer-events-none aria-disabled:opacity-40 disabled:pointer-events-none disabled:opacity-40 aria-invalid:outline-2 aria-invalid:outline-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        commit: "bg-crimson font-extrabold text-white hover:opacity-[.88]",
        default: "bg-crimson font-extrabold text-white hover:opacity-[.88]",
        play: "bg-play font-extrabold text-ink hover:opacity-[.88]",
        onArt: "bg-play font-extrabold text-ink hover:opacity-[.88]",
        tonal: "bg-tonal text-white hover:bg-tonal-hover aria-expanded:bg-tonal-hover",
        outline: "bg-tonal-soft text-white hover:bg-tonal-hover aria-expanded:bg-tonal-hover",
        secondary: "bg-raised text-white hover:bg-raised-hover aria-expanded:bg-raised-hover",
        ghost: "bg-transparent text-white hover:bg-tonal-faint aria-expanded:bg-tonal-faint",
        gold: "bg-gold font-extrabold text-gold-ink hover:opacity-[.88]",
        danger: "bg-danger-fill font-extrabold text-white hover:opacity-[.88]",
        destructive: "bg-danger-fill font-extrabold text-white hover:opacity-[.88]",
        text: "h-auto rounded-md bg-transparent px-0 text-link hover:text-link-hover hover:underline hover:underline-offset-3 active:not-disabled:scale-100",
        link: "h-auto rounded-md bg-transparent px-0 text-link hover:text-link-hover hover:underline hover:underline-offset-3 active:not-disabled:scale-100",
      },
      size: {
        /** 52 — hero Play, sign-in, sheets. */
        hero: "h-[52px] gap-2.5 px-7 text-[17px] [&_svg:not([class*='size-'])]:size-5",
        /** 48 — the default Marquee button. */
        cta: "h-12 gap-2 px-6 text-base",
        /** 40 — toolbars, cards, small actions. */
        toolbar: "h-10 gap-2 px-4 text-sm [&_svg:not([class*='size-'])]:size-[18px]",
        /** Full width, 52 — sign-in forms, bottom sheets. */
        block: "flex h-[52px] w-full gap-2 px-6 text-base",
        /** 52 square — the More-info button next to a hero Play. */
        "icon-hero": "size-[52px] [&_svg:not([class*='size-'])]:size-[22px]",
        /** 44 disc — Share and friends. */
        "icon-round": "size-11 rounded-full",
        /** 64 disc — the big round Play. */
        "icon-play": "size-16 rounded-full [&_svg:not([class*='size-'])]:size-7",
        /** 40 disc — top-bar icon buttons, dialog close. */
        "icon-bar": "size-10 rounded-full [&_svg:not([class*='size-'])]:size-[22px]",

        // Older names, now on Marquee shapes.
        default: "h-10 gap-2 px-4 text-sm [&_svg:not([class*='size-'])]:size-[18px]",
        xs: "h-7 gap-1 rounded-[8px] px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-[10px] px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 gap-2 px-5 text-[15px]",
        pill: "h-12 gap-2 px-6 text-base",
        "pill-sm": "h-10 gap-2 px-4 text-sm [&_svg:not([class*='size-'])]:size-[18px]",
        icon: "size-9 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Shows the three-dot busy state, sets aria-busy and disables the button. */
    busy?: boolean
    /** What a screen reader hears while busy (defaults to nothing extra). */
    busyLabel?: string
  }

function BusyDots() {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  busy = false,
  busyLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-busy={busy || undefined}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size }), busy && "disabled:opacity-60", className)}
      {...props}
    >
      {busy ? (
        <>
          <BusyDots />
          {busyLabel && <span className="sr-only">{busyLabel}</span>}
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants, BusyDots }
export type { ButtonProps }
