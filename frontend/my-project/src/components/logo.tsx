import Image from "next/image";
import { PRODUCT_NAME } from "@/config/site";
import { cn } from "@/lib/utils";
import mark from "@/assets/images/brand/logo-mark.png";

// AgentiqSocial's mark (the founder's logo, 2026-11-03; source in src/assets/images/brand)
// beside the name. Transparent, so it sits on light, dark and black surfaces alike.
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Image src={mark} alt="" className="h-7 w-auto" />
      {compact ? <span className="sr-only">{PRODUCT_NAME}</span> : <span>{PRODUCT_NAME}</span>}
    </span>
  );
}
