import { AccountPostsScreen } from "@/features/accounts/insights-view";
import { AppPage } from "@/features/shell/app-page";

export default function AccountPostsPage() {
  return (
    <AppPage skeleton="list">
      <AccountPostsScreen />
    </AppPage>
  );
}
