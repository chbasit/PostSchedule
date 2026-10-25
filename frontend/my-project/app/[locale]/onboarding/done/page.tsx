import { DoneStep } from "@/features/onboarding/onboarding-views";
import { AppPage } from "@/features/shell/app-page";

export default function OnboardingDonePage() {
  return (
    <AppPage skeleton="form">
      <DoneStep />
    </AppPage>
  );
}
