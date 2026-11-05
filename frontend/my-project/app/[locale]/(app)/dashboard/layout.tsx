import type { Metadata } from "next";
import { SessionProvider } from "@/features/session/workspace-context";
import { ShellBanners } from "@/features/shell/app-shell";
import { AppHeader } from "@/features/shell/header";
import { BottomBar } from "@/features/shell/mobile-nav";
import { Sidebar } from "@/features/shell/sidebar";

// Signed-in pages are never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// The frame (navigation, header, page skeleton) renders straight away and is part of the
// static shell; account data fills in from the browser. Pages always render, so Next.js
// can validate every one for instant navigation.
// From lg up the sidebar sits on the shell colour and the page is a white, rounded panel
// that scrolls on its own, so the header stays inside its rounded corners. The panel is
// positioned so visually hidden elements (sr-only text, Radix's hidden inputs) stay inside
// it instead of stretching the page below the frame. From lg up, main is a column that the
// page fills, so a page can pin something to the panel's bottom edge (the composer's action bar).
export default function DashboardLayout({ children }: LayoutProps<"/[locale]/dashboard">) {
  return (
    <SessionProvider>
      <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden lg:bg-shell">
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col bg-background lg:my-2 lg:me-2 lg:overflow-y-auto lg:rounded-xl lg:border">
          <AppHeader />
          <ShellBanners />
          <main id="main" className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pt-5 lg:flex lg:flex-col lg:pb-8">
            {children}
          </main>
        </div>
      </div>
      <BottomBar />
    </SessionProvider>
  );
}
