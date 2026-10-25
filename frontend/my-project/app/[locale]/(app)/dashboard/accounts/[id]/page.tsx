import { AccountInsightsScreen } from "@/features/accounts/insights-view";
import { AppPage } from "@/features/shell/app-page";

// One social account: its insights, with Posts as the second tab.
export default function AccountInsightsPage() {
  return (
    <AppPage skeleton="cards">
      <AccountInsightsScreen />
    </AppPage>
  );
}
