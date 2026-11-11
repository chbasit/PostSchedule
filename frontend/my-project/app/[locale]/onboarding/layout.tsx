import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { SessionProvider } from "@/features/session/workspace-context";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: LayoutProps<"/[locale]/onboarding">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-16 items-center border-b px-4 sm:px-8">
        <Logo />
      </div>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
        <SessionProvider>{children}</SessionProvider>
      </main>
    </div>
  );
}
