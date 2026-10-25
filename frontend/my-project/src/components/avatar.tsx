import { cn, hashString, initials } from "@/lib/utils";

const PASTELS = ["bg-pastel-1", "bg-pastel-2", "bg-pastel-3", "bg-pastel-4", "bg-pastel-5", "bg-pastel-6"];

// The pastel is picked by hashing the user id so it stays stable (FRONTEND.md §5).
export function Avatar({ id, name, size = "md", className }: { id: string; name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink",
        PASTELS[hashString(id) % PASTELS.length],
        size === "sm" ? "size-7 text-xs" : "size-9 text-xs",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
