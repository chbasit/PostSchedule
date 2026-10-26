import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

// Disabled buttons use solid muted colours (6:1 or better) instead of fading to 50%,
// so their label stays readable.
const disabledSolid = "disabled:bg-muted disabled:text-muted-foreground";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 aria-disabled:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Ink on light, sky on dark (via --primary). One primary per view.
        primary: cn("bg-primary text-primary-foreground hover:bg-primary/85", disabledSolid),
        secondary: "border border-foreground/80 bg-transparent text-foreground hover:bg-muted disabled:border-border disabled:text-muted-foreground",
        destructive: cn("bg-destructive text-destructive-foreground hover:bg-destructive/90", disabledSolid),
        ghost: "text-foreground hover:bg-muted disabled:text-muted-foreground",
        link: "h-auto px-0 font-semibold text-foreground hover:text-foreground/70 active:scale-100 disabled:text-muted-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    // Shows a spinner over the hidden label (so the width never changes), sets
    // aria-busy and ignores further activation.
    loading?: boolean;
  };

// Important: the variant's [&_svg]:size-4 would otherwise win.
const SPINNER_SIZE = { sm: "size-3.5!", md: "size-4!", lg: "size-5!", icon: "size-4!", "icon-sm": "size-3.5!" } as const;

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  onClick,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      {...(asChild ? {} : { type })}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <span className="absolute inset-0 inline-flex items-center justify-center">
              <Spinner className={SPINNER_SIZE[size ?? "md"]} />
            </span>
          ) : null}
          {/* display: contents keeps the label in the button's own flex layout. */}
          <span className={cn("contents", loading && "invisible")}>{children}</span>
        </>
      )}
    </Comp>
  );
}
