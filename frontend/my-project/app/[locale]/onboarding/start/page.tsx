import { PersonaStep } from "@/features/onboarding/onboarding-views";
import { AppPage } from "@/features/shell/app-page";

export default function OnboardingStartPage() {
  return (
    <AppPage skeleton="form">
      <PersonaStep />
    </AppPage>
  );
}
