import { Bot, Braces, ChartLine, Lightbulb, MessagesSquare, Send, Sparkles, Users, type LucideIcon } from "lucide-react";
import { AI_ENABLED } from "@/config/site";

export type FeatureKey = "create" | "publish" | "insights" | "community" | "collaborate" | "ai" | "api" | "mcp";

// The Features menu and page (founder's call, 2026-11-13). `soon` marks what is not built yet
// (doc/UPCOMING-FEATURES.md): the menu and the page say "Soon" instead of promising it.
export const FEATURES: ReadonlyArray<{ key: FeatureKey; icon: LucideIcon; tint: string; soon: boolean }> = [
  { key: "create", icon: Lightbulb, tint: "bg-card-yellow", soon: true },
  { key: "publish", icon: Send, tint: "bg-card-lavender", soon: false },
  { key: "insights", icon: ChartLine, tint: "bg-card-aqua", soon: true },
  { key: "community", icon: MessagesSquare, tint: "bg-card-salmon", soon: true },
  { key: "collaborate", icon: Users, tint: "bg-card-lavender", soon: false },
  // Built; "Soon" until AI is switched on (NEXT_PUBLIC_AI_ENABLED).
  { key: "ai", icon: Sparkles, tint: "bg-card-aqua", soon: !AI_ENABLED },
  { key: "api", icon: Braces, tint: "bg-card-salmon", soon: true },
  { key: "mcp", icon: Bot, tint: "bg-card-yellow", soon: true },
];

// The AI Assistant has its own page; the others open their card on the Features page.
export const featureHref = (key: FeatureKey) => (key === "ai" ? "/features/ai-assistant" : `/features#${key}`);
