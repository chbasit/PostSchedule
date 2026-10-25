import { ConnectStep } from "@/features/onboarding/onboarding-views";
import { AppPage } from "@/features/shell/app-page";

export default function OnboardingConnectPage() {
  return (
    <AppPage skeleton="form">
      <ConnectStep />
    </AppPage>
  );
}
