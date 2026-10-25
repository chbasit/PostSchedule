import { ConnectionsView } from "@/features/connections/connections-view";
import { AppPage } from "@/features/shell/app-page";

export default function AccountsSettingsPage() {
  return (
    <AppPage skeleton="list">
      <ConnectionsView />
    </AppPage>
  );
}
