import { BillingView } from "@/features/billing/billing-view";
import { AppPage } from "@/features/shell/app-page";

export default function BillingSettingsPage() {
  return (
    <AppPage skeleton="cards">
      <BillingView />
    </AppPage>
  );
}
