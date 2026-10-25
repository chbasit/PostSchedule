// Shared look for floating surfaces (dropdown menus, popovers, selects): no border, a
// small shadow, and a scale-and-fade from the trigger. Dark mode adds a faint ring
// because shadows do not show on dark backgrounds.
export const menuSurface =
  "z-50 rounded-xl bg-popover text-popover-foreground shadow-menu outline-none dark:ring-1 dark:ring-white/10 data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out";

export const menuItem =
  "relative flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors data-[disabled]:cursor-not-allowed data-[highlighted]:bg-muted data-[disabled]:text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0";
